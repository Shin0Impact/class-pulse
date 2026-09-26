# Class Pulse (نبض الصف)

> Students tap how well they follow while the teacher talks. The teacher sees class understanding live and where the class got lost, and fixes it on the spot.

Hackathon: Reimagine Learning | Build window: Sep 26 to Oct 1 | Team: Maher, Malak, Salam, Ramez

**Status (Sat Sep 26):** the starter repo is built and tested (28 server checks plus a real-browser run with a teacher and 4 phones). See `README.md` to run it.

---

## 1. Pitch

**Problem:** A teacher explains to 30 students but has no live signal of who understood and where the class got lost. Students rarely raise a hand. The gap shows up in homework or exams, after the class has moved on.

**Solution:** Students join with a code from any device. While the teacher talks, each student taps 🟢 I follow / 🟡 Not sure / 🔴 I'm lost, any time, and can add one reason (too fast, need an example...). The teacher sees the **class understanding %** live, the color of each student, what would help, and a **timeline of where the class got lost**. After re-explaining, **Check in now** clears the colors, students re-mark, and the app shows the before/after (for example 38% to 88%). No questions, nothing graded: the teacher asks verbally and the app measures how the class feels about it.

**Why it is different:** it is a continuous, no-hand-raising signal with a topic timeline and a measured before/after of re-teaching, not a quiz.

---

## 2. Scope

