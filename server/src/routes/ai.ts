import express, { Router } from 'express';
import { sendError } from './auth.ts';
import { takeHourly } from '../ai/limits.ts';
import { getSession, UserError } from '../services/sessionService.ts';
import { authEnabled, verifyToken, AuthError } from '../services/authService.ts';
import { checkGenerateInput, generateQuestion } from '../ai/questionGen.ts';
import { checkQuizInput, generateQuiz } from '../ai/quizGen.ts';
import { aiEnabled } from '../ai/llm.ts';
import type { NextFunction, Request, Response } from 'express';
import type { Session } from '../services/types.ts';

// POST /ai/question: a draft question about the page the teacher is showing. HTTP rather than a
// socket event because the page image is a few hundred KB (over Socket.IO's default 1 MB cap
// once several arrive together).
const router = Router();

type Caller = { teacherId: string | null };

// Checks the Bearer token BEFORE the (up to 5 MB) body is parsed, so anonymous callers can't make
// the server chew through big bodies. With accounts off there's no one to check.
router.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!aiEnabled()) return res.status(503).json({ error: 'AI is not set up on the server' });
    let teacherId: string | null = null;
    if (authEnabled) {
      const header = req.headers.authorization ?? '';
      const teacher = await verifyToken(header.startsWith('Bearer ') ? header.slice(7) : '');
      if (!teacher) throw new AuthError('Please sign in again');
      if (teacher.role !== 'teacher') throw new AuthError('This needs a teacher account');
      teacherId = teacher.id;
    }
    (req as Request & { caller: Caller }).caller = { teacherId };
    next();
  } catch (e) {
    sendError(res, e);
  }
});

router.use(express.json({ limit: '5mb' }));

// The live class the request is for; with accounts on it must be the caller's own class.
function requireClass(req: Request): Session {
  const session = getSession((req.body as Record<string, unknown> | undefined)?.code);
  if (!session) throw new UserError('Class not found. Reopen the dashboard.');
  const { teacherId } = (req as Request & { caller: Caller }).caller;
  if (authEnabled && session.teacherId !== teacherId) throw new AuthError('This class belongs to another teacher');
  return session;
}

router.post('/question', async (req, res) => {
  try {
    const session = requireClass(req);
    const input = checkGenerateInput(req.body ?? {}); // a bad request doesn't use up the allowance
    const who = (req as Request & { caller: Caller }).caller.teacherId ?? `ip:${req.ip}`;
    if (!takeHourly([[`gen:class:${session.code}`, 40], [`gen:who:${who}`, 80]])) {
      throw new UserError('Too many generated questions this hour. Try again later.');
    }
    res.json(await generateQuestion(input));
  } catch (e) {
    sendError(res, e);
  }
});

// POST /ai/quiz: a whole quiz (N questions) from a page range. Counts as a few questions against
// the hourly allowance because it is one big model call.
router.post('/quiz', async (req, res) => {
  try {
    const session = requireClass(req);
    const input = checkQuizInput(req.body ?? {});
    const who = (req as Request & { caller: Caller }).caller.teacherId ?? `ip:${req.ip}`;
    if (!takeHourly([[`quiz:class:${session.code}`, 12], [`quiz:who:${who}`, 24]])) {
      throw new UserError('Too many generated quizzes this hour. Try again later.');
    }
    res.json(await generateQuiz(input));
  } catch (e) {
    sendError(res, e);
  }
});

// Oversized or malformed JSON: answer in JSON like every other error, not an HTML error page.
router.use((err: { type?: string; status?: number }, _req: Request, res: Response, next: NextFunction) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'The page image is too large' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request' });
  next(err);
});

export default router;
