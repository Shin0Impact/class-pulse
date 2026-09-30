import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { config, corsOptions } from './config.ts';
import { dbEnabled } from './db/supabase.ts';
import sessionsRouter from './routes/sessions.ts';
import decksRouter from './routes/decks.ts';
import authRouter from './routes/auth.ts';
import meRouter from './routes/me.ts';
import { authEnabled } from './services/authService.ts';
import aiRouter from './routes/ai.ts';
import documentsRouter from './routes/documents.ts';
import { aiEnabled, providerNames } from './ai/llm.ts';
import { checkSchema, schemaProblem } from './db/schemaCheck.ts';
import { registerSocketHandlers } from './socket/index.ts';

const app = express();
// Render (and most hosts) sit one proxy in front: trust it so req.ip is the real client address.
app.set('trust proxy', 1);
app.use(cors(corsOptions));
// Before the global JSON parser (100 KB): these take a page image / a whole file.
app.use('/ai', aiRouter); // parses its own (bigger) JSON after checking who's calling
app.use('/documents', documentsRouter);
app.use(express.json());

// `accounts` tells the client whether to offer sign-in (and require it for teachers); `ai` whether
// to offer Generate / Summarize.
// /health is what Render and uptime checks use. The client reads the same thing from /info, because some
// browser shields (Brave) block any request whose path is "/health" as a tracker.
const health = (_req: express.Request, res: express.Response) =>
  res.json({ ok: true, db: dbEnabled ? 'supabase' : 'memory', accounts: authEnabled, ai: aiEnabled(), schema: schemaProblem ?? 'ok' });
app.get('/health', health);
app.get('/info', health);
app.use('/sessions', sessionsRouter);
app.use('/decks', decksRouter);
app.use('/auth', authRouter);
app.use('/me', meRouter);

const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });
registerSocketHandlers(io);

server.listen(config.port, '0.0.0.0', () => {
  console.log(`Class Pulse server on http://localhost:${config.port}`);
  console.log(`  database: ${dbEnabled ? 'Supabase' : 'in memory (no Supabase keys)'}`);
  console.log(`  accounts: ${authEnabled ? 'on (teachers must sign in)' : 'off (no database)'}`);
  console.log(`  ai: ${aiEnabled() ? providerNames().join(' -> ') : 'off (no GEMINI_API_KEY / ANTHROPIC_API_KEY)'}`);
  void checkSchema().catch((e: unknown) => console.error('[db] schema check:', e));
});
