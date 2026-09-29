# Class Pulse (نبض الصف)

Students tap how well they are following (🟢 I follow, 🟡 Not sure, 🔴 I'm lost) **while the teacher talks**. The teacher sees the **class understanding %** live, who is lost, what would help, and a timeline of where the class got lost, so they can slow down or repeat without anyone raising a hand. After re-explaining, **Check in now** clears the colors and shows the before/after (for example 38% to 88%).

Nothing is graded and there are no questions in the app: the teacher asks out loud and the students report how they feel about it.

Full plan, event contract, timeline and demo script: **[PROJECT.md](PROJECT.md)**.

## Quick start (5 minutes)

Requirements: **Node 20+** and git. No accounts or API keys needed.

```bash
git clone <your-repo-url> class-pulse
cd class-pulse
npm install          # installs server AND client (npm workspaces)
npm run dev          # server on :3001, client on :5173
```

Open http://localhost:5173, click **I'm a teacher**, **Start class**. Open http://localhost:5173/join in another tab (or on a phone) and join with the 4-digit code.

**Testing with phones:** phones and laptop must be on the same wifi. Open the "Network" address Vite prints (for example `http://192.168.1.20:5173`) on the phone. The client finds the server on port 3001 of the same machine automatically.

## How it works (in 30 seconds)

1. Teacher starts a class, gets a code. Students join from any device.
2. Teacher types the topic ("Common denominators") and taps **Check in now**.
3. While the teacher teaches, each student taps their color any time. After 🟡 or 🔴 they can add one optional reason (Too fast, Steps unclear, Need an example, Missing basics).
4. The dashboard shows: class understanding % (🟢 counts 100, 🟡 counts 50, 🔴 counts 0, averaged over students who marked), the color of each student, the top reasons, a timeline, and advice ("Most of the class is lost. Consider slowing down").
5. Teacher re-explains and taps **Check in now** with the same topic: colors clear, students re-mark, and the before/after appears live.
6. 🔒 Focus mode (toggle): tells the teacher if a student leaves the page. **Hide names** replaces names with colored dots for the projector.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Server + client together, auto-reload |
| `npm run smoke` | Boots a server and plays a whole class through it (28 checks). **Run before every push.** |
| `npm run build` | Production build of the client |

## Database: Supabase (optional but recommended)

Without it, the server keeps everything in memory (fine for development). With it, every class, student, check-in and color change is recorded so the timeline can be rebuilt after class.

1. One person creates a free project at https://supabase.com (10 minutes).
2. Supabase dashboard > **SQL Editor** > New query > paste all of `server/src/db/schema.sql` > **Run**.
   - If you ran an older version of the schema (with `checks` / `answers` tables), first run the commented `drop table ...` line at the top of the file.
3. Dashboard > **Project Settings > API**: copy the **Project URL** and the **service_role** key.
4. `cp server/.env.example server/.env` and fill in `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.
5. Restart `npm run dev`. The console prints `database: Supabase`.

Rules: the service key lives **only** in `server/.env` (git-ignored) and on the hosting dashboard. Never put it in the client, never commit it. The browser never talks to Supabase. Live state stays in server memory for speed and the database is a history log; if Supabase is down the classroom keeps working.

### Accounts (teachers and students)

Accounts switch on automatically when the server has Supabase keys (`/health` reports `accounts: true`). With accounts on:

- **Teachers must sign in** to start a class. Each class belongs to its teacher; only they can reopen its dashboard.
- **Students can sign in or join as guests.** A signed-in student's answers feed their progress page; a guest just plays.
- `/me` is the account home: teachers see every class they ran and a summary per class (students, first-try accuracy, confidently-wrong answers, how each question moved after the re-check, check-ins). Students see confidence vs accuracy over time, accuracy by topic, and past classes.
- Sign-up and sign-in go through this server (`/auth/signup`, `/auth/login`, `/auth/refresh`), which uses Supabase Auth with the service key. The client needs **no** Supabase keys and there is no confirmation email.

Setup: if your database was created from an older `schema.sql`, run `server/src/db/migrations/001_accounts.sql` once in the SQL Editor (it only adds; safe to re-run). Without the database (local dev with no keys, CI, the smoke test) accounts are off and everything works as before.

## Project layout

```
shared/          events.js (socket events, reasons, weights), features.js (switches)
server/src/
  index.js       Express + Socket.IO bootstrap
  socket/        teacherHandlers.js, studentHandlers.js   <- the live protocol
  services/      sessionService (live state, check-ins, timeline), pulseService (the %),
                 views.js (what each side receives)
  db/            schema.sql (run in Supabase), store.js (history log)
client/src/
  pages/teacher/ CreateSession, Dashboard
  pages/student/ Join, Play (container), ColorPicker
  components/    PulseBar, StudentGrid, Timeline, ReasonBars, TopicHistory, BeforeAfterChart, ui/
  socket/        socket.js, useSocketEvents.js
```

## Who owns what

| Person | Area |
|---|---|
| Maher | Server core, deployment |
| Malak | `server/src/socket/*`, session and pulse logic |
| Salam | `client/src/pages/student/*` |
| Ramez | `client/src/pages/teacher/*` and `client/src/components/*` |

## Tuning knobs (all small)

- Weights (100 / 50 / 0) and the reasons list: `shared/events.js`.
- Advice thresholds (75 and 50): `client/src/components/status.js`.
- Turn focus mode off entirely: `shared/features.js`.

## Deploying

Chicken-and-egg: the server needs the client's URL (for CORS) and the client needs the server's URL
(to connect the socket). Deploy the server first with a placeholder `CLIENT_URL`, then the client,
then go back and fix `CLIENT_URL` on the server once you know the real one.

### 1. Server on Render

1. New + > **Web Service** (or **Blueprint**, pointing at this repo -- it reads `render.yaml` at
   the repo root and pre-fills everything below except the secrets).
2. If setting up by hand instead of the Blueprint: root directory = repo root (not `server/`).
   Build command `npm install`. Start command `npm run start -w server`. Health check path `/health`.
3. Environment variables:
   - `NODE_ENV` = `production`
   - `NODE_VERSION` = `24.12.0` -- **required**. The server runs `.ts` files directly with no build
     step, using Node's native TypeScript support; Render's default Node is older than that and
     `npm run start` will fail without this.
   - `CLIENT_URL` = `http://localhost:5173` for now (placeholder; come back and fix this in step 3).
   - `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (see the Supabase setup above).
4. Deploy, then open `https://<your-service>.onrender.com/health` -- should return
   `{"ok":true,"db":"supabase"}` (or `"memory"` if you skipped Supabase).

### 2. Client on Vercel

1. New Project, import this repo. **Root Directory** = `client`.
2. In that same screen, expand **"Include files outside the root directory in the Build Step"**
   and enable it -- the client imports `../shared/*.ts`, which Vercel won't see otherwise.
3. Build command `npm run build`, output directory `dist` (Vercel usually detects these from Vite).
4. Environment variable: `VITE_SERVER_URL` = `https://<your-service>.onrender.com` (from step 1.4).
5. Deploy. `vercel.json` already rewrites all routes to `index.html` so client-side routing works.

### 3. Wire them together

1. Copy the real Vercel URL (`https://<your-app>.vercel.app`).
2. Back on Render: update `CLIENT_URL` to that URL (comma-separate if you keep more than one, e.g.
   a Vercel preview URL too) and let it redeploy.
3. Confirm from a **phone on mobile data** (not the venue wifi -- that's the point of this check):
   open the Vercel URL, join a class with a code from another device, mark a color, watch it show
   up live. If it hangs on join, check the browser console for a CORS error first (means
   `CLIENT_URL` doesn't match exactly -- no trailing slash, right scheme) and the Render logs second.
4. Free tiers sleep when idle and cold-start slowly: open `<server-url>/health` a few minutes before
   the demo to warm it up, and again right before you go on.

## Team workflow

- Branches: `feature/<name>-<thing>`, small pull requests, merge to `main` at least daily.
- Never commit `.env`. Run `npm run smoke` before pushing.
- If you change a socket event or its payload, change `shared/events.js` **and** tell the others: it is the contract between client and server.



