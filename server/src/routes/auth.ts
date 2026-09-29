import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authEnabled, signIn, signUp, refresh, verifyToken, AuthError } from '../services/authService.ts';
import { UserError } from '../services/sessionService.ts';
import { NotFoundError } from '../services/historyService.ts';
import type { Profile, Role } from '../services/authService.ts';

// Turns a thrown error into the right HTTP response: 401 for auth problems, 400 for anything the
// user can fix, 500 (logged, message hidden) for bugs.
export function sendError(res: Response, e: unknown): void {
  if (e instanceof AuthError) {
    res.status(401).json({ error: e.message });
  } else if (e instanceof NotFoundError) {
    res.status(404).json({ error: e.message });
  } else if (e instanceof UserError) {
    res.status(400).json({ error: e.message });
  } else {
    console.error('[http]', e);
    res.status(500).json({ error: 'Something went wrong' });
  }
}

export type AuthedRequest = Request & { profile: Profile };

// Route guard: needs "Authorization: Bearer <accessToken>", optionally of a given role.
export function requireUser(role?: Role) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization ?? '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : '';
      const profile = await verifyToken(token);
      if (!profile) return res.status(401).json({ error: 'Please sign in again' });
      if (role && profile.role !== role) {
        return res.status(403).json({ error: role === 'teacher' ? 'Teachers only' : 'Students only' });
      }
      (req as AuthedRequest).profile = profile;
      next();
    } catch (e) {
      sendError(res, e);
    }
  };
}

const router = Router();

// A light brake on password guessing and mass sign-ups, per IP. Generous on purpose: a whole class
// behind one school router shares an IP. (index.ts sets "trust proxy" so this sees real IPs on Render.)
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 200;
const hits = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of hits) if (entry.resetAt < now) hits.delete(ip);
}, WINDOW_MS).unref();

router.use((req, res, next) => {
  const ip = req.ip ?? 'unknown';
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else if (++entry.count > MAX_PER_WINDOW) {
    return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  }
  next();
});

// Accounts need the database; without it every /auth route says so plainly.
router.use((_req, res, next) => {
  if (!authEnabled) return res.status(503).json({ error: 'Accounts are not available: the server has no database configured.' });
  next();
});

router.post('/signup', async (req, res) => {
  try {
    res.json(await signUp(req.body ?? {}));
  } catch (e) {
    sendError(res, e);
  }
});

router.post('/login', async (req, res) => {
  try {
    res.json(await signIn(req.body ?? {}));
  } catch (e) {
    sendError(res, e);
  }
});

router.post('/refresh', async (req, res) => {
  try {
    res.json(await refresh(req.body ?? {}));
  } catch (e) {
    sendError(res, e);
  }
});

export default router;
