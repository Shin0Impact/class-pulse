# Class Pulse (نبض الصف)

A live-class tool for teachers. Students tap how well they are following **while the teacher talks**, and the teacher sees it instantly: the class understanding %, who is lost, what would help, and where in the lesson the class got lost. Then the app goes one step further and checks what students *actually* understood, because feeling sure and being right are not the same thing.

Built for the Newtech hackathon, theme **Reimagine Learning**. Team: Maher, Malak, Salam, Ramez.

Arabic and English throughout (full right-to-left layout), light and dark mode, phone-first student screens.

## What it does

**1. The live pulse**
- Students join with a 4-digit code (or by scanning a QR code) and tap 🟢 Got it / 🟡 Not sure / 🔴 I'm lost whenever they like. After 🟡 or 🔴 they can add one reason (too fast, need an example, ...).
- The teacher sees the class understanding % (green = 100, yellow = 50, red = 0, averaged over students who marked), each student's color, the top reasons, a timeline, and plain-language advice.
- **Check in now** freezes the current stretch under a topic, clears the colors, and shows the before/after when the same topic is re-checked (for example 38% to 88%).
- Focus mode flags students who leave the page. **Hide names** replaces names with dots for the projector.

**2. The blindspot check (confidence vs. correctness)**
- The teacher launches a question. Students answer and say how sure they are (guess / fairly sure / certain).
- Every answer lands in one of four groups: **mastered**, **fragile** (right but unsure), **aware** (wrong and knows it), **blindspot** (wrong and certain). The teacher sees them on a live quadrant chart and an illusion-gap chart.
- Question types: multiple choice (with a right answer and a per-option misconception) or open questions answered in words.
- **Pair up** matches each blindspot student with a student who mastered the topic so they can explain it to each other, then **Re-check** measures what moved.
- Students get a calibration card after each question: how their confidence compared to their accuracy.

**3. AI for the teacher** (optional, needs an API key)
- Upload lesson files (PDF or images, up to 25 MB). The teacher picks a page and the AI drafts a question about it; the teacher edits it before launching. Questions can also be written by hand or taken from a ready-made deck.
- Generate a whole quiz (multiple choice, open, or mixed) and run it on students' phones.
- An AI summary of what the class is confused about, written from the live data.
- Gemini models are tried first, fastest first; Claude is the backup. Without any key the AI buttons are hidden and everything else works.

**4. Presenting**
- **Present** and **Screen** windows: a clean projector view that stays in sync with the teacher dashboard, including on another device signed into the same teacher account.
- Class feedback: the teacher opens a feedback round, students reply, and the comments can be translated.
- When the class ends, teachers get a class summary.

**5. Accounts** (switch on automatically when Supabase is configured)
- Teachers sign in to start a class and keep every class they ran, with a summary for each.
- Students can sign in or join as guests. Signed-in students get a progress page (confidence vs. accuracy over time, by topic, past classes).
- Pricing and checkout pages exist as a demo only; no real payments.

## Quick start (5 minutes)

Requirements: **Node 24.12 or newer** (see `.node-version`; the server runs `.ts` files directly with no build step) and git. No accounts or API keys are needed to try it.

```bash
git clone <your-repo-url> class-pulse
cd class-pulse
npm install          # installs server AND client (npm workspaces)
npm run dev          # server on :3001, client on :5173
```

Open http://localhost:5173, choose **I'm a teacher**, start a class, then open http://localhost:5173/join in another tab (or on a phone) and join with the code.

**Phones:** the phone and the laptop must be on the same network. Open the "Network" address Vite prints (for example `http://192.168.1.20:5173`) on the phone. The client finds the server on port 3001 of the same machine. Tailscale addresses (100.x and `*.ts.net`) are allowed too.

With no Supabase keys the server keeps everything in memory, accounts are off, and every page still works.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Server and client together, auto-reload (saving a server file restarts the server and drops live classes) |
| `npm run build` | Typecheck and build the client |
| `npm start` | Run the server the way production does |
| `npm run typecheck -w server` | Typecheck the server |
| `npm test` | Unit tests for the pure logic (quadrants, pairing, calibration, rubric, quiz, history) |
| `npm run smoke` | Boots a real server and plays a teacher plus students through the pulse and blindspot loops over sockets. Run before every push |
| `npm run ai:check` | Tries each configured AI model in the order the app uses them and prints which work |
| `node server/scripts/loadtest.mjs --url <server> --students 20,60 [--token <teacher accessToken>]` | Simulates N students in one class against a running server and reports latency and failures (with accounts on, `--token` is required; it creates one throwaway class per run) |

CI (`.github/workflows/CI.yaml`) runs the server typecheck, unit tests, client build, and smoke test on every push.

## Configuration (`server/.env`)

Copy `server/.env.example` to `server/.env`. Everything is optional for local development.

