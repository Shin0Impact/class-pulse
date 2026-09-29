import express, { Router } from 'express';
import { requireUser, sendError } from './auth.ts';
import { authEnabled } from '../services/authService.ts';
import { downloadDocument, listDocuments, MAX_BYTES, MIME_EXT, uploadDocument } from '../services/documentService.ts';
import type { AuthedRequest } from './auth.ts';

// Teacher lesson files. Upload: POST /documents?name=<file name> with the raw file as the body and
// its Content-Type. All routes are the signed-in teacher's own files only.
const router = Router();

router.use((_req, res, next) => {
  if (!authEnabled) return res.status(503).json({ error: 'Uploads need the database, which is not configured.' });
  next();
});

router.post(
  '/',
  requireUser('teacher'),
  express.raw({ type: Object.keys(MIME_EXT), limit: MAX_BYTES }),
  async (req, res) => {
    try {
      const mime = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      res.status(201).json(await uploadDocument((req as AuthedRequest).profile.id, { name: req.query.name, mime, body }));
    } catch (e) {
      sendError(res, e);
    }
  },
);

router.get('/', requireUser('teacher'), async (req, res) => {
  try {
    res.json(await listDocuments((req as AuthedRequest).profile.id));
  } catch (e) {
    sendError(res, e);
  }
});

router.get('/:id/file', requireUser('teacher'), async (req, res) => {
  try {
    const { info, body } = await downloadDocument((req as AuthedRequest).profile.id, String(req.params.id));
    res.setHeader('Content-Type', info.mime);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Document-Name', encodeURIComponent(info.name));
    res.send(body);
  } catch (e) {
    sendError(res, e);
  }
});

// 413 from express.raw when a file is over the limit: say it in words.
router.use((err: { type?: string; status?: number }, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Files can be at most 25 MB' });
  next(err);
});

export default router;
