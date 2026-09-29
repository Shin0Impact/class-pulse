import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.tsx";
import { usePreferences } from "../../context/PreferencesContext.tsx";
import Button from "../../components/ui/Button.tsx";
import type { Role } from "@shared/types.ts";
import "./AuthPage.css";

// Only follow our own paths after sign-in (never an absolute URL someone put in ?next=; browsers
// read "/\evil.com" like "//evil.com", so backslashes are out too).
function safeNext(next: string | null): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : null;
}

export default function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const { t } = usePreferences();
  const { ready, accountsEnabled, profile, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));

  const [role, setRole] = useState<Role>(params.get("role") === "student" ? "student" : "teacher");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";
  const otherLink = `${isSignup ? "/login" : "/signup"}${params.toString() ? `?${params}` : ""}`;

  if (ready && profile) return <Navigate to={next ?? "/me"} replace />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isSignup) await signUp({ email, password, displayName, role });
      else await signIn(email, password);
      navigate(next ?? "/me", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-page__shell" aria-labelledby="auth-title">
        <Link to="/" className="auth-page__back">
          {t("back")}
        </Link>
        <p className="auth-page__eyebrow">CLASS PULSE</p>
        <h1 id="auth-title">{isSignup ? t("signUpTitle") : t("signInTitle")}</h1>
        <p className="auth-page__lead">{isSignup ? t("signUpLead") : t("signInLead")}</p>

        {ready && !accountsEnabled ? (
          <p className="auth-page__error" role="alert">
            {t("accountsUnavailable")}
          </p>
        ) : (
          <form onSubmit={submit}>
            {isSignup && (
              <fieldset className="auth-page__roles">
                <legend>{t("iAm")}</legend>
                {(["teacher", "student"] as const).map((r) => (
                  <label key={r} className={role === r ? "is-selected" : ""}>
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={role === r}
                      onChange={() => setRole(r)}
                    />
                    <strong>{r === "teacher" ? t("roleTeacher") : t("roleStudent")}</strong>
                    <small>{r === "teacher" ? t("roleTeacherHint") : t("roleStudentHint")}</small>
                  </label>
                ))}
              </fieldset>
            )}

            {isSignup && (
              <label>
                <span>{t("yourName")}</span>
                <input
                  dir="auto"
                  maxLength={40}
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </label>
            )}

            <label>
              <span>{t("email")}</span>
              <input
                type="email"
                dir="ltr"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label>
              <span>{t("password")}</span>
              <input
                type="password"
                dir="ltr"
                minLength={isSignup ? 6 : undefined}
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {isSignup && <small className="auth-page__hint">{t("passwordHint")}</small>}
            </label>

            {error && (
              <p className="auth-page__error" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={busy || !ready}>
              {busy ? t("pleaseWait") : isSignup ? t("createAccount") : t("signIn")}
            </Button>

            <p className="auth-page__switch">
              {isSignup ? t("haveAccount") : t("noAccount")}{" "}
              <Link to={otherLink}>{isSignup ? t("signIn") : t("createAccount")}</Link>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
