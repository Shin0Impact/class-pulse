import { EVENTS } from "../../../shared/events.ts";

import {
  requireSession,
  getSession,
  joinStudent,
  setStatus,
  recordFocus,
  UserError,
} from "../services/sessionService.ts";

import {
  recordAnswer,
  computeBlindspotUpdate,
  recordClarityRating,
} from "../services/questionService.ts";

// G9 — Class Feedback
import {
  submitFeedback,
  feedbackSummary,
} from "../services/feedbackService.ts";

import { studentState } from "../services/views.ts";
import { verifyToken } from "../services/authService.ts";

import {
  handle,
  teacherRoom,
  studentRoom,
  emitStudents,
  emitPulse,
} from "./helpers.ts";

import type { Server, Socket } from "socket.io";

export function registerStudentHandlers(io: Server, socket: Socket): void {
  const requireStudent = () => {
    const session =
      socket.data.role === "student" ? getSession(socket.data.code) : null;
    const student = session?.students.get(socket.data.studentId);

    if (!session || !student) {
      throw new UserError("Please rejoin the class");
    }

    return { session, student };
  };

  socket.on(
    EVENTS.STUDENT_JOIN,
    handle(
      async ({
        code,
        name,
        studentId,
        rejoinKey,
        accessToken,
      }: {
        code?: unknown;
        name?: unknown;
        studentId?: unknown;
        rejoinKey?: unknown;
        accessToken?: unknown;
      }) => {
        const session = requireSession(code);
        // Signing in is optional for students: a signed-in student's answers go to their
        // progress history, a guest just plays. A teacher account joining is treated as a guest.
        const account = await verifyToken(accessToken);
        const student = joinStudent(session, {
          name,
          studentId,
          rejoinKey,
          socketId: socket.id,
          userId: account?.role === "student" ? account.id : null,
        });

        socket.join(studentRoom(session.code));
        socket.data = {
          role: "student",
          code: session.code,
          studentId: student.id,
        };

        emitStudents(io, session);
        emitPulse(io, session);
        return studentState(session, student);
      },
    ),
  );
  // -------------------------------------------------------
  // G9 — CLASS FEEDBACK
  // Student submits stars + comment + privacy choice.
  // -------------------------------------------------------

  socket.on(
    EVENTS.STUDENT_SUBMIT_FEEDBACK,
    handle(
      (payload: {
        rating?: unknown;
        comment?: unknown;
        anonymous?: unknown;
      }) => {
        const { session, student } = requireStudent();

        submitFeedback(session, student, payload);

        // Send the updated summary only to the teacher.
        // Anonymous student identity is stripped by feedbackSummary().
        io.to(teacherRoom(session.code)).emit(
          EVENTS.FEEDBACK_UPDATE,
          feedbackSummary(session),
        );

        return {
          submitted: true,
        };
      },
    ),
  );
  socket.on(
    EVENTS.STUDENT_SET_STATUS,
    handle((payload: { status: unknown; reason?: unknown }) => {
      const { session, student } = requireStudent();
      setStatus(session, student, payload);
      emitPulse(io, session);
      return {};
    }),
  );

  socket.on(
    EVENTS.STUDENT_ANSWER,
    handle(
      (payload: {
        questionId?: unknown;
        optionId?: unknown;
        confidence?: unknown;
        explanation?: unknown;
        text?: unknown;
      }) => {
        const { session, student } = requireStudent();
        recordAnswer(session, student, payload);

        io.to(teacherRoom(session.code)).emit(
          EVENTS.BLINDSPOT_UPDATE,
          computeBlindspotUpdate(session),
        );

        return {};
      },
    ),
  );

  // After being paired, the listener rates how clearly their partner explained their reasoning.
  // Saved straight to Supabase (blindspot_clarity_ratings); there is no live gameplay use of it,
  // so there is nothing to broadcast back.
  socket.on(
    EVENTS.STUDENT_RATE_CLARITY,
    handle((payload: { pairId?: unknown; rating?: unknown }) => {
      const { session, student } = requireStudent();
      recordClarityRating(session, student, payload);
      return {};
    }),
  );

  socket.on(EVENTS.STUDENT_FOCUS_EVENT, (payload?: { type?: unknown }) => {
    try {
      const { session, student } = requireStudent();
      const count = recordFocus(session, student, payload?.type);
      if (!count) return;

      io.to(teacherRoom(session.code)).emit(EVENTS.FOCUS_ALERT, {
        studentId: student.id,
        name: student.name,
        count,
      });
      emitPulse(io, session);
    } catch {
      // Focus events must never block the student.
    }
  });

  socket.on("disconnect", () => {
    if (socket.data.role !== "student") return;

    const session = getSession(socket.data.code);
    const student = session?.students.get(socket.data.studentId);

    if (!session || !student || student.socketId !== socket.id) return;

    student.connected = false;
    emitStudents(io, session);
    emitPulse(io, session);
  });
}
