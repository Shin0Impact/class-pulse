// The contract between client and server: socket event names and shared constants.
// Change a name here and both sides pick it up. Payload shapes are documented in PROJECT.md section 7.

export const EVENTS = {
  // ---- teacher -> server ----
  TEACHER_CREATE: "teacher:create",
  TEACHER_REJOIN: "teacher:rejoin",
  TEACHER_CHECK_IN: "teacher:checkIn",
  TEACHER_SET_FOCUS_MODE: "teacher:setFocusMode",
  TEACHER_END_SESSION: "teacher:endSession",

  // ---- student -> server ----
  STUDENT_JOIN: "student:join",
  STUDENT_SET_STATUS: "student:setStatus",
  STUDENT_FOCUS_EVENT: "student:focusEvent",

  // ---- server -> clients ----
  SESSION_STUDENTS: "session:students",
  PULSE_UPDATE: "pulse:update",
  CHECK_IN_STARTED: "checkin:started",
  FOCUS_ALERT: "focus:alert",
  FOCUS_MODE: "session:focusMode",
  SESSION_ENDED: "session:ended",

  // =====================================================
  // Blindspot — teacher -> server
  // =====================================================

  TEACHER_LAUNCH_QUESTION: "teacher:launchQuestion",

  // Computes pairs from the latest quadrant groups.
  TEACHER_PAIR_UP: "teacher:pairUp",

  // Stops answers for the current live question.
  TEACHER_CLOSE_QUESTION: "teacher:closeQuestion",

  // Asks AI for a class-confusion summary.
  TEACHER_SUMMARIZE: "teacher:summarize",

  // Re-opens the same question after discussion.
  TEACHER_RECHECK: "teacher:recheck",

  // =====================================================
  // Blindspot — student -> server
  // =====================================================

  STUDENT_ANSWER: "student:answer",

  // Student rates how clearly their partner explained.
  STUDENT_RATE_CLARITY: "student:rateClarity",

  // =====================================================
  // Blindspot — server -> clients
  // =====================================================

  QUESTION_STARTED: "question:started",

  ANSWER_REVEAL: "answer:reveal",

  QUESTION_CLOSED: "question:closed",

  SUMMARY_UPDATE: "summary:update",

  BLINDSPOT_UPDATE: "blindspot:update",

  PAIR_ASSIGNED: "pair:assigned",

  CALIBRATION_CARD: "calibration:card",

  // =====================================================
  // G9 — Class Feedback
  // =====================================================

  // Teacher asks students to rate the class.
  TEACHER_REQUEST_FEEDBACK: "teacher:requestFeedback",

  // Student sends stars + comment + privacy preference.
  STUDENT_SUBMIT_FEEDBACK: "student:submitFeedback",

  // Server tells students that feedback is now open.
  FEEDBACK_REQUESTED: "feedback:requested",

  // Server sends updated feedback results to teacher.
  FEEDBACK_UPDATE: "feedback:update",

  // =====================================================
  // Quiz (student-paced)
  // =====================================================

  TEACHER_START_QUIZ: "teacher:startQuiz",
  TEACHER_CLOSE_QUIZ: "teacher:closeQuiz",
  STUDENT_QUIZ_ANSWER: "student:quizAnswer",
  STUDENT_QUIZ_SUBMIT: "student:quizSubmit",
  QUIZ_STARTED: "quiz:started",
  QUIZ_CLOSED: "quiz:closed",
  QUIZ_UPDATE: "quiz:update",
} as const;

// =====================================================
// Student understanding status
// =====================================================

export const STATUS = {
  GREEN: "green",
  YELLOW: "yellow",
  RED: "red",
  WAITING: "waiting",
} as const;

// =====================================================
// Optional reasons for yellow / red
// =====================================================

export const REASONS = [
  {
    id: "too-fast",
    label: "Too fast",
  },
  {
    id: "unclear-steps",
    label: "Steps unclear",
  },
  {
    id: "need-example",
    label: "Need an example",
  },
  {
    id: "missing-basics",
    label: "Missing basics",
  },
] as const;

// =====================================================
// Custom / Other reason
// =====================================================

// Student can type their own reason.
// Stored as:
//
// other:<student text>
//
// This means the existing reason field can still be used
// without changing the rest of the application.

export const CUSTOM_REASON_PREFIX = "other:";

export const CUSTOM_REASON_MAX = 160;

export const OTHER_REASON_ID = "other";

export const isCustomReason = (
  reason: string | null | undefined,
): reason is string =>
  typeof reason === "string" && reason.startsWith(CUSTOM_REASON_PREFIX);

export const customReasonText = (reason: string): string =>
  reason.slice(CUSTOM_REASON_PREFIX.length).trim();

// =====================================================
// Understanding percentage weights
// =====================================================

// green = understands
// yellow = partially understands
// red = lost

export const WEIGHTS = {
  green: 100,
  yellow: 50,
  red: 0,
} as const;

// =====================================================
// Blindspot confidence
// =====================================================

export const CONFIDENCE = {
  GUESS: "guess",
  FAIRLY_SURE: "fairly-sure",
  CERTAIN: "certain",
} as const;

// =====================================================
// Blindspot quadrants
// =====================================================

export const QUADRANTS = {
  // Correct + confident
  MASTERED: "mastered",

  // Correct + unsure
  FRAGILE: "fragile",

  // Wrong + confident
  BLINDSPOT: "blindspot",

  // Wrong + unsure
  AWARE: "aware",
} as const;
