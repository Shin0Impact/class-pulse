export type Status = 'green' | 'yellow' | 'red' | 'waiting';
export type Mark = Exclude<Status, 'waiting'>;
export type Counts = Record<Status, number>;
export type CheckIn = { id: string; topic: string; startedAt: number };
export type TimelineSample = { t: number; pct: number | null; marked: number; total: number; checkInId: string };
export type Summary = CheckIn & { endedAt: number; counts: Counts; marked: number; total: number; pct: number | null };
export type Comparison = { topic: string; before: number; after: number; delta: number; beforeMarked: number; afterMarked: number };
export type ReasonCount = { id: string; label: string; count: number };
export type StudentView = { id: string; name: string; connected: boolean; status: Status; reason: string | null; focusFlags: number };

export type Pulse = Omit<TimelineSample, 'checkInId'> & {
  checkIn: CheckIn;
  counts: Counts;
  reasons: ReasonCount[];
  comparison: Comparison | null;
  perStudent: StudentView[];
};

export type TeacherState = {
  code: string;
  title: string;
  focusMode: boolean;
  pulse: Pulse;
  history: Summary[];
  timeline: TimelineSample[];
};

export type StudentState = {
  studentId: string;
  name: string;
  title: string;
  topic: string;
  checkInId: string;
  status: Status;
  reason: string | null;
  focusMode: boolean;
};

export type FocusAlert = { studentId: string; name: string; count: number };

// ---- Blindspot ----

export type Confidence = 'guess' | 'fairly-sure' | 'certain';
export type Quadrant = 'mastered' | 'fragile' | 'blindspot' | 'aware';

// A question's option as sent to students: never the correct answer, never a misconception hint.
export type PublicQuestionOption = { id: string; text: string };

// What TEACHER_LAUNCH_QUESTION/TEACHER_RECHECK broadcast to students as QUESTION_STARTED.
export type PublicQuestion = {
  questionId: string;
  topic: string;
  prompt: string;
  options: PublicQuestionOption[];
  isRecheck?: boolean;
};

export type Answer = {
  studentId: string;
  questionId: string;
  optionId: string;
  confidence: Confidence;
};

// One student's row inside a quadrant group (see BlindspotUpdate).
export type QuadrantStudent = {
  id: string;
  name: string;
  optionId: string;
  confidence: Confidence;
  correct: boolean;
  explanation?: string;
  explanationScore?: {
    matchedIdeas: string[];
    matchedMisconceptions: string[];
    score: number | null;
  };
};

export type QuadrantGroups = {
  mastered: QuadrantStudent[];
  fragile: QuadrantStudent[];
  blindspot: QuadrantStudent[];
  aware: QuadrantStudent[];
};

export type QuadrantCounts = {
  mastered: number;
  fragile: number;
  blindspot: number;
  aware: number;
};

export type BlindspotUpdate = {
  questionId: string;
  groups: QuadrantGroups;
  counts: QuadrantCounts;
  illusionGap: number | null; // felt-confident % minus actually-correct %
  headline: string;
};

export type PairPerson = { id: string; name: string };
export type Pair = { pairId: string; explainer: PairPerson; listener: PairPerson };
export type PairAssigned = {
  pairId: string;
  partner: PairPerson;
  role: 'explainer' | 'listener';
  questionId: string;
};

export type Calibration = 'well-calibrated' | 'overconfident' | 'underconfident' | 'no-data';
export type CalibrationCard = {
  studentId: string;
  accuracy: number | null;
  avgConfidence: number | null;
  calibration: Calibration;
  illusionGap: number | null;
};