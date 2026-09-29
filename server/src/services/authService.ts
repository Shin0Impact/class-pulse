import { createClient } from '@supabase/supabase-js';
import { config } from '../config.ts';
import { supabase } from '../db/supabase.ts';
import { UserError } from './sessionService.ts';
import type { AccountProfile, AuthResult, AuthTokens, Role } from '../../../shared/types.ts';

// Accounts live in Supabase Auth. The browser never talks to Supabase: it calls /auth/* on this
// server, keeps the returned tokens, and sends the access token back with each request. So the
// client needs no Supabase keys, and there is no "confirm your email" step to configure.

export type { Role };
export type Profile = AccountProfile;

// Accounts need the database. Without Supabase keys (local dev, the smoke test, CI) the app keeps
// working exactly as before: anyone can start a class and nothing is tied to a person.
export const authEnabled = Boolean(supabase);

// Missing or bad credentials. HTTP routes turn this into a 401; sockets show the message.
export class AuthError extends UserError {}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES: Role[] = ['teacher', 'student'];

function db() {
  if (!supabase) throw new UserError('Accounts are not available: the server has no database configured.');
  return supabase;
}

// A throwaway client for each sign-in/refresh. signInWithPassword stores the signed-in user's
// session on whatever client it runs on; doing that on the shared service-role client would make
// every later database write run as that user instead (and fail row level security).
function throwawayClient() {
  return createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function toTokens(session: { access_token: string; refresh_token: string; expires_at?: number; expires_in: number }): AuthTokens {
  const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now() + session.expires_in * 1000;
  return { accessToken: session.access_token, refreshToken: session.refresh_token, expiresAt };
}

// ---- profile cache: profiles never change role, and display names rarely change ----
const profiles = new Map<string, Profile>();

async function loadProfile(id: string, email: string): Promise<Profile> {
  const cached = profiles.get(id);
  if (cached) return cached;
  const { data, error } = await db().from('profiles').select('id, role, display_name').eq('id', id).maybeSingle();
  if (error) throw new Error(`load profile: ${error.message}`);
  if (!data) throw new AuthError('This account has no profile. Sign up again.');
  const profile: Profile = { id: data.id, role: data.role as Role, displayName: data.display_name, email };
  profiles.set(id, profile);
  return profile;
}

// ---- token cache: getUser() is a network call to Supabase, too slow to repeat on every request ----
// Kept 5 minutes at most, and never past the token's own expiry.
const TOKEN_CACHE_MS = 5 * 60 * 1000;

function tokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : Infinity;
  } catch {
    return Infinity;
  }
}
const tokens = new Map<string, { profile: Profile; until: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of tokens) if (entry.until < now) tokens.delete(token);
}, 10 * 60 * 1000).unref();

export async function signUp(input: {
  email?: unknown;
  password?: unknown;
  displayName?: unknown;
  role?: unknown;
}): Promise<AuthResult> {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const displayName = typeof input.displayName === 'string' ? input.displayName.trim().replace(/\s+/g, ' ').slice(0, 40) : '';
  const role = input.role as Role;

  if (!EMAIL.test(email)) throw new UserError('Enter a valid email address');
  if (password.length < 6) throw new UserError('Password must be at least 6 characters');
  if (!displayName) throw new UserError('Enter your name');
  if (!ROLES.includes(role)) throw new UserError('Choose teacher or student');

  // admin.createUser marks the email as confirmed, so the account works immediately.
  const { data, error } = await db().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, role },
  });
  if (error || !data.user) {
    if (error && /already|registered|exists/i.test(error.message)) {
      throw new UserError('An account with this email already exists. Sign in instead.');
    }
    // Supabase's own password rules (project settings) can be stricter than ours: show them.
    if (error && /password/i.test(error.message)) throw new UserError(error.message);
    throw new Error(`create user: ${error?.message ?? 'no user returned'}`);
  }

  const { error: profileError } = await db()
    .from('profiles')
    .insert({ id: data.user.id, role, display_name: displayName });
  if (profileError) {
    await db().auth.admin.deleteUser(data.user.id); // don't leave an account that can't sign in
    throw new Error(`create profile: ${profileError.message}`);
  }

  return signIn({ email, password });
}

export async function signIn(input: { email?: unknown; password?: unknown }): Promise<AuthResult> {
  db();
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  if (!email || !password) throw new UserError('Enter your email and password');

  const { data, error } = await throwawayClient().auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) throw new AuthError('Wrong email or password');

  const profile = await loadProfile(data.user.id, data.user.email ?? email);
  return { session: toTokens(data.session), profile };
}

export async function refresh(input: { refreshToken?: unknown }): Promise<AuthResult> {
  db();
  if (typeof input.refreshToken !== 'string' || !input.refreshToken) throw new AuthError('Please sign in again');

  const { data, error } = await throwawayClient().auth.refreshSession({ refresh_token: input.refreshToken });
  if (error || !data.session || !data.user) throw new AuthError('Your session expired. Please sign in again.');

  const profile = await loadProfile(data.user.id, data.user.email ?? '');
  return { session: toTokens(data.session), profile };
}

// Who is this access token? null for a missing/invalid/expired token -- and also when Supabase
// can't be reached, so a database hiccup turns a signed-in student into a guest instead of
// blocking them from class. Never throws.
export async function verifyToken(token: unknown): Promise<Profile | null> {
  if (!authEnabled || typeof token !== 'string' || !token) return null;

  const cached = tokens.get(token);
  if (cached && cached.until > Date.now()) return cached.profile;

  try {
    const { data, error } = await db().auth.getUser(token);
    if (error || !data.user) return null;

    const profile = await loadProfile(data.user.id, data.user.email ?? '');
    tokens.set(token, { profile, until: Math.min(Date.now() + TOKEN_CACHE_MS, tokenExpiry(token)) });
    return profile;
  } catch (e) {
    if (!(e instanceof AuthError)) console.error('[auth] verify token:', e);
    return null;
  }
}

// For actions that need a signed-in account of a given role.
export async function requireAccount(token: unknown, role?: Role): Promise<Profile> {
  const profile = await verifyToken(token);
  if (!profile) throw new AuthError('Please sign in first');
  if (role && profile.role !== role) {
    throw new AuthError(role === 'teacher' ? 'This needs a teacher account' : 'This needs a student account');
  }
  return profile;
}
