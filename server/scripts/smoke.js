// End-to-end smoke test: starts the server in memory mode, then plays a teacher and 6 students through
// join -> mark colors -> understanding % -> reasons -> check-in -> before/after -> focus mode ->
// the Blindspot loop (launch question -> answer -> quadrants -> pair up -> rate clarity -> recheck
// -> calibration cards) -> reconnect.
// Run:  npm run smoke
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { io } from 'socket.io-client';
import { EVENTS, CONFIDENCE } from '../../shared/events.js';

const PORT = 3055;
const URL = `http://localhost:${PORT}`;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};

const server = spawn('npx', ['tsx', 'src/index.ts'], { shell: process.platform === 'win32', cwd: root,
  env: { ...process.env, PORT: String(PORT), SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '', GEMINI_API_KEY: '', ANTHROPIC_API_KEY: '' }, // no database, no AI: the test must not depend on your .env
  stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise((resolve, reject) => {
  server.stdout.on('data', (d) => d.toString().includes('Class Pulse server') && resolve());
  setTimeout(() => reject(new Error('server did not start')), 8000);
});

const connect = () => new Promise((res) => { const s = io(URL, { transports: ['websocket'] }); s.on('connect', () => res(s)); });
const ask = (s, ev, payload = {}) => new Promise((res) => s.emit(ev, payload, res));
const waitFor = (s, ev, pred = () => true, ms = 4000) =>
  new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(`timeout waiting for ${ev}`)), ms);
    const fn = (data) => { if (pred(data)) { clearTimeout(t); s.off(ev, fn); res(data); } };
    s.on(ev, fn);
  });
const lastPulse = (s) => { let p = null; s.on(EVENTS.PULSE_UPDATE, (x) => (p = x)); return () => p; };
const lastOf = (s, ev) => { let last = null; s.on(ev, (x) => (last = x)); return () => last; };

