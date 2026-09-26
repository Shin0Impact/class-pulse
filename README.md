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

- **Server** (Render / Railway): build `npm install`, start `npm run start -w server`. Environment: `NODE_ENV=production`, `CLIENT_URL=<your client URL>`, plus the Supabase keys. Free tiers sleep when idle: open `<server-url>/health` a few minutes before the demo.
- **Client** (Vercel / Netlify): root directory `client`, build `npm run build`, output `dist`. Environment: `VITE_SERVER_URL=<your server URL>`. Enable "include files outside the root directory" (Vercel) so `shared/` is available.

## Team workflow

- Branches: `feature/<name>-<thing>`, small pull requests, merge to `main` at least daily.
- Never commit `.env`. Run `npm run smoke` before pushing.
- If you change a socket event or its payload, change `shared/events.js` **and** tell the others: it is the contract between client and server.



