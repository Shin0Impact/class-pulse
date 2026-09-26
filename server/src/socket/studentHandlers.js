import { EVENTS } from '../../../shared/events.js';
import { requireSession, getSession, joinStudent, setStatus, recordFocus, UserError } from '../services/sessionService.js';
import { studentState } from '../services/views.js';
import { handle, teacherRoom, studentRoom, emitStudents, emitPulse } from './helpers.js';

export function registerStudentHandlers(io, socket) {
  const requireStudent = () => {
    const session = socket.data.role === 'student' ? getSession(socket.data.code) : null;
    const student = session?.students.get(socket.data.studentId);
    if (!session || !student) throw new UserError('Please rejoin the class');
    return { session, student };
  };

  socket.on(EVENTS.STUDENT_JOIN, handle(({ code, name, studentId }) => {
    const session = requireSession(code);
    const student = joinStudent(session, { name, studentId, socketId: socket.id });
    socket.join(studentRoom(session.code));
    socket.data = { role: 'student', code: session.code, studentId: student.id };
    emitStudents(io, session);
    emitPulse(io, session); // the dashboard's student list comes from the pulse, so always refresh it
    return studentState(session, student);
  }));

  socket.on(EVENTS.STUDENT_SET_STATUS, handle((payload) => {
    const { session, student } = requireStudent();
    setStatus(session, student, payload);
    emitPulse(io, session);
    return {};
  }));

  // fire and forget: focus mode never blocks the student
  socket.on(EVENTS.STUDENT_FOCUS_EVENT, (payload) => {
    try {
      const { session, student } = requireStudent();
      const count = recordFocus(session, student, payload?.type);
      if (!count) return;
      io.to(teacherRoom(session.code)).emit(EVENTS.FOCUS_ALERT, { studentId: student.id, name: student.name, count });
      emitPulse(io, session);
    } catch { /* ignore */ }
  });

  socket.on('disconnect', () => {
    if (socket.data.role !== 'student') return;
    const session = getSession(socket.data.code);
    const student = session?.students.get(socket.data.studentId);
    if (!student || student.socketId !== socket.id) return; // already reconnected on a new socket
    student.connected = false;
    emitStudents(io, session);
    emitPulse(io, session);
  });
}
