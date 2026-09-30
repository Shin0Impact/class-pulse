import type {
  CheckIn,
  ClassConfusionSummary,
  Confidence,
  LessonContext,
  Pair,
  QuestionKind,
  Status,
  Summary,
  TimelineSample,
} from "../../../shared/types.ts";
import type {
  ExplanationRubric,
  ExplanationScore,
} from "./explanationRubric.ts";

export type Student = {
  id: string;
  name: string;
  socketId: string;
  connected: boolean;
  status: Status;
  reason: string | null;
  focus: number;
  // The student's account (profiles.id) when they joined signed in; null for a guest join.
  userId: string | null;
  // Private proof that a reconnect comes from this student's own device. The studentId alone is
  // not enough: classmates see it (a pair:assigned partner carries it).
  rejoinKey: string;
};

// The answer key and rubric stay on the server.
// The public question sent to students includes only the prompt and option text.
export type QuestionOption = { id: string; text: string };

export type QuestionRound = {
  id: string;
  // Server-generated id for this launched question's row in blindspot_questions (db/store.ts).
  // A teacher:recheck bumps `round` below but keeps this same dbId -- it's the same question,
  // round 2 -- so answers/pairs/ratings from both rounds point back to one question row.
  dbId: string;
  round: number;
  topic: string;
  prompt: string;
  // "open": a free-text question. It has no options and no right answer (correctOptionId ""), so
  // it skips the quadrant, pairing and calibration and feeds the AI confusion summary instead.
  kind: QuestionKind;
  correctOptionId: string;
  options: QuestionOption[];
  rubric?: ExplanationRubric;
  source: "deck" | "ai" | "teacher";
  context?: LessonContext; // the page it was asked about (teacher/AI only, never sent to students)
  modelAnswer?: string; // open questions: what a good answer says (teacher/AI only)
  closed: boolean; // teacher pressed Close: no more answers this round
  summary?: ClassConfusionSummary; // the latest AI summary of this question
  startedAt: number;
};

export type StudentAnswer = {
  optionId: string; // "" for an open question
  text?: string; // an open question's answer
  confidence: Confidence;
  explanation?: string;
  explanationScore?: ExplanationScore;
};

export type AnswerRecord = {
  correct: boolean;
  confidence: Confidence;
};
// ---- G9: Class Feedback ----

export type ClassFeedback = {
  id: string;
  studentId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  anonymous: boolean;
  createdAt: number;
};
export type Session = {
  id: string;
  code: string;
  title: string;
  // The teacher's account (profiles.id). null only when accounts are off (no database configured).
  teacherId: string | null;
  createdAt: number;
  students: Map<string, Student>;
  checkIns: Summary[];
  current: CheckIn;
  timeline: TimelineSample[];
  focusMode: boolean;
  currentQuestion: QuestionRound | null;
  answers: Map<string, StudentAnswer>;
  answerHistory: Map<string, AnswerRecord[]>;
  pairs: Pair[];
  feedbackOpen: boolean;
  feedback: ClassFeedback[];
};
