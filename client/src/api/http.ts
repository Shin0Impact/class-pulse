import { SERVER_URL } from '../socket/socket.ts';

// Carries the HTTP status so callers can tell "sign in again" (401) from other failures.
export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function request<T>(
  path: string,
  { method = 'GET', body, token }: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SERVER_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new HttpError('The server did not respond. Check your connection.', 0);
  }
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new HttpError(data?.error || (res.status === 404 ? 'Not found' : 'Server error'), res.status);
  return data as T;
}

export const fetchSession = (code: string) => request(`/sessions/${encodeURIComponent(code)}`);

type Health = { ok: boolean; db: string; accounts?: boolean; ai?: boolean };

// Read from /info, not /health: Brave's shields block "/health" as a tracker. An older server that does not
// have /info yet (404) is asked at /health instead.
export const fetchHealth = async (): Promise<Health> => {
  try {
    return await request<Health>('/info');
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) return request<Health>('/health');
    throw e;
  }
};
