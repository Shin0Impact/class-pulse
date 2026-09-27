import { EVENTS } from '../../../shared/events.ts';
import { FEATURES } from '../../../shared/features.ts';
import { createSession, getSession, requireSession, startCheckIn, endSession, UserError } from '../services/sessionService.ts';
import { teacherSnapshot } from '../services/views.ts';
import { handle, teacherRoom, studentRoom, emitPulse } from './helpers.ts';
import type { Server, Socket } from 'socket.io';
import type { Session } from '../services/types.ts';

export function registerTeacherHandlers(io: Server, socket: Socket): void {
  const attach = (session: Session) => {
    socket.join(teacherRoom(session.code));
    socket.data = { role: 'teacher', code: session.code };
  };

  const requireTeacher = () => {
    const session = socket.data.role === 'teacher' ? getSession(socket.data.code) : null;
    if (!session) throw new UserError('Class not found. Reopen the dashboard.');
    return session;
  };

  socket.on(EVENTS.TEACHER_CREATE, handle(({ title }: { title?: unknown }) => {
    const session = createSession(title);
    attach(session);
    return { code: session.code, state: teacherSnapshot(session) };
  }));

  // Refreshing the page or a wifi blip: the teacher gets the full state back.
  socket.on(EVENTS.TEACHER_REJOIN, handle(({ code }: { code?: unknown }) => {
    const session = requireSession(code);
    attach(session);
    return { code: session.code, state: teacherSnapshot(session) };
  }));

  // "Check in now": every student's color is cleared so they re-mark, e.g. after re-teaching.
  socket.on(EVENTS.TEACHER_CHECK_IN, handle(({ topic }: { topic?: unknown }) => {
    const session = requireTeacher();
    const { checkIn, history } = startCheckIn(session, topic);
    io.to(studentRoom(session.code)).emit(EVENTS.CHECK_IN_STARTED, { checkInId: checkIn.id, topic: checkIn.topic });
    io.to(teacherRoom(session.code)).emit(EVENTS.CHECK_IN_STARTED, { checkIn, history });
    emitPulse(io, session);
    return {};
  }));

  socket.on(EVENTS.TEACHER_SET_FOCUS_MODE, handle(({ enabled }: { enabled?: unknown }) => {
    const session = requireTeacher();
    session.focusMode = FEATURES.focusMode && Boolean(enabled);
    io.to(studentRoom(session.code)).emit(EVENTS.FOCUS_MODE, { enabled: session.focusMode });
    return { focusMode: session.focusMode };
  }));

  socket.on(EVENTS.TEACHER_END_SESSION, handle(() => {
    const session = requireTeacher();
    io.to(studentRoom(session.code)).emit(EVENTS.SESSION_ENDED, {});
    io.to(teacherRoom(session.code)).emit(EVENTS.SESSION_ENDED, {});
    endSession(session);
    return {};
  }));
}
