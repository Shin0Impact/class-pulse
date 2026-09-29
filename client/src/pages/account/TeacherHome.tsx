import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.tsx";
import { usePreferences } from "../../context/PreferencesContext.tsx";
import AccountShell, { LoadState } from "./AccountShell.tsx";
import { dateTime, pctText } from "./format.ts";
import type { ClassListItem } from "@shared/types.ts";

export default function TeacherHome() {
  const { authedRequest, profile } = useAuth();
  const { t, language } = usePreferences();
  const [classes, setClasses] = useState<ClassListItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    authedRequest<ClassListItem[]>("/me/classes")
      .then(setClasses)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [authedRequest]);

  return (
    <AccountShell
      eyebrow={t("myClasses")}
      title={`${t("hello")} ${profile?.displayName ?? ""}`}
      actions={
        <Link className="account__primary" to="/teacher">
          {t("startNewClass")}
        </Link>
      }
    >
      <LoadState error={error} loading={classes === null} />

      {classes && classes.length === 0 && (
        <section className="account__empty">
          <h2>{t("noClassesYet")}</h2>
          <p>{t("noClassesHint")}</p>
        </section>
      )}

      {classes && classes.length > 0 && (
        <ul className="class-list">
          {classes.map((c) => (
            <li key={c.id}>
              <Link to={`/me/classes/${c.id}`} className="class-row">
                <span className="class-row__main">
                  <strong dir="auto">{c.title || t("untitledClass")}</strong>
                  <small>
                    {dateTime(c.createdAt, language)} · {t("classCode")} {c.code}
                    {c.status === "active" && <em className="badge badge--live">{t("live")}</em>}
                  </small>
                </span>
                <span className="class-row__stats">
                  <span>
                    <b>{c.studentCount}</b> {t("students")}
                  </span>
                  <span>
                    <b>{c.questionCount}</b> {t("questionsWord")}
                  </span>
                  <span>
                    <b>{pctText(c.firstTryAccuracy)}</b> {t("firstTry")}
                  </span>
                  <span>
                    <b>{c.blindspotCount}</b> {t("confidentlyWrong")}
                  </span>
                </span>
                <span className="class-row__go" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
