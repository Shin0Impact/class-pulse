import type {
  CheckIn,
  Confidence,
  Pair,
  Status,
  Summary,
  TimelineSample,
} from '../../../shared/types.ts';
import type {
  ExplanationRubric,
  ExplanationScore,
} from './explanationRubric.ts';

export type Student = {
  id: string;
  name: string;
  socketId: string;
  connected: boolean;
  status: Status;
  reason: string | null;
  focus: number;
};

// The answer key and rubric stay on the server.
// The public question sent to students includes only the prompt and option text.
export type QuestionOption = { id: string; text: string };

export type QuestionRound = {
  id: string;
  topic: string;
  prompt: string;
  correctOptionId: string;
  options: QuestionOption[];
  rubric?: ExplanationRubric;
  startedAt: number;
};

export type StudentAnswer = {
  optionId: string;
  confidence: Confidence;
  explanation?: string;
  explanationScore?: ExplanationScore;
};

export type AnswerRecord = {
  correct: boolean;
  confidence: Confidence;
};

export type Session = {
  id: string;
  code: string;
  title: string;
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
};