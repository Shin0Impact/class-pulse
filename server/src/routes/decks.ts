import { Router } from 'express';
import { listDecks, loadDeck } from '../services/deckService.ts';

const router = Router();

// Lets the teacher's question launcher list available decks without loading each one in full.
router.get('/', async (_req, res) => {
  try {
    const ids = await listDecks();
    const decks = await Promise.all(
      ids.map(async (id) => {
        const deck = await loadDeck(id);
        return { id: deck.id, title: deck.title, questionCount: deck.questions.length };
      }),
    );
    res.json({ decks });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// Full deck, including correctOptionId and rubric -- fine for the teacher, who picks the
// question here; students only ever see the public shape questionService.launchQuestion sends.
router.get('/:id', async (req, res) => {
  try {
    const deck = await loadDeck(req.params.id);
    res.json(deck);
  } catch (e) {
    res.status(404).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

export default router;
