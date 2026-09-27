import { EVENTS } from '../../../shared/events.ts';
import { UserError } from '../services/sessionService.ts';
import { computePulse } from '../services/pulseService.ts';
import type { Server } from 'socket.io';
import type { Session } from '../services/types.ts';

export const teacherRoom = (code: string) => `${code}:teacher`;
export const studentRoom = (code: string) => `${code}:students`;

// Wraps a handler so every request gets an ack { ok, ...data } or { ok:false, error }, and nothing can crash the server.
export const handle = <P extends object, R extends object>(fn: (payload: P) => R | Promise<R>) => async (payload: P | null | undefined, ack?: (response: ({ ok: true } & R) | { ok: false; error: string }) => void) => {
  try {
    const res = await fn((payload ?? {}) as P);
    if (typeof ack === 'function') ack({ ok: true, ...res });
  } catch (e: unknown) {
    const expected = e instanceof UserError;
    if (!expected) console.error('[socket]', e);
    if (typeof ack === 'function') ack({ ok: false, error: expected ? e.message : 'Something went wrong' });
  }
};

export function emitStudents(io: Server, session: Session): void {
  io.to(teacherRoom(session.code)).emit(EVENTS.SESSION_STUDENTS, {
    students: [...session.students.values()].map(({ id, name, connected }) => ({ id, name, connected })),
  });
}

export function emitPulse(io: Server, session: Session): void {
  io.to(teacherRoom(session.code)).emit(EVENTS.PULSE_UPDATE, computePulse(session));
}
