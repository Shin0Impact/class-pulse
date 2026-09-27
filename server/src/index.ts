import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { config, corsOptions } from './config.ts';
import { dbEnabled } from './db/supabase.ts';
import sessionsRouter from './routes/sessions.ts';
import { registerSocketHandlers } from './socket/index.ts';

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, db: dbEnabled ? 'supabase' : 'memory' }));
app.use('/sessions', sessionsRouter);

const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });
registerSocketHandlers(io);

server.listen(config.port, '0.0.0.0', () => {
  console.log(`Class Pulse server on http://localhost:${config.port}`);
  console.log(`  database: ${dbEnabled ? 'Supabase' : 'in memory (no Supabase keys)'}`);
});