**Core (the group's idea, all built):**
1. Teacher starts a class and gets a join code; students join from phone or laptop
2. Students mark 🟢 🟡 🔴 at any time, and can change it whenever they like
3. Teacher sees class understanding % live plus each student's color
4. Teacher names the topic being taught; a timeline shows where understanding dropped
5. **Check in now** clears everyone's color so they re-mark after re-teaching, with a live before/after for the same topic
6. Optional one-tap reason after 🟡/🔴 (Too fast, Steps unclear, Need an example, Missing basics), summarized for the teacher
7. Focus mode 🔒: tells the teacher if a student leaves the page (toggle); **Hide names** for the projector

**Stretch (only if the core is polished, pick ONE):**
- Class summary page after the session (lowest topic, top reason, biggest recovery), computed from the data
- Arabic UI strings (names and topics already display right-to-left)
- QR code on the dashboard for joining
- Session history page from Supabase
- Optional AI later: a written summary of the session (not needed for the core)

**Removed from the earlier plan:** quiz questions, lesson files, misconception diagnosis from answers, the "teach the AI student" module, and the AI layer. The app cannot verify verbal answers, so those had nothing to work on.

---

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite, React Router, Tailwind v4 | Team already knows React |
| Realtime | Socket.IO (rooms per class) | Simple, works on any device |
| Backend | Node.js + Express (ES modules) | Matches the fullstack course |
| Storage | **Supabase (Postgres)**, history log only | Shared by all four devs, survives free-host restarts |
| Live state | Server memory | Fast; the database never blocks the class |
| Deploy | Client: Vercel/Netlify. Server: Render/Railway | Free tiers |

---

## 4. Project structure (as built)

```
class-pulse/
├── README.md  PROJECT.md  package.json   (npm workspaces: server + client)
├── docs/  architecture.md  demo-script.md  research.md
├── shared/
│   ├── events.js        # socket events, STATUS, REASONS, WEIGHTS (the client/server contract)
│   └── features.js      # switches: focusMode
├── server/
│   ├── .env.example
│   ├── scripts/smoke.js                       # boots a server, plays a whole class (28 checks)
│   └── src/
│       ├── index.js  config.js
│       ├── db/  schema.sql  supabase.js  store.js
│       ├── routes/  sessions.js
│       ├── socket/  index.js  helpers.js  teacherHandlers.js  studentHandlers.js
│       └── services/
│           ├── sessionService.js   # live state: students, colors, check-ins, timeline, focus
│           ├── pulseService.js     # the understanding %, reasons, live before/after
│           └── views.js            # what teachers and students receive
└── client/src/
    ├── App.jsx  main.jsx
    ├── socket/  socket.js  useSocketEvents.js
    ├── api/  http.js
    ├── hooks/  useFocusMode.js
    ├── pages/
    │   ├── Landing.jsx
    │   ├── teacher/  CreateSession.jsx  Dashboard.jsx
    │   └── student/  Join.jsx  Play.jsx  ColorPicker.jsx
    └── components/  PulseBar  StudentGrid  Timeline  ReasonBars  TopicHistory  BeforeAfterChart  status.js  ui/{Button,Card}
```

---

## 5. The numbers (one formula, shown on screen)

**Class understanding % = (🟢 x 100 + 🟡 x 50 + 🔴 x 0) / students who marked**

- Students who have not marked are excluded and shown as "Not marked"; with nobody marked the value is `null` (a dash), never a fake 0%.
- Advice on screen: 75% and above "Most of the class is with you", 50 to 74 "Part of the class is getting lost", below 50 "Most of the class is lost. Consider slowing down". Thresholds live in `client/src/components/status.js`.
- **Check-in** = one stretch of teaching on a topic. **Check in now** freezes the current one (its topic and %) into the history and starts a fresh one with all colors cleared.
- **Before/after** compares the current check-in with the latest earlier check-in that has the *same topic* (case and spacing ignored), live as students re-mark.

---

## 6. Database (Supabase / Postgres)

Run `server/src/db/schema.sql` once in the Supabase SQL editor. Tables: `sessions`, `students`, `checkins` (topic, counts, pct), `status_events` (every color change with its reason). The server generates UUIDs and uses the service-role key (server only); row level security is on with no policies so the browser can never read the data. Writes are queued in order; errors are logged, never thrown.

---

## 7. Socket contract (`shared/events.js`)

Requests use ack callbacks and return `{ ok, ...data }` or `{ ok:false, error }`.

| Event | Direction | Payload |
|---|---|---|
| `teacher:create` | T to S | `{ title? }` returns `{ code, state }` |
| `teacher:rejoin` | T to S | `{ code }` returns `{ state }` (full snapshot: pulse, history, timeline) |
| `teacher:checkIn` | T to S | `{ topic? }` clears all colors and starts a new check-in |
| `teacher:setFocusMode` | T to S | `{ enabled }` |
| `teacher:endSession` | T to S | `{}` |
| `student:join` | Student to S | `{ code, name, studentId? }` returns `{ studentId, title, topic, checkInId, status, reason, focusMode }` |
| `student:setStatus` | Student to S | `{ status: green / yellow / red, reason? }` (any time) |
| `student:focusEvent` | Student to S | `{ type: 'left' }` (no ack) |
| `session:students` | S to T | `{ students[] }` |
| `pulse:update` | S to T | `{ pct, counts, marked, total, reasons[], perStudent[], comparison, checkIn, t }` |
| `checkin:started` | S to all | students: `{ checkInId, topic }`. Teacher: `{ checkIn, history }` |
| `focus:alert` | S to T | `{ studentId, name, count }` |
| `session:focusMode` / `session:ended` | S to students | `{ enabled }` / `{}` |

---

## 8. Team split

| Person | Owns |
|---|---|
| **Maher** | Server core, deployment |
| **Malak** | `server/src/socket/*`, session and pulse logic, the smoke test |
| **Salam** | `client/src/pages/student/*` (color screen, join flow, phone testing) |
| **Ramez** | `client/src/pages/teacher/*`, `client/src/components/*` (dashboard, timeline, projector view) |

Everyone: feature branches, small PRs, merge to `main` daily, run `npm run smoke` before pushing. If you change an event or payload, change `shared/events.js` and tell the others.

---

## 9. Timeline

| Day | Goal | Done when |
|---|---|---|
| **Sat 26** | Setup | Everyone can run `npm run dev`; Supabase project created; organizers asked about the rules |
| **Sun 27** | Polish core screens | Salam: student screen on real phones (thumb reach, small screens, RTL names). Ramez: dashboard readable from the back of a room |
| **Mon 28** | Deploy + real users | Server and client deployed; try it with a real class or friends; note what confuses people |
| **Tue 29** | Stretch or research | Choose ONE stretch item; fill `docs/research.md` with real cited sources |
| **Wed 30** | Freeze + rehearse | Feature freeze end of day; demo rehearsed on the deployed version; backup video recorded |
| **Thu Oct 1** | Demo | Warm up the server, present, submit |

---

## 10. Demo script

See `docs/demo-script.md` (about 5 minutes, live audience participation, backup video).

---

## 11. Judging map

| Criterion | Weight | How we score |
|---|---|---|
| Technical Implementation | 25% | Realtime sockets, reconnection handling (phones sleep), live derived metrics, automated smoke test, deployed |
| Innovation & Creativity | 20% | Continuous no-hand-raising signal, timeline of where the class got lost, measured before/after of re-teaching |
| Impact & Value | 20% | The teacher adjusts while teaching instead of finding out on the exam; helps shy students |
| UX/UI & Usability | 15% | Join by code, no accounts, 3 big thumb buttons, symbol plus color (accessible), projector-safe names toggle |
| Relevance | 10% | Directly reimagines how a classroom detects learning gaps |
| Presentation & Demo | 10% | Live audience participation, rehearsed script, backup video |
| **Bonus** | +10 | Cited research in `docs/research.md`, honest limits, tested with real users |

---

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| "Students can lie or tap green to look fine" | Say it first: it is a signal for the teacher to check verbally, not a test. Reasons plus the timeline make it richer; the teacher sees "Not marked" too. Test it against a show of hands |
| Judges all tap green in the demo | Backup phones tap yellow/red on cue; make the first minute of the demo confusing on purpose |
| Looks like a plain poll | Lead with the timeline and the before/after, not the color buttons |
| Wifi or server fails during the demo | Backup video, warm the free server first, test on the venue wifi |
| Names of "lost" students on a projector | Hide names toggle (dots only); default is a teacher choice |
| Scope creep | Feature freeze Wednesday; pick ONE stretch item |
| Free hosting cold starts | Open `/health` a few minutes before presenting |
| Beginners blocked | Clear file ownership; `npm run smoke` protects the contract |

---

## 13. Open decisions

- Ask the organizers: is a live demo expected? Any rules on hosting, accounts or AI tools?
- Should names be hidden by default on the teacher screen? (Currently visible, with a "Hide names" checkbox.)
- Are the weights (100 / 50 / 0) and the advice thresholds (75 / 50) right? They are one-line changes.
- Reasons list: keep the four, or let the teacher define their own?
- Which ONE stretch item to pick on Tuesday.
