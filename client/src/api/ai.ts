import { SERVER_URL } from '../socket/socket.ts';
import { getAccessToken } from '../auth/tokens.ts';
import { request, HttpError } from './http.ts';
import type { DocumentInfo, QuestionDraft, QuestionKind } from '@shared/types.ts';

// The teacher's AI and document calls. The access token rides along when signed in (the server
// requires it whenever accounts are on).

export type PageCapture = {
  text: string;
  image?: { mimeType: 'image/jpeg'; data: string };
};

export async function generateQuestion(
  code: string,
  input: { kind: QuestionKind; page: PageCapture; correctAnswer?: string; language: 'ar' | 'en' },
): Promise<QuestionDraft> {
  return request<QuestionDraft>('/ai/question', {
    method: 'POST',
    token: await getAccessToken(),
    body: {
      code,
      kind: input.kind,
      pageText: input.page.text,
      pageImage: input.page.image,
      correctAnswer: input.correctAnswer || undefined,
      language: input.language,
    },
  });
}

export async function uploadDocument(file: File): Promise<DocumentInfo> {
  let res: Response;
  try {
    res = await fetch(`${SERVER_URL}/documents?name=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type, Authorization: `Bearer ${(await getAccessToken()) ?? ''}` },
      body: file,
    });
  } catch {
    throw new HttpError('The server did not respond. Check your connection.', 0);
  }
  const data = (await res.json().catch(() => null)) as (DocumentInfo & { error?: string }) | null;
  if (!res.ok || !data) throw new HttpError(data?.error || 'Upload failed', res.status);
  return data;
}

export async function listDocuments(): Promise<DocumentInfo[]> {
  return request<DocumentInfo[]>('/documents', { token: await getAccessToken() });
}

export async function downloadDocument(id: string): Promise<Blob> {
  const res = await fetch(`${SERVER_URL}/documents/${encodeURIComponent(id)}/file`, {
    headers: { Authorization: `Bearer ${(await getAccessToken()) ?? ''}` },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new HttpError(data?.error || 'Could not open the document', res.status);
  }
  return res.blob();
}
