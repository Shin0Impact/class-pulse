import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { EVENTS } from "@shared/events.ts";
import { emitAck } from "../../socket/socket.ts";
import Button from "../../components/ui/Button.tsx";
import { usePreferences } from "../../context/PreferencesContext.tsx";
import { useAuth } from "../../auth/AuthContext.tsx";
import { getAccessToken } from "../../auth/tokens.ts";
import type { FormEvent } from "react";
import "./CreateSession.css";

export default function CreateSession() {
  const navigate = useNavigate();
  const { t } = usePreferences();
  const { ready, accountsEnabled, profile, signOut } = useAuth();
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function start(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { code } = await emitAck<{ code: string }>(EVENTS.TEACHER_CREATE, {
        title,
        accessToken: await getAccessToken(),
      });
      navigate(`/teacher/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  // With accounts on, a class always belongs to a signed-in teacher.
  if (ready && accountsEnabled && !profile) {
    return <Navigate to="/login?next=/teacher" replace />;
  }

  if (ready && profile?.role === "student") {
    return (
      <main className="teacher-create">
        <section className="teacher-create__shell">
          <Link to="/" className="teacher-create__back">
            {t("back")}
          </Link>
          <h1>{t("startClass")}</h1>
          <p className="teacher-create__lead">{t("studentCantTeach")}</p>
          <form onSubmit={(e) => e.preventDefault()}>
            <Button type="button" onClick={signOut}>
              {t("signOut")}
            </Button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="teacher-create">
      <section className="teacher-create__shell" aria-labelledby="create-title">
        <Link to={profile ? "/me" : "/"} className="teacher-create__back">
          {profile ? t("backToClasses") : t("back")}
        </Link>
        <p className="teacher-create__eyebrow">CLASS PULSE · LIVE LEARNING</p>
        <h1 id="create-title">{t("startClass")}</h1>
        <p className="teacher-create__lead">{t("startDesc")}</p>
        <form onSubmit={start}>
          <label>
            <span>{t("className")}</span>
            <input
              dir="auto"
              maxLength={60}
              placeholder={t("classPlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          {error && (
            <p className="teacher-create__error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy || !ready}>
            {busy ? t("starting") : t("startClass")}
          </Button>
          <aside
            className="teacher-create__meta"
            aria-label="Class Pulse benefits"
          >
            <span>● Real-time understanding</span>
            <span>● No student signup</span>
            <span>● Actionable gaps</span>
          </aside>
        </form>
      </section>
    </main>
  );
}
