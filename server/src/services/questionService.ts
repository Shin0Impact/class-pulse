import { UserError } from './sessionService.ts';
import { computeQuadrants } from './quadrant.ts';
import { pairUp } from './pairing.ts';
import { calibrationCard } from './calibration.ts';
import { scoreExplanation } from './explanationRubric.ts';
import { tally } from './pulseService.ts';
import type { ExplanationRubric } from './explanationRubric.ts';
import type {
  Answer,
  BlindspotUpdate,
  CalibrationCard as CalibrationCardPayload,
  Confidence,
  Pair,
  PublicQuestion,
} from '../../../shared/types.ts';
import type { QuestionOption, QuestionRound, Session } from './types.ts';

// The answer key and rubric stay on the server. Students receive only the prompt and options.
function toPublicOptions(options: unknown): QuestionOption[] {
  if (!Array.isArray(options) || options.length < 2) {
    throw new UserError('A question needs at least 2 options');
  }

  return options.map((o: unknown, i: number) => {
    if (!o || typeof o !== 'object' || Array.isArray(o)) {
      throw new UserError(`Option ${i + 1} is invalid`);
    }

    const { id, text } = o as Record<string, unknown>;
    if (typeof id !== 'string' || !id) {
      throw new UserError(`Option ${i + 1} needs an id`);
    }
    if (typeof text !== 'string' || !text.trim()) {
      throw new UserError(`Option ${i + 1} needs text`);
    }

    return { id, text: text.trim() };
  });
}

function toRubric(value: unknown): ExplanationRubric | undefined {
  if (value === undefined) return undefined;

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new UserError('Invalid explanation rubric');
  }

  const rubric = value as Record<string, unknown>;
  if (
    !Array.isArray(rubric.keyIdeas) ||
    rubric.keyIdeas.length === 0 ||
    !rubric.keyIdeas.every(
      (idea: unknown) => typeof idea === 'string' && idea.trim().length > 0,
    ) ||
    !Array.isArray(rubric.misconceptions) ||
    !rubric.misconceptions.every((item: unknown) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
      const misconception = item as Record<string, unknown>;
      return (
        typeof misconception.label === 'string' &&
        misconception.label.trim().length > 0 &&
        Array.isArray(misconception.phrases) &&
        misconception.phrases.length > 0 &&
        misconception.phrases.every(
          (phrase: unknown) =>
            typeof phrase === 'string' && phrase.trim().length > 0,
        )
      );
    })
  ) {
    throw new UserError('Invalid explanation rubric');
  }

  return value as ExplanationRubric;
}

// Banks the current round's final answers into each student's calibration history.
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

export function launchQuestion(
  session: Session,
  payload: { question?: unknown },
): PublicQuestion {
  const q = payload?.question;
  if (!q || typeof q !== 'object' || Array.isArray(q)) {
    throw new UserError('A question is required');
  }

  const { id, topic, prompt, correctOptionId, options, rubric } =
    q as Record<string, unknown>;

  if (typeof id !== 'string' || !id) {
    throw new UserError('Question id is required');
  }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw new UserError('Question prompt is required');
  }
  if (typeof correctOptionId !== 'string' || !correctOptionId) {
    throw new UserError('correctOptionId is required');
  }

  const publicOptions = toPublicOptions(options);
  if (!publicOptions.some((o) => o.id === correctOptionId)) {
    throw new UserError('correctOptionId must match an option id');
  }
  const privateRubric = toRubric(rubric);

  foldCurrentRoundIntoHistory(session);

  const round: QuestionRound = {
    id,
    topic: typeof topic === 'string' ? topic.trim() : '',
    prompt: prompt.trim(),
    correctOptionId,
    options: publicOptions,
    rubric: privateRubric,
    startedAt: Date.now(),
  };

  session.currentQuestion = round;
  session.answers = new Map();
  session.pairs = [];

  return {
    questionId: round.id,
    topic: round.topic,
    prompt: round.prompt,
    options: round.options,
  };
}

