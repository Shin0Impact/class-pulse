import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

// null when keys are missing: the app then runs fully in memory (fine for local dev and tests).
export const supabase =
  config.supabaseUrl && config.supabaseKey
    ? createClient(config.supabaseUrl, config.supabaseKey, { auth: { persistSession: false } })
    : null;

export const dbEnabled = Boolean(supabase);
