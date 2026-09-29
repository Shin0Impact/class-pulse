import { randomUUID } from "node:crypto";
import { UserError } from "./sessionService.ts";
import { computeQuadrants } from "./quadrant.ts";
import { pairUp } from "./pairing.ts";
import { calibrationCard } from "./calibration.ts";
import { scoreExplanation } from "./explanationRubric.ts";
import { store } from "../db/store.ts";
import type { ExplanationRubric } from "./explanationRubric.ts";
import type {
  Answer,
  AnswerReveal,
  BlindspotUpdate,
  CalibrationCard as CalibrationCardPayload,
  Confidence,
  LessonContext,
  Pair,
  PublicQuestion,
} from "../../../shared/types.ts";
import type { QuestionOption, QuestionRound, Session } from "./types.ts";

// The answer key and rubric stay on the server. Students receive only the prompt and options.
function toPublicOptions(options: unknown): QuestionOption[] {
  if (!Array.isArray(options) || options.length < 2) {
    throw new UserError("A question needs at least 2 options");
  }

  return options.map((o: unknown, i: number) => {
    if (!o || typeof o !== "object" || Array.isArray(o)) {
      throw new UserError(`Option ${i + 1} is invalid`);
    }

    const { id, text } = o as Record<string, unknown>;
    if (typeof id !== "string" || !id) {
      throw new UserError(`Option ${i + 1} needs an id`);
    }
    if (typeof text !== "string" || !text.trim()) {
      throw new UserError(`Option ${i + 1} needs text`);
    }

    return { id, text: text.trim() };
  });
}

function toRubric(value: unknown): ExplanationRubric | undefined {
  if (value === undefined) return undefined;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UserError("Invalid explanation rubric");
  }

  const rubric = value as Record<string, unknown>;
  if (
    !Array.isArray(rubric.keyIdeas) ||
    rubric.keyIdeas.length === 0 ||
    !rubric.keyIdeas.every(
      (idea: unknown) => typeof idea === "string" && idea.trim().length > 0,
    ) ||
    !Array.isArray(rubric.misconceptions) ||
    !rubric.misconceptions.every((item: unknown) => {
      if (!item || typeof item !== "object" || Array.isArray(item))
        return false;
      const misconception = item as Record<string, unknown>;
      return (
        typeof misconception.label === "string" &&
        misconception.label.trim().length > 0 &&
        Array.isArray(misconception.phrases) &&
        misconception.phrases.length > 0 &&
        misconception.phrases.every(
          (phrase: unknown) =>
            typeof phrase === "string" && phrase.trim().length > 0,
        )
      );
    })
  ) {
    throw new UserError("Invalid explanation rubric");
  }

  return value as ExplanationRubric;
}

const clip = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";

function toContext(value: unknown): LessonContext | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const c = value as Record<string, unknown>;
  const context: LessonContext = {
    documentName: clip(c.documentName, 120) || undefined,
    page: Number.isInteger(c.page) && (c.page as number) > 0 ? (c.page as number) : undefined,
    // keep line breaks in the excerpt: they help the AI read slides
    excerpt: typeof c.excerpt === "string" ? c.excerpt.slice(0, 4000) : undefined,
  };
  return context.documentName || context.page || context.excerpt ? context : undefined;
}

const SOURCES = ["deck", "ai", "teacher"] as const;

export const publicQuestion = (round: QuestionRound, isRecheck = false): PublicQuestion => ({
  questionId: round.id,
  kind: round.kind,
  topic: round.topic,
  prompt: round.prompt,
  options: round.options,
  ...(isRecheck ? { isRecheck: true } : {}),
});