const CONFIDENCES = ['guess', 'fairly-sure', 'certain'];

export function recordAnswer(
  session: Session,
  student: { id: string },
  payload: {
    questionId?: unknown;
    optionId?: unknown;
    confidence?: unknown;
    explanation?: unknown;
  },
): void {
  const round = session.currentQuestion;
  if (!round) throw new UserError('No question is live');
  if (payload.questionId !== round.id) {
    throw new UserError('That question is no longer live');
  }
  if (
    typeof payload.optionId !== 'string' ||
    !round.options.some((o) => o.id === payload.optionId)
  ) {
    throw new UserError('Invalid choice');
  }
  if (
    typeof payload.confidence !== 'string' ||
    !CONFIDENCES.includes(payload.confidence)
  ) {
    throw new UserError('Invalid confidence');
  }
  if (
    payload.explanation !== undefined &&
    (typeof payload.explanation !== 'string' ||
      payload.explanation.length > 1000)
  ) {
    throw new UserError('Explanation must be text of at most 1000 characters');
  }

  const explanation =
    typeof payload.explanation === 'string'
      ? payload.explanation.trim()
      : undefined;

  session.answers.set(student.id, {
    optionId: payload.optionId,
    confidence: payload.confidence as Confidence,
    explanation,
    explanationScore:
      explanation && round.rubric
        ? scoreExplanation(explanation, round.rubric)
        : undefined,
  });
}

// The teacher gets quadrant data and, where available, each student's explanation and score.
export function computeBlindspotUpdate(session: Session): BlindspotUpdate {
  const round = session.currentQuestion;
  if (!round) throw new UserError('No question is live');

  const answers: Answer[] = [...session.answers.entries()].map(
    ([studentId, answer]) => ({
      studentId,
      questionId: round.id,
      optionId: answer.optionId,
      confidence: answer.confidence,
    }),
  );

  const namesById = new Map<string, string>();
  for (const student of session.students.values()) {
    namesById.set(student.id, student.name);
  }

  const update = computeQuadrants(
    round.id,
    answers,
    round.correctOptionId,
    namesById,
  );

  for (const group of Object.values(update.groups)) {
    for (const row of group) {
      const answer = session.answers.get(row.id);
      if (answer?.explanation !== undefined) {
        row.explanation = answer.explanation;
      }
      if (answer?.explanationScore !== undefined) {
        row.explanationScore = answer.explanationScore;
      }
    }
  }

  const pulsePct = tally([...session.students.values()]).pct;
  const correctCount = update.counts.mastered + update.counts.fragile;
  const realPct =
    answers.length > 0
      ? Math.round((correctCount / answers.length) * 100)
      : null;
  const illusionGap =
    pulsePct !== null && realPct !== null ? pulsePct - realPct : null;

  return { ...update, illusionGap };
}

export function pairStudents(
  session: Session,
): { pairs: Pair[]; questionId: string } {
  const update = computeBlindspotUpdate(session);
  const pairs = pairUp(update.groups.blindspot, update.groups.mastered);
  session.pairs = pairs;
  return { pairs, questionId: update.questionId };
}

export function calibrationCardsForCurrentRound(
  session: Session,
): CalibrationCardPayload[] {
  if (!session.currentQuestion) throw new UserError('No question is live');
  foldCurrentRoundIntoHistory(session);

  return [...session.answers.keys()].map((studentId) =>
    calibrationCard(
      studentId,
      session.answerHistory.get(studentId) ?? [],
    ),
  );
}

export function recheckQuestion(session: Session): PublicQuestion {
  const round = session.currentQuestion;
  if (!round) throw new UserError('No question is live');

  session.answers = new Map();
  session.pairs = [];

  return {
    questionId: round.id,
    topic: round.topic,
    prompt: round.prompt,
    options: round.options,
    isRecheck: true,
  };
}