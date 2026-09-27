import { io } from 'socket.io-client';

type Ack<T> = ({ ok: true } & T) | { ok: false; error?: string };

// In dev the server runs on port 3001 of the same machine (works from phones on the LAN too).
// In production set VITE_SERVER_URL to your deployed backend, e.g. https://class-pulse.onrender.com
export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:3001`;

export const socket = io(SERVER_URL);

// Promise wrapper around emit-with-ack. Rejects with the server's error message.
export function emitAck<T extends object = Record<string, never>>(event: string, payload: object = {}, timeoutMs = 10000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    socket.timeout(timeoutMs).emit(event, payload, (err: Error | null, res: Ack<T>) => {
      if (err) return reject(new Error('The server did not respond. Check your connection.'));
      if (!res?.ok) return reject(new Error(res?.error || 'Request failed'));
      resolve(res as T);
    });
  });
}
