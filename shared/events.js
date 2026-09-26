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
};

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
