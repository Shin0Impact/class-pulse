import { request, HttpError } from '../api/http.ts';
import type { AuthResult, AuthTokens } from '@shared/types.ts';

// The signed-in account's tokens, kept in localStorage so a refresh or a new tab stays signed in.
// Anything that talks to the server as the user calls getAccessToken() right before the request.
//
// localStorage is the source of truth, re-read before every use: Supabase rotates the refresh
// token on each refresh, so a second tab holding an old copy in memory would present a used
// refresh token -- which Supabase treats as theft and signs the account out everywhere.

const KEY = 'class-pulse-auth';

let storageWorks = true;
let memory: AuthTokens | null = null; // fallback when storage is blocked (private mode)

function current(): AuthTokens | null {
  if (!storageWorks) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  } catch {
    storageWorks = false;
    return memory;
  }
}

type Listener = (signedIn: boolean) => void;
const listeners = new Set<Listener>();

// Called when the tokens are cleared or set -- here, or in another tab.
export function onTokensChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) listeners.forEach((l) => l(e.newValue !== null));
  });
}

export function saveTokens(next: AuthTokens | null): void {
  memory = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    storageWorks = false;
  }
  listeners.forEach((l) => l(next !== null));
}

export const hasTokens = () => current() !== null;

// One refresh at a time, even if several requests notice the expiry together.
let refreshing: Promise<AuthResult> | null = null;

export function refreshTokens(): Promise<AuthResult> {
  const tokens = current();
  if (!tokens) return Promise.reject(new HttpError('Please sign in', 401));
  refreshing ??= request<AuthResult>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: tokens.refreshToken },
  })
    .then((result) => {
      saveTokens(result.session);
      return result;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

// A usable access token (refreshed first when it's within a minute of expiring), or undefined when
// signed out. A rejected refresh signs out; a network hiccup keeps the old token and lets the
// server decide.
export async function getAccessToken(): Promise<string | undefined> {
  const tokens = current();
  if (!tokens) return undefined;
  if (tokens.expiresAt - Date.now() > 60_000) return tokens.accessToken;
  try {
    return (await refreshTokens()).session.accessToken;
  } catch (e) {
    // Another tab may have refreshed first (our copy was then already used): take theirs.
    const latest = current();
    if (latest && latest.refreshToken !== tokens.refreshToken) return latest.accessToken;
    if (e instanceof HttpError && e.status === 401) {
      saveTokens(null);
      return undefined;
    }
    return tokens.accessToken;
  }
}
