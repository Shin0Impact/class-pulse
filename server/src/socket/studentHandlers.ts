import { EVENTS } from '../../../shared/events.ts';
import {
  requireSession,
  getSession,
  joinStudent,
  setStatus,
  recordFocus,
  UserError,
} from '../services/sessionService.ts';
import {
  recordAnswer,
  computeBlindspotUpdate,
} from '../services/questionService.ts';
import { studentState } from '../services/views.ts';
import {
  handle,
  teacherRoom,
  studentRoom,
  emitStudents,
  emitPulse,
} from './helpers.ts';
import type { Server, Socket } from 'socket.io';

export function registerStudentHandlers(io: Server, socket: Socket): void {
  const requireStudent = () => {
    const session =
      socket.data.role === 'student'
        ? getSession(socket.data.code)
        : null;
    const student = session?.students.get(socket.data.studentId);

    if (!session || !student) {
      throw new UserError('Please rejoin the class');
    }

    return { session, student };
  };

  socket.on(
    EVENTS.STUDENT_JOIN,
    handle(
      ({
        code,
        name,
        studentId,
      }: {
        code?: unknown;
        name?: unknown;
        studentId?: string;
      }) => {
        const session = requireSession(code);
        const student = joinStudent(session, {
          name,
          studentId,
          socketId: socket.id,
        });

        socket.join(studentRoom(session.code));
        socket.data = {
          role: 'student',
          code: session.code,
          studentId: student.id,
        };

        emitStudents(io, session);
        emitPulse(io, session);
        return studentState(session, student);
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

  socket.on(
    EVENTS.STUDENT_FOCUS_EVENT,
    (payload?: { type?: unknown }) => {
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
    },
  );

  socket.on('disconnect', () => {
    if (socket.data.role !== 'student') return;

    const session = getSession(socket.data.code);
    const student = session?.students.get(socket.data.studentId);

    if (!session || !student || student.socketId !== socket.id) return;

    student.connected = false;
    emitStudents(io, session);
    emitPulse(io, session);
  });
}