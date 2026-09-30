import { EVENTS } from '../../../shared/events.ts';
import { getSession, UserError } from '../services/sessionService.ts';
import { authEnabled, verifyToken } from '../services/authService.ts';
import { cleanState, screenState, setScreenState } from '../services/screenRelay.ts';
import { handle } from './helpers.ts';
import type { Server, Socket } from 'socket.io';

export const screenRoom = (code: string) => `${code}:screen`;

export function registerScreenHandlers(io: Server, socket: Socket): void {
  // Teacher -> every screen watching this class. Kept so a screen that opens later starts in the right place.
  socket.on(
    EVENTS.TEACHER_SCREEN_STATE,
    handle((payload: { state?: unknown }) => {
      const code = socket.data.role === 'teacher' ? String(socket.data.code) : '';
      if (!code || !getSession(code)) throw new UserError('Class not found. Reopen the dashboard.');
      const state = cleanState(payload.state);
      if (state) {
        setScreenState(code, state);
        io.to(screenRoom(code)).emit(EVENTS.SCREEN_STATE, state);
      }
      return {};
    }),
  );

  // A screen may only watch its own teacher's class: it must be signed in as that teacher.
  socket.on(
    EVENTS.SCREEN_JOIN,
    handle(async (payload: { code?: unknown; accessToken?: unknown }) => {
      const code = String(payload.code ?? '');
      const session = getSession(code);
      if (!session) throw new UserError('Class not found.');
      if (authEnabled) {
        const profile = await verifyToken(payload.accessToken);
        if (!profile || profile.id !== session.teacherId) {
          throw new UserError('Sign in with the same teacher account to use this screen.');
        }
      }
      socket.join(screenRoom(code));
      return { state: screenState(code) };
    }),
  );
}
