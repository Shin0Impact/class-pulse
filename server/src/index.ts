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
import { registerSocketHandlers } from './socket/index.ts';

const app = express();
// Render (and most hosts) sit one proxy in front: trust it so req.ip is the real client address.
app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(express.json());

// `accounts` tells the client whether to offer sign-in (and require it for teachers).
app.get('/health', (_req, res) => res.json({ ok: true, db: dbEnabled ? 'supabase' : 'memory', accounts: authEnabled }));
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
});
