import { SERVER_URL } from '../socket/socket.ts';

async function get(path: string): Promise<unknown> {
  const res = await fetch(`${SERVER_URL}${path}`);
  if (!res.ok) throw new Error(res.status === 404 ? 'Not found' : 'Server error');
  return res.json();
}

export const fetchSession = (code: string) => get(`/sessions/${encodeURIComponent(code)}`);
