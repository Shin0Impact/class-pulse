import { io } from 'socket.io-client';

// In dev the server runs on port 3001 of the same machine (works from phones on the LAN too).
// In production set VITE_SERVER_URL to your deployed backend, e.g. https://class-pulse.onrender.com
export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:3001`;

export const socket = io(SERVER_URL);

// Promise wrapper around emit-with-ack. Rejects with the server's error message.
export function emitAck(event, payload = {}, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    socket.timeout(timeoutMs).emit(event, payload, (err, res) => {
      if (err) return reject(new Error('The server did not respond. Check your connection.'));
      if (!res?.ok) return reject(new Error(res?.error || 'Request failed'));
      resolve(res);
    });
  });
}
