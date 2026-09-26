import { SERVER_URL } from '../socket/socket.js';

async function get(path) {
  const res = await fetch(`${SERVER_URL}${path}`);
  if (!res.ok) throw new Error(res.status === 404 ? 'Not found' : 'Server error');
  return res.json();
}

export const fetchSession = (code) => get(`/sessions/${encodeURIComponent(code)}`);