// Banks the current round's final answers into each student's calibration history.
// Open questions have no right answer, so they never count toward calibration.
function foldCurrentRoundIntoHistory(session: Session): void {
  const round = session.currentQuestion;
  if (!round || round.kind === "open") return;

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
  if (!q || typeof q !== "object" || Array.isArray(q)) {
    throw new UserError("A question is required");
  }

  const {
    id,
    kind,
    topic,
    prompt,
    correctOptionId,
    options,
    rubric,
    source,
    context,
    modelAnswer,
  } = q as Record<string, unknown>;
  const isOpen = kind === "open";

  if (typeof id !== "string" || !id || id.length > 100) {
    throw new UserError("Question id is required");
  }
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new UserError("Question prompt is required");
  }
  if (prompt.length > 500) throw new UserError("The question is too long");

  let publicOptions: QuestionOption[] = [];
  if (!isOpen) {
    if (typeof correctOptionId !== "string" || !correctOptionId) {
      throw new UserError("correctOptionId is required");
    }
    publicOptions = toPublicOptions(options);
    if (publicOptions.length > 6) throw new UserError("At most 6 options");
    if (publicOptions.some((o) => o.text.length > 200)) throw new UserError("An option is too long");
    if (new Set(publicOptions.map((o) => o.id)).size !== publicOptions.length) {
      throw new UserError("Option ids must be different");
    }
    if (!publicOptions.some((o) => o.id === correctOptionId)) {
      throw new UserError("correctOptionId must match an option id");
    }
  }
  const privateRubric = isOpen ? undefined : toRubric(rubric);

  foldCurrentRoundIntoHistory(session);

  const round: QuestionRound = {
    id,
    dbId: randomUUID(),
    round: 1,
    kind: isOpen ? "open" : "mcq",
    topic: clip(topic, 80),
    prompt: prompt.trim(),
    correctOptionId: isOpen ? "" : (correctOptionId as string),
    options: publicOptions,
    rubric: privateRubric,
    source: SOURCES.includes(source as (typeof SOURCES)[number])
      ? (source as QuestionRound["source"])
      : "deck",
    context: toContext(context),
    modelAnswer: isOpen ? clip(modelAnswer, 600) || undefined : undefined,
    closed: false,
    startedAt: Date.now(),
  };

  session.currentQuestion = round;
  session.answers = new Map();
  session.pairs = [];
  store.saveQuestion(session, round);

  return publicQuestion(round);
}

// Teacher: "Close". No more answers this round; students go back to waiting.
export function closeQuestion(session: Session): QuestionRound {
  const round = session.currentQuestion;
  if (!round) throw new UserError("No question is live");
  round.closed = true;
  return round;
}

const CONFIDENCES = ["guess", "fairly-sure", "certain"];

export function recordAnswer(
  session: Session,
  student: { id: string },
  payload: {
    questionId?: unknown;
    optionId?: unknown;
    confidence?: unknown;
    explanation?: unknown;
    text?: unknown;
  },
): void {
  const round = session.currentQuestion;
  if (!round) throw new UserError("No question is live");
  if (payload.questionId !== round.id) {
    throw new UserError("That question is no longer live");
  }
  if (round.closed) throw new UserError("This question is closed");
  if (
    typeof payload.confidence !== "string" ||
    !CONFIDENCES.includes(payload.confidence)
  ) {
    throw new UserError("Invalid confidence");
  }

  if (round.kind === "open") {
    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    if (!text) throw new UserError("Write your answer first");
    if (text.length > 1000) throw new UserError("Answer must be at most 1000 characters");
    const answer = { optionId: "", text, confidence: payload.confidence as Confidence };
    session.answers.set(student.id, answer);
    store.saveAnswer(round, student.id, answer, false);
    return;
  }

  if (
    typeof payload.optionId !== "string" ||
    !round.options.some((o) => o.id === payload.optionId)
  ) {
    throw new UserError("Invalid choice");
  }
  if (
    payload.explanation !== undefined &&
    (typeof payload.explanation !== "string" ||
      payload.explanation.length > 1000)
  ) {
    throw new UserError("Explanation must be text of at most 1000 characters");
  }

  const explanation =
    typeof payload.explanation === "string"
      ? payload.explanation.trim()
      : undefined;

  const answer = {
    optionId: payload.optionId,
    confidence: payload.confidence as Confidence,
    explanation,
    explanationScore:
      explanation && round.rubric
        ? scoreExplanation(explanation, round.rubric)
        : undefined,
  };

  session.answers.set(student.id, answer);
  store.saveAnswer(
    round,
    student.id,
    answer,
    payload.optionId === round.correctOptionId,
  );
}

