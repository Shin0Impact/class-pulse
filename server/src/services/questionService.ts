import { UserError } from './sessionService.ts';
import { computeQuadrants } from './quadrant.ts';
import { pairUp } from './pairing.ts';
import { calibrationCard } from './calibration.ts';
import { tally } from './pulseService.ts';
import type {
  Answer,
  BlindspotUpdate,
  CalibrationCard as CalibrationCardPayload,
  Confidence,
  Pair,
  PublicQuestion,
} from '../../../shared/types.ts';
import type { QuestionOption, QuestionRound, Session } from './types.ts';

// Blindspot question rounds: launching a question, recording answers, pairing, rechecking, and
// scoring calibration. correctOptionId lives on the server-side QuestionRound (services/types.ts)
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

// Banks the current round's final answers into each student's running history (for calibration).
// Leaves session.answers alone -- callers clear it themselves once they're done with it.
function foldCurrentRoundIntoHistory(session: Session): void {
  const round = session.currentQuestion;
  if (!round) return;
  for (const [studentId, answer] of session.answers) {
    const correct = answer.optionId === round.correctOptionId;
    const history = session.answerHistory.get(studentId) ?? [];
    history.push({ correct, confidence: answer.confidence });
    session.answerHistory.set(studentId, history);
  }
}

// Teacher launches a real question (usually loaded from a Deck via deckService.ts). Banks
// whatever question was live into history, then replaces it and clears answers -- a new round.
export function launchQuestion(session: Session, payload: { question?: unknown }): PublicQuestion {
  const q = payload?.question;
  if (!q || typeof q !== 'object') throw new UserError('A question is required');
  const { id, topic, prompt, correctOptionId, options } = q as Record<string, unknown>;

  if (typeof id !== 'string' || !id) throw new UserError('Question id is required');
  if (typeof prompt !== 'string' || !prompt.trim()) throw new UserError('Question prompt is required');
  if (typeof correctOptionId !== 'string' || !correctOptionId) throw new UserError('correctOptionId is required');

  const publicOptions = toPublicOptions(options);
  if (!publicOptions.some((o) => o.id === correctOptionId)) throw new UserError('correctOptionId must match an option id');

  foldCurrentRoundIntoHistory(session); // bank the previous question's final answers, if any, before resetting

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
  session.pairs = [];

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

// What the teacher's dashboard sees: the live quadrant breakdown for the current question, plus
// the class-level Illusion Gap -- how the class FELT they were doing (the live pulse %, from the
// green/yellow/red taps) minus how they actually did on this question (% who answered correctly).
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

  const update = computeQuadrants(round.id, answers, round.correctOptionId, namesById);

  const pulsePct = tally([...session.students.values()]).pct; // felt: the live green/yellow/red %
  const correctCount = update.counts.mastered + update.counts.fragile; // real: got this question right
  const realPct = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : null;
  const illusionGap = pulsePct !== null && realPct !== null ? pulsePct - realPct : null;

  return { ...update, illusionGap };
}

// Computes pairs from the latest quadrant groups and hands them out (teacher:pairUp). Returns the
// question id too, since callers need it for each PAIR_ASSIGNED payload.
export function pairStudents(session: Session): { pairs: Pair[]; questionId: string } {
  const update = computeBlindspotUpdate(session);
  const pairs = pairUp(update.groups.blindspot, update.groups.mastered);
  session.pairs = pairs;
  return { pairs, questionId: update.questionId };
}

// Folds the current round's final answers into history, then returns a calibration card per
// student who answered. Called right before a recheck clears the round (teacher:recheck), so the
// card reflects the round that just closed, scored against the student's full history so far.
export function calibrationCardsForCurrentRound(session: Session): CalibrationCardPayload[] {
  if (!session.currentQuestion) throw new UserError('No question is live');
  foldCurrentRoundIntoHistory(session);
  return [...session.answers.keys()].map((studentId) =>
    calibrationCard(studentId, session.answerHistory.get(studentId) ?? []));
}

// Re-opens the current question for another round (after pairing/discussion), so students answer
// again to see if minds changed. Does NOT touch history -- callers fold the closing round in first
// (see calibrationCardsForCurrentRound) if they want it scored before it's cleared here.
export function recheckQuestion(session: Session): PublicQuestion {
  const round = session.currentQuestion;
  if (!round) throw new UserError('No question is live');
  session.answers = new Map();
  session.pairs = [];
  return { questionId: round.id, topic: round.topic, prompt: round.prompt, options: round.options, isRecheck: true };
}
