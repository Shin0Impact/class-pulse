// The contract between client and server: socket event names and shared constants.
// Change a name here and both sides pick it up. Payload shapes are documented in PROJECT.md section 7.

export const EVENTS = {
  // ---- teacher -> server (all use an ack callback: { ok, ...data } or { ok:false, error }) ----
  TEACHER_CREATE: 'teacher:create',            // { title? } -> { code, state }
  TEACHER_REJOIN: 'teacher:rejoin',            // { code } -> { code, state }   (full snapshot, after a refresh)
  TEACHER_CHECK_IN: 'teacher:checkIn',         // { topic? } -> {}   clears everyone's colors, starts a new check-in
  TEACHER_SET_FOCUS_MODE: 'teacher:setFocusMode', // { enabled } -> { focusMode }
  TEACHER_END_SESSION: 'teacher:endSession',   // {} -> {}

  // ---- student -> server ----
  STUDENT_JOIN: 'student:join',                // { code, name, studentId? } -> { studentId, name, title, topic, checkInId, status, reason, focusMode }
  STUDENT_SET_STATUS: 'student:setStatus',     // { status: green|yellow|red, reason? } -> {}   (can be sent at any time)
  STUDENT_FOCUS_EVENT: 'student:focusEvent',   // { type: 'left' }  (focus mode, no ack)

  // ---- server -> clients ----
  SESSION_STUDENTS: 'session:students',        // to teacher: { students: [{ id, name, connected }] }
  PULSE_UPDATE: 'pulse:update',                // to teacher: the live pulse (see pulseService.computePulse)
  CHECK_IN_STARTED: 'checkin:started',         // to students: { checkInId, topic } | to teacher: { checkIn, history }
  FOCUS_ALERT: 'focus:alert',                  // to teacher: { studentId, name, count }
  FOCUS_MODE: 'session:focusMode',             // to students: { enabled }
  SESSION_ENDED: 'session:ended',              // to everyone

  // ---- Blindspot: teacher -> server (same ack convention as above) ----
  // Launches a real question (from a Deck, see deckService.ts). Every student answers a choice
  // AND rates how sure they are of it -- that pairing is the whole idea.
  TEACHER_LAUNCH_QUESTION: 'teacher:launchQuestion',
  // { question: { id, topic, prompt, correctOptionId, options: [{ id, text }] } } -> {}
  // broadcasts QUESTION_STARTED to students (without correctOptionId or any misconception), clears prior answers.

  // Computes pairs from the latest quadrant groups for a question and hands them out.
  TEACHER_PAIR_UP: 'teacher:pairUp',
  // { questionId } -> { pairs: Pair[] }   pairs a confident-wrong student with a confident-right student (pairing.ts)

  // Re-opens the same question after pairing/discussion, to see if minds changed.
  TEACHER_RECHECK: 'teacher:recheck',
  // { questionId } -> {}   clears answers for that question and re-broadcasts QUESTION_STARTED (isRecheck: true)

  // ---- Blindspot: student -> server ----
  // A student's answer to the launched question, plus a confidence rating.
  STUDENT_ANSWER: 'student:answer',
  // { questionId, optionId, confidence: 'guess'|'fairly-sure'|'certain' } -> {}

  // After being paired, the listener rates how clearly their partner explained their reasoning.
  STUDENT_RATE_CLARITY: 'student:rateClarity',
  // { pairId, rating: 1|2|3|4|5 } -> {}

  // ---- Blindspot: server -> clients ----
  // To students: the question is live (mirrors CHECK_IN_STARTED's pattern for the pulse).
  QUESTION_STARTED: 'question:started',
  // { questionId, topic, prompt, options: [{ id, text }], isRecheck?: boolean }

  // To the teacher: the live 2x2 quadrant breakdown for the current question (quadrant.ts).
  BLINDSPOT_UPDATE: 'blindspot:update',
  // { questionId, groups: { mastered, fragile, blindspot, aware }: QuadrantStudent[], counts: {...}, illusionGap, headline }

  // To a paired student: who they were paired with and what to do.
  PAIR_ASSIGNED: 'pair:assigned',
  // { pairId, partner: { id, name }, role: 'explainer'|'listener', questionId }
  // explainer = was confident and wrong (defends their reasoning); listener = was confident and right.

  // To the teacher (and optionally the pair): a per-student calibration summary after a question/recheck cycle.
  CALIBRATION_CARD: 'calibration:card',
  // { studentId, accuracy, avgConfidence, calibration: 'well-calibrated'|'overconfident'|'underconfident'|'no-data', illusionGap }
} as const;

// What a student can mark, and what the teacher sees for someone who has not marked yet.
export const STATUS = {
  GREEN: 'green',     // "I follow"
  YELLOW: 'yellow',   // "Not sure"
  RED: 'red',         // "I'm lost"
  WAITING: 'waiting', // has not marked anything in this check-in
};

// Optional one-tap reasons a student can add after choosing yellow or red.
export const REASONS = [
  { id: 'too-fast', label: 'Too fast' },
  { id: 'unclear-steps', label: 'Steps unclear' },
  { id: 'need-example', label: 'Need an example' },
  { id: 'missing-basics', label: 'Missing basics' },
];

// Class understanding % = (green x 100 + yellow x 50 + red x 0) / students who marked
export const WEIGHTS = { green: 100, yellow: 50, red: 0 };

// How sure a student is of their answer. This confidence, crossed with correctness, is the whole idea.
export const CONFIDENCE = {
  GUESS: 'guess',           // "I'm not sure"
  FAIRLY_SURE: 'fairly-sure',
  CERTAIN: 'certain',
} as const;

// The 2x2 quadrant every answered student falls into (correctness x confidence).
export const QUADRANTS = {
  MASTERED: 'mastered',     // confident and correct: actually knows it
  FRAGILE: 'fragile',       // correct but unsure: got it right without trusting themselves
  BLINDSPOT: 'blindspot',   // confident and wrong: the dangerous one, thinks they know but don't
  AWARE: 'aware',           // unsure and wrong: knows they don't know
} as const;
