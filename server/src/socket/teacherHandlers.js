import { EVENTS } from '../../../shared/events.js';
import { FEATURES } from '../../../shared/features.js';
import { createSession, getSession, requireSession, startCheckIn, endSession, UserError } from '../services/sessionService.js';
import { teacherSnapshot } from '../services/views.js';
import { handle, teacherRoom, studentRoom, emitPulse } from './helpers.js';

export function registerTeacherHandlers(io, socket) {
  const attach = (session) => {
    socket.join(teacherRoom(session.code));
    socket.data = { role: 'teacher', code: session.code };
  };

  const requireTeacher = () => {
    const session = socket.data.role === 'teacher' ? getSession(socket.data.code) : null;
    if (!session) throw new UserError('Class not found. Reopen the dashboard.');
    return session;
  };

  socket.on(EVENTS.TEACHER_CREATE, handle(({ title }) => {
    const session = createSession(title);
    attach(session);
    return { code: session.code, state: teacherSnapshot(session) };
  }));

  // Refreshing the page or a wifi blip: the teacher gets the full state back.
  socket.on(EVENTS.TEACHER_REJOIN, handle(({ code }) => {
    const session = requireSession(code);
    attach(session);
    return { code: session.code, state: teacherSnapshot(session) };
  }));

  // "Check in now": every student's color is cleared so they re-mark, e.g. after re-teaching.
  socket.on(EVENTS.TEACHER_CHECK_IN, handle(({ topic }) => {
    const session = requireTeacher();
    const { checkIn, history } = startCheckIn(session, topic);
    io.to(studentRoom(session.code)).emit(EVENTS.CHECK_IN_STARTED, { checkInId: checkIn.id, topic: checkIn.topic });
    io.to(teacherRoom(session.code)).emit(EVENTS.CHECK_IN_STARTED, { checkIn, history });
    emitPulse(io, session);
    return {};
  }));

  socket.on(EVENTS.TEACHER_SET_FOCUS_MODE, handle(({ enabled }) => {
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
