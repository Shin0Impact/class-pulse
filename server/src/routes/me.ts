import { Router } from 'express';
import { requireUser, sendError } from './auth.ts';
import { studentProgress, teacherClass, teacherClasses } from '../services/historyService.ts';
import type { AuthedRequest } from './auth.ts';

// Everything about the signed-in account. Every route needs "Authorization: Bearer <accessToken>".
const router = Router();

router.get('/', requireUser(), (req, res) => {
  res.json({ profile: (req as AuthedRequest).profile });
});

// Teacher: the classes they ran, newest first.
router.get('/classes', requireUser('teacher'), async (req, res) => {
  try {
    res.json(await teacherClasses((req as AuthedRequest).profile.id));
  } catch (e) {
    sendError(res, e);
  }
});

// Teacher: one class's summary (students, questions, check-ins). 404 unless it's theirs.
router.get('/classes/:id', requireUser('teacher'), async (req, res) => {
  try {
    res.json(await teacherClass((req as AuthedRequest).profile.id, String(req.params.id)));
  } catch (e) {
    sendError(res, e);
  }
});

// Student: calibration over time, per-topic accuracy, classes attended.
router.get('/progress', requireUser('student'), async (req, res) => {
  try {
    res.json(await studentProgress((req as AuthedRequest).profile.id));
  } catch (e) {
    sendError(res, e);
  }
});

export default router;
