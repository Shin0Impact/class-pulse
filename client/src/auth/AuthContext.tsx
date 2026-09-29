import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchHealth, request, HttpError } from "../api/http.ts";
import { getAccessToken, hasTokens, onTokensChange, refreshTokens, saveTokens } from "./tokens.ts";
import type { AccountProfile, AuthResult, Role } from "@shared/types.ts";

type SignUpInput = {
  email: string;
  password: string;
  displayName: string;
  role: Role;
};

type AuthValue = {
  // false until we know whether accounts are on and who (if anyone) is signed in
  ready: boolean;
  // the server has a database, so sign-in exists (and teachers must use it)
  accountsEnabled: boolean;
  profile: AccountProfile | null;
  signIn: (email: string, password: string) => Promise<AccountProfile>;
  signUp: (input: SignUpInput) => Promise<AccountProfile>;
  signOut: () => void;
  // GET/POST to the server as the signed-in user; signs out if the server says the session is gone
  authedRequest: <T>(path: string, options?: { method?: string; body?: unknown }) => Promise<T>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [accountsEnabled, setAccountsEnabled] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);

  const signOut = useCallback(() => {
    saveTokens(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const health = await fetchHealth();
        if (cancelled) return;
        setAccountsEnabled(Boolean(health.accounts));
        if (health.accounts && hasTokens()) {
          const token = await getAccessToken();
          if (token) {
            const me = await request<{ profile: AccountProfile }>("/me", { token });
            if (!cancelled) setProfile(me.profile);
          }
        }
      } catch (e) {
        if (e instanceof HttpError && e.status === 401) saveTokens(null);
        // Server unreachable: pages still render; anything needing the server shows its own error.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Signed out elsewhere (another tab, or a refresh the server rejected): drop the profile here too.
  // Signed in elsewhere: load who it is.
  useEffect(
    () =>
      onTokensChange((signedIn) => {
        if (!signedIn) {
          setProfile(null);
          return;
        }
        getAccessToken()
          .then((token) => (token ? request<{ profile: AccountProfile }>("/me", { token }) : null))
          .then((me) => me && setProfile(me.profile))
          .catch(() => {});
      }),
    [],
  );

  const finish = useCallback((result: AuthResult) => {
    saveTokens(result.session);
    setProfile(result.profile);
    setAccountsEnabled(true);
    return result.profile;
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) =>
      finish(await request<AuthResult>("/auth/login", { method: "POST", body: { email, password } })),
    [finish],
  );

  const signUp = useCallback(
    async (input: SignUpInput) =>
      finish(await request<AuthResult>("/auth/signup", { method: "POST", body: input })),
    [finish],
  );

  const authedRequest = useCallback(
    async <T,>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> => {
      const token = await getAccessToken();
      if (!token) {
        signOut();
        throw new HttpError("Please sign in again", 401);
      }
      try {
        return await request<T>(path, { ...options, token });
      } catch (e) {
        if (!(e instanceof HttpError) || e.status !== 401) throw e;
        // The token was rejected early (e.g. revoked): one refresh + retry, then give up.
        try {
          const fresh = await refreshTokens();
          return await request<T>(path, { ...options, token: fresh.session.accessToken });
        } catch (again) {
          if (again instanceof HttpError && again.status === 401) signOut();
          throw again;
        }
      }
    },
    [signOut],
  );

  const value = useMemo(
    () => ({ ready, accountsEnabled, profile, signIn, signUp, signOut, authedRequest }),
    [ready, accountsEnabled, profile, signIn, signUp, signOut, authedRequest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
