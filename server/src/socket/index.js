import { registerTeacherHandlers } from './teacherHandlers.js';
import { registerStudentHandlers } from './studentHandlers.js';

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.data = {};
    registerTeacherHandlers(io, socket);
    registerStudentHandlers(io, socket);
  });
}
