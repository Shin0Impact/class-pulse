import { EVENTS } from "../../../shared/events.ts";
import { FEATURES } from "../../../shared/features.ts";
import { openFeedback, feedbackSummary } from "../services/feedbackService.ts";
import {
  createSession,
  getSession,
  requireSession,
  startCheckIn,
  endSession,
  UserError,
} from "../services/sessionService.ts";

import {
  launchQuestion,
  closeQuestion,
  computeBlindspotUpdate,
  pairStudents,
  calibrationCardsForCurrentRound,
  answerRevealsForCurrentRound,
  recheckQuestion,
} from "../services/questionService.ts";
import { aiEnabled } from "../ai/llm.ts";
import { startSummary } from "../ai/summaryRunner.ts";

import { teacherSnapshot } from "../services/views.ts";
import {
  authEnabled,
  requireAccount,
  verifyToken,
  AuthError,
} from "../services/authService.ts";
import { handle, teacherRoom, studentRoom, emitPulse } from "./helpers.ts";

import type { Server, Socket } from "socket.io";
import type { Session } from "../services/types.ts";

export function registerTeacherHandlers(io: Server, socket: Socket): void {
  const attach = (session: Session) => {
    socket.join(teacherRoom(session.code));

    socket.data = {
      role: "teacher",
      code: session.code,
    };
  };

  const requireTeacher = () => {
    const session =
      socket.data.role === "teacher" ? getSession(socket.data.code) : null;

    if (!session) {
      throw new UserError("Class not found. Reopen the dashboard.");
    }

    return session;
  };

  // -------------------------------------------------------
  // CREATE CLASS
  // -------------------------------------------------------

  socket.on(
    EVENTS.TEACHER_CREATE,
    handle(
      async ({
        title,
        accessToken,
      }: {
        title?: unknown;
        accessToken?: unknown;
      }) => {
        // With accounts on, every class belongs to a signed-in teacher (their history needs it).
        const teacher = authEnabled
          ? await requireAccount(accessToken, "teacher")
          : null;
        const session = createSession(title, teacher?.id ?? null);

        attach(session);

        return {
          code: session.code,
          state: teacherSnapshot(session),
        };
      },
    ),
  );

  // -------------------------------------------------------
  // REJOIN CLASS
  // -------------------------------------------------------

  socket.on(
    EVENTS.TEACHER_REJOIN,
    handle(
      async ({
        code,
        accessToken,
      }: {
        code?: unknown;
        accessToken?: unknown;
      }) => {
        const session = requireSession(code);

        // Only the teacher who owns the class can reopen its dashboard.
        if (session.teacherId) {
          const teacher = await verifyToken(accessToken);
          if (!teacher)
            throw new AuthError("Please sign in to open this class");
          if (teacher.id !== session.teacherId) {
            throw new AuthError("This class belongs to another teacher");
          }
        }

        attach(session);

        return {
          code: session.code,
          state: teacherSnapshot(session),
        };
      },
    ),
  );

  // -------------------------------------------------------
  // CHECK IN
  // -------------------------------------------------------

  socket.on(
    EVENTS.TEACHER_CHECK_IN,
    handle(({ topic }: { topic?: unknown }) => {
      const session = requireTeacher();

      const { checkIn, history } = startCheckIn(session, topic);

      io.to(studentRoom(session.code)).emit(EVENTS.CHECK_IN_STARTED, {
        checkInId: checkIn.id,
        topic: checkIn.topic,
      });

      io.to(teacherRoom(session.code)).emit(EVENTS.CHECK_IN_STARTED, {
        checkIn,
        history,
      });

      emitPulse(io, session);

      return {};
    }),
  );

  // -------------------------------------------------------
  // FOCUS MODE
  // -------------------------------------------------------

  socket.on(
    EVENTS.TEACHER_SET_FOCUS_MODE,
    handle(({ enabled }: { enabled?: unknown }) => {
      const session = requireTeacher();

      session.focusMode = FEATURES.focusMode && Boolean(enabled);

      io.to(studentRoom(session.code)).emit(EVENTS.FOCUS_MODE, {
        enabled: session.focusMode,
      });

      return {
        focusMode: session.focusMode,
      };
    }),
  );

  // -------------------------------------------------------
  // LAUNCH QUESTION
  // -------------------------------------------------------

  socket.on(
    EVENTS.TEACHER_LAUNCH_QUESTION,
    handle((payload: { question?: unknown }) => {
      const session = requireTeacher();

      const publicQuestion = launchQuestion(session, payload);

      // Students receive the question WITHOUT the answer key.
      io.to(studentRoom(session.code)).emit(
        EVENTS.QUESTION_STARTED,
        publicQuestion,
      );

      // Teacher gets the fresh Blindspot quadrant.
      io.to(teacherRoom(session.code)).emit(
        EVENTS.BLINDSPOT_UPDATE,
        computeBlindspotUpdate(session),
      );

      return {};
    }),
  );

  // -------------------------------------------------------
  // CLOSE QUESTION: stop answers, then (with AI) summarize
  // -------------------------------------------------------

  socket.on(
    EVENTS.TEACHER_CLOSE_QUESTION,
    handle(({ language }: { language?: unknown }) => {
      const session = requireTeacher();
      const round = closeQuestion(session);

      io.to(studentRoom(session.code)).emit(EVENTS.QUESTION_CLOSED, {
        questionId: round.id,
      });
      io.to(teacherRoom(session.code)).emit(
        EVENTS.BLINDSPOT_UPDATE,
        computeBlindspotUpdate(session),
      );

      let summarizing = false;
      if (aiEnabled() && session.answers.size > 0) {
        try {
          startSummary(io, session, language === "ar" ? "ar" : "en");
          summarizing = true;
        } catch {
          // e.g. hourly limit: closing still worked; the teacher can press Summarize later.
        }
      }
      return { summarizing };
    }),
  );

  // -------------------------------------------------------
  // SUMMARIZE (AI) the live question's answers so far
  // -------------------------------------------------------

  socket.on(
    EVENTS.TEACHER_SUMMARIZE,
    handle(({ language }: { language?: unknown }) => {
      const session = requireTeacher();
      startSummary(io, session, language === "ar" ? "ar" : "en");
      return {};
    }),
  );

  // -------------------------------------------------------
  // PAIR STUDENTS
  // -------------------------------------------------------

  socket.on(
    EVENTS.TEACHER_PAIR_UP,
    handle(() => {
      const session = requireTeacher();

      const { pairs, questionId } = pairStudents(session);

      for (const pair of pairs) {
        const explainer = session.students.get(pair.explainer.id);

        const listener = session.students.get(pair.listener.id);

        if (explainer) {
          io.to(explainer.socketId).emit(EVENTS.PAIR_ASSIGNED, {
            pairId: pair.pairId,
            partner: pair.listener,
            role: "explainer",
            questionId,
          });
        }

        if (listener) {
          io.to(listener.socketId).emit(EVENTS.PAIR_ASSIGNED, {
            pairId: pair.pairId,
            partner: pair.explainer,
            role: "listener",
            questionId,
          });
        }
      }

      return {
        pairs,
      };
    }),
  );

  // -------------------------------------------------------
  // RECHECK QUESTION
  // S4:
  // 1. Reveal result privately to each student
  // 2. Send calibration card
  // 3. Re-open the question
  // -------------------------------------------------------

  socket.on(
    EVENTS.TEACHER_RECHECK,
    handle(() => {
      const session = requireTeacher();

      // -----------------------------------------------
      // S4 — ANSWER REVEAL
      // -----------------------------------------------

      const reveals = answerRevealsForCurrentRound(session);

      for (const { studentId, reveal } of reveals) {
        const student = session.students.get(studentId);

        if (!student) continue;

        io.to(student.socketId).emit(EVENTS.ANSWER_REVEAL, reveal);
      }

      // -----------------------------------------------
      // EXISTING CALIBRATION CARD
      // -----------------------------------------------

      const calibrationCards = calibrationCardsForCurrentRound(session);

      for (const card of calibrationCards) {
        const student = session.students.get(card.studentId);

        if (!student) continue;

        io.to(student.socketId).emit(EVENTS.CALIBRATION_CARD, card);
      }

      // -----------------------------------------------
      // START RECHECK
      // -----------------------------------------------

      const publicQuestion = recheckQuestion(session);

      io.to(studentRoom(session.code)).emit(
        EVENTS.QUESTION_STARTED,
        publicQuestion,
      );

      io.to(teacherRoom(session.code)).emit(
        EVENTS.BLINDSPOT_UPDATE,
        computeBlindspotUpdate(session),
      );

      return {};
    }),
  );
  // -------------------------------------------------------
  // G9 — CLASS FEEDBACK
  // Teacher asks students to rate the class.
  // -------------------------------------------------------

  socket.on(
    EVENTS.TEACHER_REQUEST_FEEDBACK,
    handle(() => {
      const session = requireTeacher();

      // Open feedback for this class.
      openFeedback(session);

      // Tell every student to show the feedback form.
      io.to(studentRoom(session.code)).emit(EVENTS.FEEDBACK_REQUESTED, {});

      // Send the current summary to the teacher.
      io.to(teacherRoom(session.code)).emit(
        EVENTS.FEEDBACK_UPDATE,
        feedbackSummary(session),
      );

      return {
        feedbackOpen: true,
      };
    }),
  );
  // -------------------------------------------------------
  // END SESSION
  // -------------------------------------------------------

  socket.on(
    EVENTS.TEACHER_END_SESSION,
    handle(() => {
      const session = requireTeacher();

      io.to(studentRoom(session.code)).emit(EVENTS.SESSION_ENDED, {});

      io.to(teacherRoom(session.code)).emit(EVENTS.SESSION_ENDED, {});

      endSession(session);

      return {};
    }),
  );
}
