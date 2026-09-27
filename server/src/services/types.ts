import type { CheckIn, Confidence, Pair, Status, Summary, TimelineSample } from '../../../shared/types.ts';

export type Student = {
  id: string;
  name: string;
  socketId: string;
  connected: boolean;
  status: Status;
  reason: string | null;
  focus: number;
};

// A launched Blindspot question. correctOptionId lives here (server-only) and must never reach
// students -- questionService.ts's launchQuestion strips it (and any misconception fields) before
// broadcasting QUESTION_STARTED.
export type QuestionOption = { id: string; text: string };
export type QuestionRound = {
  id: string;
  topic: string;
  prompt: string;
  correctOptionId: string;
  options: QuestionOption[];
  startedAt: number;
};
export type StudentAnswer = { optionId: string; confidence: Confidence };
export type AnswerRecord = { correct: boolean; confidence: Confidence };

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
  currentQuestion: QuestionRound | null;       // the live Blindspot question, if any
  answers: Map<string, StudentAnswer>;         // studentId -> answer, for the current round only
  answerHistory: Map<string, AnswerRecord[]>;  // studentId -> every past round's answer, for calibration
  pairs: Pair[];                               // the latest teacher:pairUp result for the current question
};