try {
  // ---- teacher creates a class
  const teacher = await connect();
  const created = await ask(teacher, EVENTS.TEACHER_CREATE, { title: 'Fractions, period 3' });
  ok(created.ok && /^\d{4}$/.test(created.code), `teacher created class ${created.code}`);
  ok(created.state.pulse.pct === null && created.state.pulse.total === 0, 'before anyone marks, understanding is "no data" (null), not a fake 0%');
  const code = created.code;
  const pulse = lastPulse(teacher);

  // ---- students join; the teacher must see them arrive before anyone marks a color
  let maxSeen = 0;
  teacher.on(EVENTS.PULSE_UPDATE, (p) => { maxSeen = Math.max(maxSeen, p.total); });
  const names = ['Amal', 'Bilal', 'Chris', 'Dana', 'Eli', 'Fadi'];
  const students = [];
  for (const name of names) {
    const s = await connect();
    const r = await ask(s, EVENTS.STUDENT_JOIN, { code, name });
    s.studentId = r.studentId;
    s.rejoinKey = r.rejoinKey;
    students.push(s);
  }
  await new Promise((r) => setTimeout(r, 200));
  ok(maxSeen === 6, `teacher sees all 6 students join before any color is marked (saw ${maxSeen})`);
  ok((await ask(await connect(), EVENTS.STUDENT_JOIN, { code: '0000', name: 'X' })).ok === false, 'joining with a wrong code is rejected');
  const dup = await ask(await connect(), EVENTS.STUDENT_JOIN, { code, name: 'amal' });
  ok(dup.ok && dup.name === 'amal 2', 'duplicate names get a suffix');
  const twice = await ask(students[0], EVENTS.STUDENT_JOIN, { code, name: 'Amal' });
  ok(twice.ok && twice.studentId === students[0].studentId, 'the same connection joining twice is still one student');
  const outsider = await connect(); // 8th, but never marks: must not count toward the percentage
  await ask(outsider, EVENTS.STUDENT_JOIN, { code, name: 'Quiet' });

  // ---- teacher names the topic and checks in; students see it
  const topicSeen = students.map((s) => waitFor(s, EVENTS.CHECK_IN_STARTED));
  ok((await ask(teacher, EVENTS.TEACHER_CHECK_IN, { topic: 'Common denominators' })).ok, 'teacher started a check-in');
  const seen = await Promise.all(topicSeen);
  ok(seen.every((s) => s.topic === 'Common denominators'), 'every student sees the topic being checked');

  // ---- students mark colors: 3 green, 1 yellow, 2 red -> (300 + 50) / 6 = 58
  const marks = [['green'], ['green'], ['green'], ['yellow', 'need-example'], ['red', 'too-fast'], ['red', 'need-example']];
  for (let i = 0; i < 6; i++) {
    const r = await ask(students[i], EVENTS.STUDENT_SET_STATUS, { status: marks[i][0], reason: marks[i][1] });
    if (!r.ok) ok(false, `marking failed for student ${i}: ${r.error}`);
  }
  await new Promise((r) => setTimeout(r, 200));
  let p = pulse();
  ok(p.counts.green === 3 && p.counts.yellow === 1 && p.counts.red === 2, `counts: 3 green, 1 yellow, 2 red (got ${p.counts.green}/${p.counts.yellow}/${p.counts.red})`);
  ok(p.pct === 58 && p.marked === 6, `class understanding is 58% over the 6 who marked (got ${p.pct}% over ${p.marked})`);
  ok(p.total === 8 && p.counts.waiting === 2, 'students who have not marked are shown as waiting and excluded from the %');
  ok(p.reasons[0].id === 'need-example' && p.reasons[0].count === 2, 'the most common reason is "need an example" (2)');
  ok(p.pct !== null && p.comparison === null, 'no before/after yet on the first check-in of a topic');

  // ---- validation
  ok(!(await ask(students[0], EVENTS.STUDENT_SET_STATUS, { status: 'purple' })).ok, 'an invalid color is rejected');
  ok(!(await ask(students[3], EVENTS.STUDENT_SET_STATUS, { status: 'yellow', reason: 'because' })).ok, 'an invalid reason is rejected');
  const g = await ask(students[0], EVENTS.STUDENT_SET_STATUS, { status: 'green', reason: 'too-fast' });
  await new Promise((r) => setTimeout(r, 100));
  ok(g.ok && pulse().perStudent.find((s) => s.id === students[0].studentId).reason === null, 'green never keeps a reason');
  ok(!(await ask(students[0], EVENTS.TEACHER_CHECK_IN, { topic: 'hack' })).ok, 'a student cannot use teacher controls');

  // ---- "Other": a student writes their own reason
  ok(!(await ask(students[3], EVENTS.STUDENT_SET_STATUS, { status: 'yellow', reason: 'other:   ' })).ok, 'an empty custom reason is rejected');
  const own = await ask(students[3], EVENTS.STUDENT_SET_STATUS, { status: 'yellow', reason: 'other:  I did not get   why we divided ' });
  await new Promise((r) => setTimeout(r, 100));
  p = pulse();
  ok(own.ok && p.otherNotes.includes('I did not get why we divided'), 'a custom reason is cleaned and shown to the teacher in the students\' words');
  ok(p.reasons.find((r) => r.id === 'other')?.count === 1, 'custom reasons are counted as one "Other" bar');
  await ask(students[3], EVENTS.STUDENT_SET_STATUS, { status: 'yellow', reason: 'need-example' }); // back to the earlier state
  await new Promise((r) => setTimeout(r, 100));
  ok(pulse().otherNotes.length === 0, 'the note disappears when the student picks a preset reason again');

  // ---- a student changes their mind mid-lesson (red -> yellow): (300 + 50 + 50) / 6 = 67
  await ask(students[5], EVENTS.STUDENT_SET_STATUS, { status: 'yellow', reason: 'need-example' });
  await new Promise((r) => setTimeout(r, 150));
  ok(pulse().pct === 67, `changing color updates the % live (${pulse().pct}%)`);

  // ---- re-teach, then check in again on the same topic (spacing and case must not matter)
  const cmpP = waitFor(teacher, EVENTS.PULSE_UPDATE, (x) => x.comparison && x.marked === 6);
  await ask(teacher, EVENTS.TEACHER_CHECK_IN, { topic: '  common   DENOMINATORS ' });
  await new Promise((r) => setTimeout(r, 100));
  ok(pulse().pct === null && pulse().counts.waiting === 8, 'check-in clears everyone\'s colors');
  ok(pulse().comparison === null, 'no comparison until someone re-marks');
  const after = [['green'], ['green'], ['green'], ['green'], ['green'], ['yellow']];
  for (let i = 0; i < 6; i++) await ask(students[i], EVENTS.STUDENT_SET_STATUS, { status: after[i][0] });
  const cmp = (await cmpP).comparison;
  ok(cmp.before === 67 && cmp.after === 92 && cmp.delta === 25, `before/after: ${cmp.before}% -> ${cmp.after}% (+${cmp.delta})`);

  // ---- focus mode
  const alertP = waitFor(teacher, EVENTS.FOCUS_ALERT);
  students[1].emit(EVENTS.STUDENT_FOCUS_EVENT, { type: 'left' });
  const alert = await alertP;
  ok(alert.name === 'Bilal' && alert.count === 1, 'focus mode alerts the teacher when a student leaves the page');
  await ask(teacher, EVENTS.TEACHER_SET_FOCUS_MODE, { enabled: false });
  let extra = false;
  teacher.on(EVENTS.FOCUS_ALERT, () => (extra = true));
  students[1].emit(EVENTS.STUDENT_FOCUS_EVENT, { type: 'left' });
  await new Promise((r) => setTimeout(r, 300));
  ok(!extra, 'no alerts once the teacher turns focus mode off');

  // ---- Blindspot: launch a question -> answers -> quadrants -> pair up -> clarity rating -> recheck
  const blindspot = lastOf(teacher, EVENTS.BLINDSPOT_UPDATE);
  const question = {
    id: 'q-fractions-1',
    topic: 'Fractions',
    prompt: '1/2 + 1/3 = ?',
    correctOptionId: 'a',
    options: [{ id: 'a', text: '5/6' }, { id: 'b', text: '2/5' }, { id: 'c', text: '3/5' }],
  };
  const questionSeenP = Promise.all(students.map((s) => waitFor(s, EVENTS.QUESTION_STARTED)));
  const launched = await ask(teacher, EVENTS.TEACHER_LAUNCH_QUESTION, { question });
  ok(launched.ok, 'teacher launched a Blindspot question');
  const questionSeen = await questionSeenP;
  ok(
    questionSeen.every((q) => q.questionId === 'q-fractions-1' && !('correctOptionId' in q) && !q.isRecheck),
    'students receive the question with no correct answer attached',
  );
  await new Promise((r) => setTimeout(r, 100));
  ok(blindspot().counts.mastered === 0 && blindspot().counts.blindspot === 0, 'the dashboard resets to an empty board right after launch');

  // Amal: correct+certain (mastered). Bilal: correct+guess (fragile).
  // Chris & Dana: both pick "2/5" confidently -- the shared blindspot. Eli: wrong+guess (aware). Fadi never answers.
  const answers = [
    { i: 0, optionId: 'a', confidence: CONFIDENCE.CERTAIN },
    { i: 1, optionId: 'a', confidence: CONFIDENCE.GUESS },
    { i: 2, optionId: 'b', confidence: CONFIDENCE.CERTAIN },
    { i: 3, optionId: 'b', confidence: CONFIDENCE.FAIRLY_SURE },
    { i: 4, optionId: 'c', confidence: CONFIDENCE.GUESS },
  ];
  for (const a of answers) {
    const r = await ask(students[a.i], EVENTS.STUDENT_ANSWER, { questionId: 'q-fractions-1', optionId: a.optionId, confidence: a.confidence });
    if (!r.ok) ok(false, `answer failed for student ${a.i}: ${r.error}`);
  }
  await new Promise((r) => setTimeout(r, 200));
  const b = blindspot();
  ok(
    b.counts.mastered === 1 && b.counts.fragile === 1 && b.counts.blindspot === 2 && b.counts.aware === 1,
    `quadrant counts: 1 mastered, 1 fragile, 2 blindspot, 1 aware (got ${JSON.stringify(b.counts)})`,
  );
  ok(b.illusionGap === 20, `illusion gap is 20 points -- 60% felt confident, 40% were actually correct (got ${b.illusionGap})`);
  ok(b.groups.blindspot.every((s) => s.optionId === 'b'), 'both blindspot students share the same wrong belief ("2/5")');
  ok(/2 students? confidently chose/.test(b.headline), `headline names the shared wrong belief (got "${b.headline}")`);

  // ---- pair up: each blindspot student gets paired with a confident-and-right classmate
  const pairEvents = [];
  for (const s of students) s.on(EVENTS.PAIR_ASSIGNED, (data) => pairEvents.push({ studentId: s.studentId, ...data }));
  const paired = await ask(teacher, EVENTS.TEACHER_PAIR_UP, {});
  ok(paired.ok && paired.pairs.length === 2, `teacher paired up both blindspot students (got ${paired.pairs?.length} pair(s))`);
  await new Promise((r) => setTimeout(r, 150));
  ok(pairEvents.length === 4, `pair:assigned is delivered privately -- Amal gets one per pair she's reused in (got ${pairEvents.length})`);
  const chrisPair = pairEvents.find((e) => e.studentId === students[2].studentId);
  const danaPair = pairEvents.find((e) => e.studentId === students[3].studentId);
  ok(chrisPair && danaPair, 'both blindspot students (Chris, Dana) were paired');
  const amalPairs = pairEvents.filter((e) => e.studentId === students[0].studentId);
  ok(amalPairs.length === 2, `the lone confident-and-right student (Amal) is reused across both pairs (got ${amalPairs.length})`);
  ok(!pairEvents.some((e) => e.studentId === students[1].studentId), 'the fragile student (correct but unsure) is never pulled into pairing');

  // ---- clarity rating: only the student on the "listener" side of the pair may rate it
  const listenerEvent = pairEvents.find((e) => e.role === 'listener' && e.studentId === students[2].studentId);
  const explainerEvent = pairEvents.find((e) => e.role === 'explainer' && e.studentId === students[0].studentId && e.pairId === listenerEvent.pairId);
  ok(listenerEvent && explainerEvent, 'the pair has one explainer side and one listener side');
  const rated = await ask(students[2], EVENTS.STUDENT_RATE_CLARITY, { pairId: listenerEvent.pairId, rating: 4 });
  ok(rated.ok, 'the listener rates how clearly their partner explained');
  const selfRate = await ask(students[0], EVENTS.STUDENT_RATE_CLARITY, { pairId: listenerEvent.pairId, rating: 5 });
  ok(!selfRate.ok, 'the other half of the pair cannot rate it');
  const outOfRange = await ask(students[2], EVENTS.STUDENT_RATE_CLARITY, { pairId: listenerEvent.pairId, rating: 9 });
  ok(!outOfRange.ok, 'a rating outside 1-5 is rejected');

  // ---- recheck: everyone who answered gets a private calibration card, then round 2 starts clean
  const cardsP = Promise.all(answers.map((a) => waitFor(students[a.i], EVENTS.CALIBRATION_CARD)));
  const recheckSeenP = Promise.all(students.map((s) => waitFor(s, EVENTS.QUESTION_STARTED, (q) => q.isRecheck === true)));
  const rechecked = await ask(teacher, EVENTS.TEACHER_RECHECK, {});
  ok(rechecked.ok, 'teacher rechecked the question for round 2');
  const cards = await cardsP;
  ok(cards[0].calibration === 'well-calibrated' && cards[0].score === 100, `correct+certain scores well-calibrated, 100 (got ${JSON.stringify(cards[0])})`);
  ok(cards[2].calibration === 'overconfident' && cards[2].score === 0, `wrong+certain scores overconfident, 0 (got ${JSON.stringify(cards[2])})`);
  const recheckSeen = await recheckSeenP;
  ok(recheckSeen.every((q) => q.questionId === 'q-fractions-1'), 'round 2 re-broadcasts the same question, marked isRecheck');
  await new Promise((r) => setTimeout(r, 100));
  ok(blindspot().counts.mastered === 0 && blindspot().counts.blindspot === 0, 'round 2 starts with a clean quadrant board');

  // ---- reconnect flows
  const teacher2 = await connect();
  const rj = await ask(teacher2, EVENTS.TEACHER_REJOIN, { code });
  ok(rj.ok && rj.state.pulse.total === 8, 'teacher can rejoin after a refresh and gets full state');
  ok(rj.state.history.length === 1 && rj.state.history[0].pct === 67 && rj.state.history[0].topic === 'Common denominators', 'history keeps the finished check-in (67%)');
  ok(rj.state.timeline.length >= 4, `timeline has samples for the "where we lost them" chart (${rj.state.timeline.length})`);
  const sBack = await connect();
  const back = await ask(sBack, EVENTS.STUDENT_JOIN, { code, name: 'ignored', studentId: students[5].studentId, rejoinKey: students[5].rejoinKey });
  ok(back.ok && back.studentId === students[5].studentId && back.status === 'yellow' && back.topic === '  common   DENOMINATORS '.trim().replace(/\s+/g, ' '), 'a student reconnects with the same identity, color and topic');
  // A classmate knows Amal's studentId (pair:assigned carries it) but not her rejoinKey.
  const sImpostor = await connect();
  const impostor = await ask(sImpostor, EVENTS.STUDENT_JOIN, { code, name: 'Mallory', studentId: students[0].studentId });
  ok(impostor.ok && impostor.studentId !== students[0].studentId, "a studentId without its rejoinKey can't take over that student");

  // ---- open question (answered in words) + Close. CI has no AI keys, so no summary here.
  const openStarted = waitFor(students[1], EVENTS.QUESTION_STARTED, (q) => q.questionId === 'open-1');
  const launchedOpen = await ask(teacher2, EVENTS.TEACHER_LAUNCH_QUESTION, {
    question: { id: 'open-1', kind: 'open', prompt: 'Why do we need a common denominator to add fractions?' },
  });
  const openQ = await openStarted;
  ok(launchedOpen.ok && openQ.kind === 'open' && openQ.options.length === 0, 'an open question reaches students with no options');
  const openUpdate = waitFor(teacher2, EVENTS.BLINDSPOT_UPDATE, (u) => u.questionId === 'open-1' && u.responses === 1);
  const wrote = await ask(students[1], EVENTS.STUDENT_ANSWER, { questionId: 'open-1', text: 'so the pieces are the same size', confidence: 'fairly-sure' });
  const openSeen = await openUpdate;
  ok(wrote.ok && openSeen.openAnswers[0].text === 'so the pieces are the same size', 'the teacher sees the written answer live');
  const pairOpen = await ask(teacher2, EVENTS.TEACHER_PAIR_UP);
  ok(!pairOpen.ok, 'pair up is refused for an open question');
  const closedForStudents = waitFor(students[2], EVENTS.QUESTION_CLOSED, (c) => c.questionId === 'open-1');
  const closed = await ask(teacher2, EVENTS.TEACHER_CLOSE_QUESTION, { language: 'en' });
  await closedForStudents;
  ok(closed.ok && closed.summarizing === false, 'close works without AI (and says no summary is coming)');
  const late = await ask(students[2], EVENTS.STUDENT_ANSWER, { questionId: 'open-1', text: 'too late', confidence: 'guess' });
  ok(!late.ok && /closed/.test(late.error), 'answers after Close are refused');
  const summarize = await ask(teacher2, EVENTS.TEACHER_SUMMARIZE, { language: 'en' });
  ok(!summarize.ok && /not set up/.test(summarize.error), 'summarize explains that AI is not set up');
  const refreshed = await ask(teacher2, EVENTS.TEACHER_REJOIN, { code });
  ok(refreshed.ok && refreshed.state.question?.questionId === 'open-1' && refreshed.state.question.closed, 'a refreshed dashboard gets the live (closed) question back');

  // ---- class feedback (end of class)
  const fbOpened = await ask(teacher2, EVENTS.TEACHER_REQUEST_FEEDBACK);
  ok(fbOpened.ok, 'teacher opened class feedback');
  const sFb = await connect();
  const fbJoin = await ask(sFb, EVENTS.STUDENT_JOIN, { code, name: 'ignored', studentId: students[1].studentId, rejoinKey: students[1].rejoinKey });
  ok(fbJoin.ok && fbJoin.feedbackOpen === true && fbJoin.feedbackSubmitted === false, 'a phone that rejoins after feedback opened still gets the form');
  ok(!(await ask(sFb, EVENTS.STUDENT_SUBMIT_FEEDBACK, { rating: 9 })).ok, 'a rating outside 1-5 is rejected');
  const fbSeen = waitFor(teacher2, EVENTS.FEEDBACK_UPDATE, (u) => u.totalResponses === 1);
  const fbSent = await ask(sFb, EVENTS.STUDENT_SUBMIT_FEEDBACK, { rating: 4, comment: 'more examples please', anonymous: true });
  const fbUpdate = await fbSeen;
  ok(fbSent.ok && fbUpdate.averageRating === 4 && fbUpdate.feedback[0].comment === 'more examples please', 'the teacher sees the rating and comment live');
  ok(fbUpdate.feedback[0].studentName === null && !JSON.stringify(fbUpdate).includes(students[1].studentId), 'anonymous feedback carries no name and no student id');
  const fbAgain = await ask(await connect(), EVENTS.STUDENT_JOIN, { code, name: 'ignored', studentId: students[1].studentId, rejoinKey: students[1].rejoinKey });
  ok(fbAgain.ok && fbAgain.feedbackSubmitted === true, 'after submitting, a refresh does not show the form again');
  const fbTeacher = await ask(teacher2, EVENTS.TEACHER_REJOIN, { code });
  ok(fbTeacher.ok && fbTeacher.state.feedbackOpen === true && fbTeacher.state.feedback.totalResponses === 1, 'a refreshed dashboard gets the feedback panel back');

  // ---- end
  const ended = waitFor(students[2], EVENTS.SESSION_ENDED);
  await ask(teacher2, EVENTS.TEACHER_END_SESSION);
  await ended;
  ok(!(await ask(await connect(), EVENTS.STUDENT_JOIN, { code, name: 'Late' })).ok, 'ended classes cannot be joined');
} catch (e) {
  console.error('ERROR', e.message);
  failures++;
} finally {
  server.kill();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
}
