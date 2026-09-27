import { Router } from 'express';
import { getSession } from '../services/sessionService.ts';

const router = Router();

// Lets the join page check a code before asking for a name.
router.get('/:code', (req, res) => {
  const session = getSession(req.params.code);
  if (!session) return res.status(404).json({ exists: false });
  res.json({ exists: true, title: session.title });
});

export default router;
