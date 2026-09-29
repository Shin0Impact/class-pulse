import { randomUUID } from 'node:crypto';
import { supabase } from '../db/supabase.ts';
import { UserError } from './sessionService.ts';
import { NotFoundError } from './historyService.ts';
import { takeHourly } from '../ai/limits.ts';

// A teacher's lesson files (PDFs and images), stored privately in Supabase Storage. The browser
// never gets a storage URL: files go up and come back down through this server, as the teacher.

export const BUCKET = 'documents';
export const MAX_BYTES = 25 * 1024 * 1024;
const MAX_FILES_PER_TEACHER = 200;
const MAX_UPLOADS_PER_HOUR = 30;

// The first bytes of each allowed type, so a renamed file can't pass as a PDF or an image.
function looksLike(mime: string, body: Buffer): boolean {
  const head = body.subarray(0, 12);
  if (mime === 'application/pdf') return head.subarray(0, 5).toString('latin1') === '%PDF-';
  if (mime === 'image/png') return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === 'image/jpeg') return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  if (mime === 'image/webp') return head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP';
  return false;
}
export const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

import type { DocumentInfo } from '../../../shared/types.ts';
export type { DocumentInfo };

type DocumentRow = {
  id: string;
  teacher_id: string;
  name: string;
  mime: string;
  size: number;
  storage_path: string;
  created_at: string;
  last_used_at: string;
};

function db() {
  if (!supabase) throw new UserError('Uploads need the database, which is not configured.');
  return supabase;
}

const toInfo = (r: DocumentRow): DocumentInfo => ({
  id: r.id,
  name: r.name,
  mime: r.mime,
  size: r.size,
  createdAt: r.created_at,
  lastUsedAt: r.last_used_at,
});

// The private bucket is created on first use, so there's nothing to click in the dashboard.
let bucketReady: Promise<void> | null = null;
function ensureBucket(): Promise<void> {
  bucketReady ??= (async () => {
    const { error } = await db().storage.getBucket(BUCKET);
    if (!error) return;
    const created = await db().storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: Object.keys(MIME_EXT),
    });
    if (created.error && !/already exists/i.test(created.error.message)) {
      throw new Error(`create bucket: ${created.error.message}`);
    }
  })().catch((e: unknown) => {
    bucketReady = null; // try again next time
    throw e;
  });
  return bucketReady;
}

// Only the file's own name, tidied (no folders, no control characters), for display.
export function cleanName(raw: unknown, mime: string): string {
  const base = String(raw ?? '')
    .split(/[\\/]/)
    .pop()!
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 120);
  return base || `document.${MIME_EXT[mime] ?? 'bin'}`;
}

export async function uploadDocument(teacherId: string, input: { name: unknown; mime: string; body: Buffer }): Promise<DocumentInfo> {
  const ext = MIME_EXT[input.mime];
  if (!ext) throw new UserError('Upload a PDF or an image (PNG, JPG, WebP)');
  if (input.body.length === 0) throw new UserError('The file is empty');
  if (input.body.length > MAX_BYTES) throw new UserError('Files can be at most 25 MB');
  if (!looksLike(input.mime, input.body)) {
    throw new UserError(ext === 'pdf' ? "That file isn't a valid PDF" : "That file isn't a valid image");
  }

  const { count, error: countError } = await db()
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', teacherId);
  if (countError) throw new Error(`count documents: ${countError.message}`);
  if ((count ?? 0) >= MAX_FILES_PER_TEACHER) throw new UserError(`You can keep up to ${MAX_FILES_PER_TEACHER} files.`);
  if (!takeHourly([[`upload:${teacherId}`, MAX_UPLOADS_PER_HOUR]])) {
    throw new UserError('Too many uploads this hour. Try again later.');
  }

  await ensureBucket();
  const id = randomUUID();
  const path = `${teacherId}/${id}.${ext}`;
  const { error } = await db().storage.from(BUCKET).upload(path, input.body, { contentType: input.mime, upsert: false });
  if (error) throw new Error(`upload: ${error.message}`);

  const now = new Date().toISOString();
  const row = {
    id,
    teacher_id: teacherId,
    name: cleanName(input.name, input.mime),
    mime: input.mime,
    size: input.body.length,
    storage_path: path,
    created_at: now,
    last_used_at: now,
  };
  const { error: insertError } = await db().from('documents').insert(row);
  if (insertError) {
    await db().storage.from(BUCKET).remove([path]);
    throw new Error(`save document: ${insertError.message}`);
  }
  return toInfo(row);
}

export async function listDocuments(teacherId: string): Promise<DocumentInfo[]> {
  const { data, error } = await db()
    .from('documents')
    .select('id, teacher_id, name, mime, size, storage_path, created_at, last_used_at')
    .eq('teacher_id', teacherId)
    .order('last_used_at', { ascending: false })
    .limit(20);
  if (error) throw new Error(`list documents: ${error.message}`);
  return ((data ?? []) as DocumentRow[]).map(toInfo);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The file's bytes, if it's this teacher's. Also bumps it to the top of their recent list.
export async function downloadDocument(teacherId: string, id: string): Promise<{ info: DocumentInfo; body: Buffer }> {
  if (!UUID.test(id)) throw new NotFoundError('Document not found');
  const { data, error } = await db()
    .from('documents')
    .select('id, teacher_id, name, mime, size, storage_path, created_at, last_used_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`load document: ${error.message}`);
  const row = data as DocumentRow | null;
  if (!row || row.teacher_id !== teacherId) throw new NotFoundError('Document not found');

  const file = await db().storage.from(BUCKET).download(row.storage_path);
  if (file.error || !file.data) throw new Error(`download: ${file.error?.message ?? 'no data'}`);

  const lastUsedAt = new Date().toISOString();
  void db().from('documents').update({ last_used_at: lastUsedAt }).eq('id', id).then(({ error: e }) => {
    if (e) console.error(`[db] touch document: ${e.message}`);
  });
  return { info: { ...toInfo(row), lastUsedAt }, body: Buffer.from(await file.data.arrayBuffer()) };
}
