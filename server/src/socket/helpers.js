import { EVENTS } from '../../../shared/events.js';
import { UserError } from '../services/sessionService.js';
import { computePulse } from '../services/pulseService.js';

export const teacherRoom = (code) => `${code}:teacher`;
export const studentRoom = (code) => `${code}:students`;

// Wraps a handler so every request gets an ack { ok, ...data } or { ok:false, error }, and nothing can crash the server.
export const handle = (fn) => async (payload, ack) => {
  try {
    const res = await fn(payload ?? {});
    if (typeof ack === 'function') ack({ ok: true, ...(res || {}) });
  } catch (e) {
    const expected = e instanceof UserError;
    if (!expected) console.error('[socket]', e);
    if (typeof ack === 'function') ack({ ok: false, error: expected ? e.message : 'Something went wrong' });
  }
};

export function emitStudents(io, session) {
  io.to(teacherRoom(session.code)).emit(EVENTS.SESSION_STUDENTS, {
    students: [...session.students.values()].map(({ id, name, connected }) => ({ id, name, connected })),
  });
}

export function emitPulse(io, session) {
  io.to(teacherRoom(session.code)).emit(EVENTS.PULSE_UPDATE, computePulse(session));
}
