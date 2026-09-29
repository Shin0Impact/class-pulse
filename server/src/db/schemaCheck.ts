import { supabase } from './supabase.ts';

// On startup, with a database: are the tables/columns the code writes actually there? A missing
// migration otherwise shows up as rows silently failing to save, so say it loudly instead.

export let schemaProblem: string | null = null;

const CHECKS: Array<{ table: string; columns: string; migration: string }> = [
  { table: 'profiles', columns: 'id', migration: '001_accounts.sql' },
  { table: 'sessions', columns: 'teacher_id', migration: '001_accounts.sql' },
  { table: 'students', columns: 'user_id', migration: '001_accounts.sql' },
  { table: 'blindspot_questions', columns: 'kind, source, context', migration: '002_ai.sql' },
  { table: 'blindspot_answers', columns: 'answer_text', migration: '002_ai.sql' },
  { table: 'ai_summaries', columns: 'id', migration: '002_ai.sql' },
  { table: 'documents', columns: 'id', migration: '002_ai.sql' },
];

export async function checkSchema(): Promise<void> {
  const db = supabase;
  if (!db) return;
  const missing = new Set<string>();
  for (const check of CHECKS) {
    const { error } = await db.from(check.table).select(check.columns).limit(1);
    // Only "doesn't exist" counts: a network blip shouldn't claim a migration is missing.
    if (error && /does not exist|could not find|schema cache/i.test(error.message)) missing.add(check.migration);
  }
  if (missing.size > 0) {
    schemaProblem = `Run in the Supabase SQL Editor: server/src/db/migrations/${[...missing].sort().join(', then ')}`;
    console.error(`\n  !! DATABASE IS MISSING TABLES/COLUMNS. History will not save until you fix it.\n  !! ${schemaProblem}\n`);
  }
}
