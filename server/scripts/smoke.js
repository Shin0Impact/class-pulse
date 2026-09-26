// End-to-end smoke test: starts the server in memory mode, then plays a teacher and 6 students through
// join -> mark colors -> understanding % -> reasons -> check-in -> before/after -> focus mode -> reconnect.
// Run:  npm run smoke
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { io } from 'socket.io-client';
import { EVENTS } from '../../shared/events.js';

const PORT = 3055;
const URL = `http://localhost:${PORT}`;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};

const server = spawn('node', ['src/index.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT), SUPABASE_URL: '', SUPABASE_SERVICE_KEY: '' },
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

  // ---- reconnect flows
  const teacher2 = await connect();
  const rj = await ask(teacher2, EVENTS.TEACHER_REJOIN, { code });
  ok(rj.ok && rj.state.pulse.total === 8, 'teacher can rejoin after a refresh and gets full state');
  ok(rj.state.history.length === 1 && rj.state.history[0].pct === 67 && rj.state.history[0].topic === 'Common denominators', 'history keeps the finished check-in (67%)');
  ok(rj.state.timeline.length >= 4, `timeline has samples for the "where we lost them" chart (${rj.state.timeline.length})`);
  const sBack = await connect();
  const back = await ask(sBack, EVENTS.STUDENT_JOIN, { code, name: 'ignored', studentId: students[5].studentId });
  ok(back.ok && back.studentId === students[5].studentId && back.status === 'yellow' && back.topic === '  common   DENOMINATORS '.trim().replace(/\s+/g, ' '), 'a student reconnects with the same identity, color and topic');

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
