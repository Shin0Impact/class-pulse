export type Status = "green" | "yellow" | "red" | "waiting";
export type Mark = Exclude<Status, "waiting">;
export type Counts = Record<Status, number>;
export type CheckIn = { id: string; topic: string; startedAt: number };
export type TimelineSample = {
  t: number;
  pct: number | null;
  marked: number;
  total: number;
  checkInId: string;
};
export type Summary = CheckIn & {
  endedAt: number;
  counts: Counts;
  marked: number;
  total: number;
  pct: number | null;
};
export type Comparison = {
  topic: string;
  before: number;
  after: number;
  delta: number;
  beforeMarked: number;
  afterMarked: number;
};
export type ReasonCount = { id: string; label: string; count: number };
export type StudentView = {
  id: string;
  name: string;
  connected: boolean;
  status: Status;
  reason: string | null;
  focusFlags: number;
};

export type Pulse = Omit<TimelineSample, "checkInId"> & {
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
  rejoinKey: string; // keep with studentId; both are needed to reconnect as this student
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

export type Confidence = "guess" | "fairly-sure" | "certain";
export type Quadrant = "mastered" | "fragile" | "blindspot" | "aware";

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
export type Pair = {
  pairId: string;
  explainer: PairPerson;
  listener: PairPerson;
};
export type PairAssigned = {
  pairId: string;
  partner: PairPerson;
  role: "explainer" | "listener";
  questionId: string;
};

export type Calibration =
  | "well-calibrated"
  | "overconfident"
  | "underconfident"
  | "no-data";
export type CalibrationCard = {
  studentId: string;
  accuracy: number | null;
  avgConfidence: number | null;
  calibration: Calibration;
  illusionGap: number | null;
  score: number | null;
};
export type AnswerReveal = {
  questionId: string;
  selectedOptionId: string;
  selectedOptionText: string;
  correctOptionId: string;
  correctOptionText: string;
  confidence: Confidence;
  correct: boolean;
};

// ---- Accounts ----

export type Role = "teacher" | "student";

export type AccountProfile = {
  id: string;
  role: Role;
  displayName: string;
  email: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // ms since epoch
};

// What POST /auth/signup, /auth/login and /auth/refresh return.
export type AuthResult = { session: AuthTokens; profile: AccountProfile };

// ---- History & progress (GET /me/...) ----
// Accuracy and calibration always use each student's FIRST attempt at a question (round 1): a
// re-check comes after peer discussion, so it measures what they learned, not what they knew.

export type CalibrationStats = {
  answered: number;
  accuracy: number | null; // % correct
  avgConfidence: number | null; // 0-100
  calibration: Calibration;
  illusionGap: number | null; // avgConfidence - accuracy
  score: number | null;
};

// GET /me/classes (teacher): one row per class they ran, newest first.
export type ClassListItem = {
  id: string;
  code: string;
  title: string;
  status: string; // "active" | "ended"
  createdAt: string;
  endedAt: string | null;
  studentCount: number;
  questionCount: number;
  firstTryAccuracy: number | null;
  blindspotCount: number; // confident-and-wrong first attempts
};

export type ClassStudent = CalibrationStats & {
  id: string;
  name: string;
  signedIn: boolean;
  blindspots: number;
};

export type ClassQuestionRound = {
  round: number;
  answered: number;
  correctPct: number | null;
  counts: QuadrantCounts;
};

export type ClassQuestion = {
  id: string;
  topic: string;
  prompt: string;
  startedAt: string;
  options: PublicQuestionOption[];
  correctOptionId: string;
  optionCounts: Record<string, number>; // first attempts per option
  rounds: ClassQuestionRound[]; // round 1, then each re-check
};

export type ClassCheckIn = {
  topic: string;
  startedAt: string;
  endedAt: string | null;
  pct: number | null;
  green: number;
  yellow: number;
  red: number;
  unmarked: number;
};

// GET /me/classes/:id (teacher): the class summary page.
export type ClassDetail = {
  id: string;
  code: string;
  title: string;
  status: string;
  createdAt: string;
  endedAt: string | null;
  totals: {
    students: number;
    questions: number;
    answers: number;
    firstTryAccuracy: number | null;
    illusionGap: number | null;
  };
  students: ClassStudent[];
  questions: ClassQuestion[];
  checkIns: ClassCheckIn[];
};

export type ProgressClass = CalibrationStats & {
  sessionId: string;
  title: string;
  date: string;
};

export type ProgressTopic = {
  topic: string;
  answered: number;
  accuracy: number | null;
  blindspots: number;
};

// GET /me/progress (student).
export type StudentProgress = {
  overall: CalibrationStats;
  classes: ProgressClass[]; // oldest first: the calibration-over-time line
  topics: ProgressTopic[];
};
