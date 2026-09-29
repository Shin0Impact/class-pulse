import { Link, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../auth/AuthContext.tsx";
import { usePreferences } from "../../context/PreferencesContext.tsx";
import "./Account.css";

// Header + frame shared by the teacher home, the class summary and the student progress page.
export default function AccountShell({
  eyebrow,
  title,
  actions,
  back,
  children,
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
  back?: { to: string; label: string };
  children: ReactNode;
}) {
  const { profile, signOut } = useAuth();
  const { t } = usePreferences();
  const navigate = useNavigate();

  return (
    <main className="account">
      <div className="account__shell">
        <nav className="account__nav">
          <Link to={back?.to ?? "/"}>{back?.label ?? t("back")}</Link>
          {profile && (
            <span className="account__who">
              <span dir="auto">{profile.displayName}</span>
              <small>{profile.role === "teacher" ? t("roleTeacher") : t("roleStudent")}</small>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  navigate("/");
                }}
              >
                {t("signOut")}
              </button>
            </span>
          )}
        </nav>
        <header className="account__header">
          <div>
            <p className="account__eyebrow">{eyebrow}</p>
            <h1 dir="auto">{title}</h1>
          </div>
          {actions && <div className="account__actions">{actions}</div>}
        </header>
        {children}
      </div>
    </main>
  );
}

// `text` for a word value ("Well calibrated") instead of a number: smaller, and allowed to wrap.
export function StatTile({ label, value, note, text }: { label: string; value: string; note?: string; text?: boolean }) {
  return (
    <div className={`stat-tile${text ? " stat-tile--text" : ""}`}>
      <span>{label}</span>
      {/* numbers like "+8" or "42%" stay in reading order inside an Arabic page */}
      <strong>{text ? value : <bdi dir="ltr">{value}</bdi>}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

export function LoadState({ error, loading }: { error: string; loading: boolean }) {
  const { t } = usePreferences();
  if (error)
    return (
      <p className="account__error" role="alert">
        {error}
      </p>
    );
  if (loading) return <p className="account__muted">{t("loading")}</p>;
  return null;
}
