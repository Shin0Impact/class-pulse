import 'dotenv/config';
import type { CorsOptions } from 'cors';

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  isProd,
  port: Number(process.env.PORT) || 3001,
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_KEY || '',
};

const LAN = /^https?:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // curl, server-to-server, same-origin
  if (config.clientUrls.includes(origin)) return true;
  return !isProd && LAN.test(origin);
}

export const corsOptions: CorsOptions = {
  origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
};