// The teacher gets quadrant data and, where available, each student's explanation and score.
export function computeBlindspotUpdate(session: Session): BlindspotUpdate {
  const round = session.currentQuestion;
  if (!round) throw new UserError("No question is live");

  if (round.kind === "open") {
    const openAnswers = [...session.answers.entries()].map(([id, a]) => ({
      id,
      name: session.students.get(id)?.name ?? "Student",
      text: a.text ?? "",
      confidence: a.confidence,
    }));
    return {
      questionId: round.id,
      launchKey: `${round.dbId}:${round.round}`,
      kind: "open",
      closed: round.closed,
      responses: openAnswers.length,
      openAnswers,
      groups: { mastered: [], fragile: [], blindspot: [], aware: [] },
      counts: { mastered: 0, fragile: 0, blindspot: 0, aware: 0 },
      illusionGap: null,
      headline: "",
    };
  }

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

  // illusionGap/headline come straight from computeQuadrants: confident% minus correct% on THIS
  // question, not the general classroom pulse -- a tighter signal than mixing in unrelated taps.
  return {
    ...update,
    launchKey: `${round.dbId}:${round.round}`,
    kind: "mcq",
    closed: round.closed,
    responses: answers.length,
  };
}

export function pairStudents(session: Session): {
  pairs: Pair[];
  questionId: string;
} {
  const round = session.currentQuestion;
  if (!round) throw new UserError("No question is live");
  if (round.kind === "open") {
    throw new UserError("Pair up works with multiple-choice questions");
  }

  const update = computeBlindspotUpdate(session);
  const pairs = pairUp(update.groups.blindspot, update.groups.mastered);
  session.pairs = pairs;
  if (pairs.length > 0) store.savePairs(round, pairs);
  return { pairs, questionId: update.questionId };
}

// The listener's rating of how clearly their partner explained (student:rateClarity). Only the
// listener half of the pair may rate it -- the explainer being scored can't grade themselves.
const CLARITY_RATINGS = [1, 2, 3, 4, 5];

export function recordClarityRating(
  session: Session,
  student: { id: string },
  payload: { pairId?: unknown; rating?: unknown },
): void {
  const round = session.currentQuestion;
  if (!round) throw new UserError("No question is live");

  const pair = session.pairs.find((p) => p.pairId === payload.pairId);
  if (!pair) throw new UserError("That pair is no longer active");
  if (pair.listener.id !== student.id) {
    throw new UserError("Only the listener rates this pair");
  }
  if (
    typeof payload.rating !== "number" ||
    !CLARITY_RATINGS.includes(payload.rating)
  ) {
    throw new UserError("Rating must be 1 to 5");
  }

  store.saveClarityRating(round, pair.pairId, student.id, payload.rating);
}
export function answerRevealsForCurrentRound(
  session: Session,
): Array<{ studentId: string; reveal: AnswerReveal }> {
  const round = session.currentQuestion;

  if (!round) {
    throw new UserError("No question is live");
  }
  if (round.kind === "open") {
    throw new UserError("Re-check works with multiple-choice questions");
  }

  return [...session.answers.entries()].map(([studentId, answer]) => {
    const selectedOption = round.options.find(
      (option) => option.id === answer.optionId,
    );

    const correctOption = round.options.find(
      (option) => option.id === round.correctOptionId,
    );

    if (!selectedOption || !correctOption) {
      throw new UserError("Question options are inconsistent");
    }

    return {
      studentId,
      reveal: {
        questionId: round.id,

        selectedOptionId: answer.optionId,
        selectedOptionText: selectedOption.text,

        correctOptionId: round.correctOptionId,
        correctOptionText: correctOption.text,

        confidence: answer.confidence,

        correct: answer.optionId === round.correctOptionId,
      },
    };
  });
}
export function calibrationCardsForCurrentRound(
  session: Session,
): CalibrationCardPayload[] {
  if (!session.currentQuestion) throw new UserError("No question is live");
  foldCurrentRoundIntoHistory(session);

  return [...session.answers.keys()].map((studentId) =>
    calibrationCard(studentId, session.answerHistory.get(studentId) ?? []),
  );
}

export function recheckQuestion(session: Session): PublicQuestion {
  const round = session.currentQuestion;
  if (!round) throw new UserError("No question is live");

  if (round.kind === "open") {
    throw new UserError("Re-check works with multiple-choice questions");
  }

  round.round += 1; // same blindspot_questions row (dbId), a new round of child rows under it
  round.closed = false; // a re-check re-opens a closed question
  round.summary = undefined; // the old summary describes the previous round
  session.answers = new Map();
  session.pairs = [];

  return publicQuestion(round, true);
}
