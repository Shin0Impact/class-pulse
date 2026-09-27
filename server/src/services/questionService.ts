import { UserError } from './sessionService.ts';
import { computeQuadrants } from './quadrant.ts';
import type { Answer, BlindspotUpdate, Confidence, PublicQuestion } from '../../../shared/types.ts';
import type { QuestionOption, QuestionRound, Session } from './types.ts';

// Blindspot question rounds: launching a question, recording answers, and computing the live
// quadrant breakdown. correctOptionId is stored on the server-side QuestionRound (services/types.ts)
// and never leaves this file -- toPublicOptions below only ever copies id/text, so a wrong option's
// misconception (or the correct id) can't leak to a student by accident.

function toPublicOptions(options: unknown): QuestionOption[] {
  if (!Array.isArray(options) || options.length < 2) throw new UserError('A question needs at least 2 options');
  return options.map((o: unknown, i: number) => {
    if (!o || typeof o !== 'object') throw new UserError(`Option ${i + 1} is invalid`);
    const { id, text } = o as Record<string, unknown>;
    if (typeof id !== 'string' || !id) throw new UserError(`Option ${i + 1} needs an id`);
    if (typeof text !== 'string' || !text.trim()) throw new UserError(`Option ${i + 1} needs text`);
    return { id, text: text.trim() };
  });
}

// Teacher launches a real question (usually loaded from a Deck via deckService.ts). Replaces
// whatever question was already live and clears its answers -- this starts a new round.
export function launchQuestion(session: Session, payload: { question?: unknown }): PublicQuestion {
  const q = payload?.question;
  if (!q || typeof q !== 'object') throw new UserError('A question is required');
  const { id, topic, prompt, correctOptionId, options } = q as Record<string, unknown>;

  if (typeof id !== 'string' || !id) throw new UserError('Question id is required');
  if (typeof prompt !== 'string' || !prompt.trim()) throw new UserError('Question prompt is required');
  if (typeof correctOptionId !== 'string' || !correctOptionId) throw new UserError('correctOptionId is required');

  const publicOptions = toPublicOptions(options);
  if (!publicOptions.some((o) => o.id === correctOptionId)) throw new UserError('correctOptionId must match an option id');

  const round: QuestionRound = {
    id,
    topic: typeof topic === 'string' ? topic.trim() : '',
    prompt: prompt.trim(),
    correctOptionId,
    options: publicOptions,
    startedAt: Date.now(),
  };
  session.currentQuestion = round;
  session.answers = new Map();

  return { questionId: round.id, topic: round.topic, prompt: round.prompt, options: round.options };
}

const CONFIDENCES = ['guess', 'fairly-sure', 'certain'];

// A student's answer: option + confidence. Overwrites any earlier answer from the same student
// this round (changing your mind is allowed, same as the pulse colors).
export function recordAnswer(
  session: Session,
  student: { id: string },
  payload: { questionId?: unknown; optionId?: unknown; confidence?: unknown },
): void {
  const round = session.currentQuestion;
  if (!round) throw new UserError('No question is live');
  if (payload.questionId !== round.id) throw new UserError('That question is no longer live');
  if (typeof payload.optionId !== 'string' || !round.options.some((o) => o.id === payload.optionId)) {
    throw new UserError('Invalid choice');
  }
  if (typeof payload.confidence !== 'string' || !CONFIDENCES.includes(payload.confidence)) {
    throw new UserError('Invalid confidence');
  }
  session.answers.set(student.id, { optionId: payload.optionId, confidence: payload.confidence as Confidence });
}

// What the teacher's dashboard sees: the live quadrant breakdown for the current question.
// Safe to call with zero answers (e.g. right after launching) -- quadrant.ts returns empty groups.
export function computeBlindspotUpdate(session: Session): BlindspotUpdate {
  const round = session.currentQuestion;
  if (!round) throw new UserError('No question is live');

  const answers: Answer[] = [...session.answers.entries()].map(([studentId, a]) => ({
    studentId,
    questionId: round.id,
    optionId: a.optionId,
    confidence: a.confidence,
  }));
  const namesById = new Map<string, string>();
  for (const s of session.students.values()) namesById.set(s.id, s.name);

  return computeQuadrants(round.id, answers, round.correctOptionId, namesById);
}
