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
  // The students' own words from "Other" (anonymous, de-duplicated). The bars only carry a count.
  otherNotes: string[];
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
  // The live question and its latest AI summary, so a refreshed dashboard/present page picks up where it was.
  question:
    | (PublicQuestion & { closed: boolean; correctOptionId: string })
    | null;
  blindspot: BlindspotUpdate | null;
  summary: ClassConfusionSummary | null;
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
  // The live question if it's still open (so a late joiner or a refreshed phone sees it), and
  // whether this student already answered it this round.
  question: PublicQuestion | null;
  answered: boolean;
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
  kind: "mcq" | "open"; // open: answer in words, no options
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
  launchKey?: string; // this launch + round; matches SUMMARY_UPDATE.launchKey
  kind?: "mcq" | "open";
  closed?: boolean; // the teacher closed the question: no more answers
  responses?: number; // how many students answered this round
  // Open questions have no quadrant: the teacher sees the answers themselves.
  openAnswers?: Array<{
    id: string;
    name: string;
    text: string;
    confidence: Confidence;
  }>;
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
  kind: "mcq" | "open";
  source: string; // deck | ai | teacher
  topic: string;
  prompt: string;
  startedAt: string;
  options: PublicQuestionOption[];
  correctOptionId: string;
  optionCounts: Record<string, number>; // first attempts per option
  rounds: ClassQuestionRound[]; // round 1, then each re-check (multiple choice only)
  openAnswers: Array<{ name: string; text: string; confidence: Confidence }>; // open questions
  summary: ClassConfusionSummary | null; // the newest AI summary of this question
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

// ---- AI: generated questions & class-confusion summaries ----

export type QuestionKind = "mcq" | "open";

// What the teacher reviews (and can edit) before launching. Never sent to students as-is.
export type QuestionDraft = {
  id: string;
  kind: QuestionKind;
  topic: string;
  prompt: string;
  options: PublicQuestionOption[]; // [] for an open question
  correctOptionId: string; // "" for an open question
  // For the teacher: the mistake each wrong option stands for (by option id).
  optionNotes: Record<string, string>;
  modelAnswer: string; // open questions: what a good answer says ("" otherwise)
  rubric?: {
    keyIdeas: string[];
    misconceptions: Array<{ label: string; phrases: string[] }>;
  };
  source: "ai" | "teacher" | "deck";
  provider?: string; // which AI model wrote it
};

// Where a question came from in the lesson, kept with it so the summary can point back there.
export type LessonContext = {
  documentName?: string;
  page?: number;
  excerpt?: string; // the page's text (trimmed)
};

export type ClassConfusionSummary = {
  questionId: string;
  answered: number;
  headline: string; // one sentence: how the class did
  confusions: Array<{ issue: string; detail: string }>; // up to 3, most common first
  reteach: boolean; // worth going over this part again?
  suggestion: string; // what to repeat / how
  provider: string;
  createdAt: number;
};

// A teacher's uploaded lesson file (GET /documents).
export type DocumentInfo = {
  id: string;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
  lastUsedAt: string;
};
// ---- G9: Class Feedback ----

export type ClassFeedback = {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  anonymous: boolean;
  studentName: string | null;
  createdAt: number;
};

export type ClassFeedbackSummary = {
  averageRating: number | null;
  totalResponses: number;
  feedback: ClassFeedback[];
};
