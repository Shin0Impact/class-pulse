import { registerTeacherHandlers } from './teacherHandlers.ts';
import { registerStudentHandlers } from './studentHandlers.ts';
import { registerScreenHandlers } from './screenHandlers.ts';
import type { Server } from 'socket.io';

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.data = {};
    registerTeacherHandlers(io, socket);
    registerStudentHandlers(io, socket);
    registerScreenHandlers(io, socket);
  });
}
