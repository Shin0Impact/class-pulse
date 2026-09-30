// Load test for a Class Pulse server: N simulated students join one class, tap a status, receive a
// question and answer it, while the teacher's dashboard socket receives every update.
//
//   node server/scripts/loadtest.mjs --url http://localhost:3001 --students 50,100,200
//   node server/scripts/loadtest.mjs --url https://<your>.onrender.com --students 30,60 --token <teacher access token>
//
// Options:
//   --url         server address (default http://localhost:3001)
//   --students    comma list of class sizes to try, in order (default 25,50,100)
//   --ramp        seconds over which students join (default 5; 0 = everyone at once)
//   --token       a teacher's access token (only needed when the server has accounts on)
//   --pid         local server process id: also reports its memory (RSS) after each run
//   --tap         status taps per student during the busy minute (default 3)
//
// It talks to the same socket events the app uses and never touches the database directly, but each
// run creates one throwaway class (with accounts on, it lands in that teacher's history).
import { io } from 'socket.io-client';
import { readFileSync } from 'node:fs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const URL_ = arg('url', 'http://localhost:3001');
const SIZES = arg('students', '25,50,100').split(',').map((n) => Number(n.trim())).filter(Boolean);
const RAMP = Number(arg('ramp', '5'));
const TAPS = Number(arg('tap', '3'));
const TOKEN = arg('token', undefined);
const PID = arg('pid', undefined);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (xs, p) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))] : NaN);
const fmt = (ms) => (Number.isFinite(ms) ? `${Math.round(ms)} ms` : 'n/a');
const rss = () => {
  if (!PID) return null;
  try {
    const kb = Number(readFileSync(`/proc/${PID}/status`, 'utf8').match(/VmRSS:\s+(\d+)/)?.[1]);
    return Math.round(kb / 1024);
  } catch {
    return null;
  }
};

// emit with ack, resolving { ok, ms }
const call = (socket, event, payload) =>
  new Promise((resolve) => {
    const t0 = performance.now();
    socket.timeout(15000).emit(event, payload, (err, res) => resolve({ ok: !err && res?.ok, ms: performance.now() - t0, res, err }));
  });
const connect = () =>
  new Promise((resolve, reject) => {
    const s = io(URL_, { transports: ['websocket'], reconnection: false, forceNew: true });
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
    setTimeout(() => reject(new Error('connect timeout')), 15000);
  });

async function run(n) {
  const out = { n, connectFail: 0, joinFail: 0, joinMs: [], statusMs: [], qMs: [], ansMs: [], ansFail: 0 };
  const teacher = await connect();
  let teacherBytes = 0;
  let teacherEvents = 0;
  let lastTeacherEvent = performance.now();
  teacher.onAny((_e, data) => {
    teacherEvents++;
    teacherBytes += JSON.stringify(data ?? '').length;
    lastTeacherEvent = performance.now();
  });
  const created = await call(teacher, 'teacher:create', { title: `load ${n}`, accessToken: TOKEN });
  if (!created.ok) throw new Error(`could not create a class: ${created.res?.error ?? created.err?.message}. With accounts on, pass --token.`);
  const code = created.res.code;

  // ---- join ----
  const students = [];
  await Promise.all(
    Array.from({ length: n }, async (_, i) => {
      if (RAMP > 0) await sleep(Math.random() * RAMP * 1000);
      let s;
      try {
        s = await connect();
      } catch {
        out.connectFail++;
        return;
      }
      const r = await call(s, 'student:join', { code, name: `S${i}` });
      if (!r.ok) {
        out.joinFail++;
        s.close();
        return;
      }
      out.joinMs.push(r.ms);
      const st = { s, i, got: null };
      s.on('question:started', (q) => (st.got = { q, at: performance.now() }));
      students.push(st);
    }),
  );
  await sleep(1000);
  const mem1 = rss();

  // ---- busy minute: everyone taps a status a few times ----
  await Promise.all(
    students.map(async (st) => {
      for (let k = 0; k < TAPS; k++) {
        await sleep(Math.random() * 1500);
        const status = ['green', 'yellow', 'red'][(st.i + k) % 3];
        const r = await call(st.s, 'student:setStatus', { status, reason: status === 'green' ? undefined : 'too-fast' });
        if (r.ok) out.statusMs.push(r.ms);
      }
    }),
  );
  await sleep(500);

  // ---- launch a question and have everyone answer within a few seconds ----
  const launchAt = performance.now();
  const launch = await call(teacher, 'teacher:launchQuestion', {
    question: {
      id: `q-${Date.now()}`,
      kind: 'mcq',
      topic: 'load',
      prompt: 'Which is bigger?',
      correctOptionId: 'a',
      options: [{ id: 'a', text: '1/2' }, { id: 'b', text: '1/3' }, { id: 'c', text: '1/4' }, { id: 'd', text: '1/5' }],
      source: 'teacher',
    },
  });
  if (!launch.ok) throw new Error(`launch failed: ${launch.res?.error}`);
  await sleep(1500);
  for (const st of students) if (st.got) out.qMs.push(st.got.at - launchAt);
  await Promise.all(
    students.map(async (st) => {
      if (!st.got) return void out.ansFail++;
      await sleep(Math.random() * 3000);
      const r = await call(st.s, 'student:answer', { questionId: st.got.q.questionId, optionId: 'abcd'[st.i % 4], confidence: 'fairly-sure' });
      if (r.ok) out.ansMs.push(r.ms);
      else out.ansFail++;
    }),
  );
  // let the teacher's dashboard finish receiving updates
  while (performance.now() - lastTeacherEvent < 600) await sleep(100);
  out.mem = rss();
  out.mem1 = mem1;
  out.teacherKB = Math.round(teacherBytes / 1024);
  out.teacherEvents = teacherEvents;
  out.joined = students.length;

  await call(teacher, 'teacher:endSession', {});
  for (const st of students) st.s.close();
  teacher.close();
  return out;
}

const rows = [];
for (const n of SIZES) {
  process.stdout.write(`\nRunning ${n} students … `);
  try {
    const r = await run(n);
    rows.push(r);
    console.log('done');
    console.log(`  joined            ${r.joined}/${n}  (connect failures ${r.connectFail}, join failures ${r.joinFail})`);
    console.log(`  join reply        p50 ${fmt(pct(r.joinMs, 50))}   p95 ${fmt(pct(r.joinMs, 95))}   max ${fmt(Math.max(...r.joinMs))}`);
    console.log(`  status tap reply  p50 ${fmt(pct(r.statusMs, 50))}   p95 ${fmt(pct(r.statusMs, 95))}   (${r.statusMs.length} taps)`);
    console.log(`  question arrives  p50 ${fmt(pct(r.qMs, 50))}   p95 ${fmt(pct(r.qMs, 95))}   max ${fmt(Math.max(...r.qMs))}   (${r.qMs.length}/${r.joined} got it)`);
    console.log(`  answer reply      p50 ${fmt(pct(r.ansMs, 50))}   p95 ${fmt(pct(r.ansMs, 95))}   failed ${r.ansFail}`);
    console.log(`  teacher dashboard ${r.teacherEvents} updates, ${r.teacherKB} KB received`);
    if (r.mem) console.log(`  server memory     ${r.mem1} MB after joining, ${r.mem} MB at the end`);
  } catch (e) {
    console.log(`failed: ${e.message}`);
    break;
  }
  await sleep(1500);
}

console.log('\nRule of thumb: replies under ~300 ms (p95) feel instant, over ~1 s feels laggy; any failures mean the size is too big.');
process.exit(0);