| Variable | Purpose |
|---|---|
| `PORT` | Server port (default 3001) |
| `CLIENT_URL` | Allowed browser origins, comma-separated (your deployed client URL). localhost and local-network addresses are always allowed outside production |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Turns on the database and accounts. The service key stays on the server only |
| `GEMINI_API_KEY` | Free key from https://aistudio.google.com. Models are tried in the order set in `server/src/ai/providers.ts` (fast Flash-Lite first, then Flash); override with `GEMINI_MODELS=a,b` |
| `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` | Backup if Gemini fails or is rate-limited. Default model is Claude Haiku 4.5 |

AI calls and uploads have hourly limits per class and per teacher (`server/src/ai/limits.ts`) so a free key is not burned by accident.

## Database: Supabase (optional, recommended)

1. Create a free project at https://supabase.com.
2. SQL Editor, new query, paste all of `server/src/db/schema.sql`, run. (A brand-new database only needs this file. An older database can be upgraded with `server/src/db/migrations/001_accounts.sql` then `002_ai.sql`; both are safe to re-run.)
3. Project Settings, API: copy the **Project URL** and the **service_role** key into `server/.env`.
4. Restart. `GET /health` reports `db: "supabase"` and `accounts: true`.

Rules: the service key lives only in `server/.env` (git-ignored) and on the hosting dashboard. The browser never talks to Supabase; sign-in goes through the server (`/auth/signup`, `/auth/login`, `/auth/refresh`), there is no confirmation email, and uploaded lesson files go into a private storage bucket the server creates on first use. Live state stays in server memory for speed and the database is a history log: if it is slow or down, the classroom keeps running.

## How it is built

```
shared/            events.ts (socket events and constants), types.ts, features.ts
server/src/
  index.ts         Express + Socket.IO bootstrap, /health
  routes/          auth, me (account data), sessions, documents (lesson files), decks, ai
  socket/          teacherHandlers, studentHandlers, screenHandlers (live protocol)
  services/        session and pulse logic, quadrant, pairing, calibration, quiz, feedback, history,
                   screen relay (syncs the Present/Screen windows across devices)
  ai/              providers (Gemini, Claude), question, quiz and summary generation, limits
  db/              schema.sql, migrations/, store.ts (batched history writes)
server/decks/      ready-made question decks (JSON; format in server/decks/README.md)
client/src/
  pages/           landing, teacher (create, dashboard, present, screen, QR), student (join, play),
                   account (teacher home, class summary, student progress), auth, pricing, checkout
  components/      charts, live stats, AI question studio and file picker, student question flow
  i18n/            Arabic and English strings
  socket/          socket client and event hooks
```

Key decisions:
- **Live state in memory, database as a log.** Updates stay fast and a slow database can never freeze a class. The trade-off: a server restart ends running classes.
- **`shared/events.ts` is the contract** between client and server. Change an event there and tell everyone.
- **Reconnection is first-class.** Phones sleep; a student's id is resent on reconnect and their color and current question come back.
- **Self-reported plus verified.** The pulse is a cheap continuous signal; the blindspot check is where the app tests it against answers.

More detail in `docs/architecture.md`, the research and evidence in `docs/research.md`, and a demo walkthrough in `docs/demo-script.md`. `PROJECT.md` is the original hackathon plan; parts of it (and of `docs/architecture.md`) describe the first version and are older than this README.

## Deploying

The client and server deploy separately: the server needs the client's URL (for CORS) and the client needs the server's URL (for the socket).

**Server on Render** (`render.yaml` is a Blueprint that pre-fills this)
1. New, Web Service (or Blueprint on this repo). Root directory is the repo root. Build `npm install`, start `npm run start -w server`, health check `/health`.
2. Environment: `NODE_ENV=production`, `NODE_VERSION=24.12.0` (**required**), `CLIENT_URL`, and optionally `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`.
3. Check `https://<your-service>.onrender.com/health`.

**Client on Netlify or Vercel**
1. Root directory `client`, build `npm run build`, output `dist`. The client imports `../shared`, so on Vercel enable "Include files outside the root directory in the Build Step". Routes are rewritten to `index.html` (`client/public/_redirects` for Netlify, `client/vercel.json` for Vercel).
2. Set `VITE_SERVER_URL=https://<your-service>.onrender.com`.
3. Put the real client URL into `CLIENT_URL` on Render (no trailing slash) and let it redeploy.

**Free-tier notes**
- Render free spins down after 15 minutes idle (the next request takes a while) and can restart at any time, which ends live classes. Open `<server-url>/health` a few minutes before a demo.
- Do not edit server files while a class is running locally (`tsx watch` restarts the server).
- Load test: the server held 1000 simulated students in a local test with no failures, and a run against Render free passed at 20, 60 and 80 students. Real limits depend on the host's CPU and the room's Wi-Fi.

## Team workflow

- Branches `feature/<name>-<thing>`, small pull requests, merge to `main` often.
- Never commit `.env`. Run `npm test` and `npm run smoke` before pushing.
