import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { fetchSession } from "../../api/http";
import { usePreferences } from "../../context/PreferencesContext";
import { useAuth } from "../../auth/AuthContext.tsx";

import JoinForm from "../../components/student/JoinForm/JoinForm";

import "./Join.css";

export const savedKey = (code: string) => `classpulse:${code}`;

export default function Join() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t } = usePreferences();

  const [code, setCode] = useState(params.get("code") ?? "");

  const [name, setName] = useState("");
  const { accountsEnabled, profile } = useAuth();
  const signedInStudent = profile?.role === "student" ? profile : null;

  // A signed-in student starts with their account name (they can still change it for this class).
  useEffect(() => {
    if (signedInStudent) setName((current) => current || signedInStudent.displayName.slice(0, 24));
  }, [signedInStudent]);

  const loginNext = encodeURIComponent(`/join${code ? `?code=${code}` : ""}`);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setBusy(true);

    try {
      const cleanCode = code.trim();
      const cleanName = name.trim();

      await fetchSession(cleanCode);

      try {
        sessionStorage.setItem(
          savedKey(cleanCode),
          JSON.stringify({
            name: cleanName,
          }),
        );
      } catch {
        // Joining should still work if storage is unavailable.
      }

      navigate(`/play/${cleanCode}`, {
        state: {
          name: cleanName,
        },
      });
    } catch {
      setError(t("classNotFound"));
      setBusy(false);
    }
  }

  return (
    <main className="student-join-page">
      <header className="student-join-page__topbar">
        <Link to="/" className="student-join-page__back" aria-label={t("back")}>
          <span aria-hidden="true">←</span>
          <span>{t("back")}</span>
        </Link>
      </header>

      <section className="student-join-page__content">
        <div className="student-join-page__form-col">
          <JoinForm
            name={name}
            code={code}
            busy={busy}
            error={error}
            onNameChange={setName}
            onCodeChange={setCode}
            onSubmit={handleJoin}
          />

          {accountsEnabled && (
            <p className="student-join-page__account">
              {signedInStudent ? (
                <>
                  {t("signedInAs")} <strong dir="auto">{signedInStudent.displayName}</strong>.{" "}
                  {t("progressSaved")}
                </>
              ) : (
                <>
                  {t("guestJoinNote")}{" "}
                  <Link to={`/login?role=student&next=${loginNext}`}>{t("signInToSave")}</Link>
                </>
              )}
            </p>
          )}
        </div>

        <aside className="student-join-page__visual" aria-label="Class Pulse">
          <div className="student-join-page__visual-label">
            <span aria-hidden="true" />
            <span>{t("liveClass")}</span>{" "}
          </div>

          <div className="student-join-page__pulse">
            <span />
            <span />
            <span />
            <strong>{t("pulseWord")}</strong> <span />
            <span />
            <span />
          </div>

          <blockquote>
            <p>
              {t("pulseQuoteFirst")}
              <br />
              {t("pulseQuoteSecond")}
            </p>
          </blockquote>

          <div className="student-join-page__number">01</div>
        </aside>
      </section>
    </main>
  );
}
