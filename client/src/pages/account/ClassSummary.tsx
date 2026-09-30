import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.tsx";
import { usePreferences } from "../../context/PreferencesContext.tsx";
import BarList from "../../components/charts/BarList.tsx";
import SummaryCard from "../../components/ai/SummaryCard.tsx";
import AccountShell, { LoadState, StatTile } from "./AccountShell.tsx";
import { CALIBRATION_KEY, dateTime, pctText } from "./format.ts";
import type { ClassDetail, ClassQuestion } from "@shared/types.ts";
import type { TranslationKey } from "../../i18n/translations.ts";

const QUADRANT_KEYS: Array<[keyof ClassQuestion["rounds"][number]["counts"], TranslationKey]> = [
  ["mastered", "qMastered"],
  ["fragile", "qFragile"],
  ["blindspot", "qBlindspot"],
  ["aware", "qAware"],
];

// /me/classes/:id: what happened in one class, for the teacher who ran it.
export default function ClassSummary() {
  const { id = "" } = useParams();
  const { ready, profile, authedRequest } = useAuth();
  const { t, language } = usePreferences();
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile?.role !== "teacher") return;
    let alive = true;
    let timer: number | undefined;
    // Right after a class ends its last saves can still be reaching the database, so a "not found" in
    // the first seconds is retried a few times before it is shown.
    const load = (attempt: number) => {
      authedRequest<ClassDetail>(`/me/classes/${encodeURIComponent(id)}`)
        .then((d) => alive && setDetail(d))
        .catch((e) => {
          if (!alive) return;
          if (attempt < 4 && /not found/i.test(e instanceof Error ? e.message : "")) {
            timer = window.setTimeout(() => load(attempt + 1), 1500);
          } else setError(e instanceof Error ? e.message : String(e));
        });
    };
    load(0);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [authedRequest, id, profile?.role]);

  if (ready && !profile) return <Navigate to={`/login?next=/me/classes/${id}`} replace />;
  if (ready && profile?.role !== "teacher") return <Navigate to="/me" replace />;

  const gap = detail?.totals.illusionGap ?? null;

  return (
    <AccountShell
      eyebrow={detail ? `${dateTime(detail.createdAt, language)} · ${t("classCode")} ${detail.code}` : t("classSummary")}
      title={detail ? detail.title || t("untitledClass") : t("classSummary")}
      back={{ to: "/me", label: t("backToClasses") }}
      actions={
        detail?.status === "active" ? (
          <Link className="account__primary" to={`/teacher/${detail.code}`}>
            {t("openDashboard")}
          </Link>
        ) : undefined
      }
    >
      <LoadState error={error} loading={!detail && !error} />

      {detail && (
        <>
          <section className="stat-row" aria-label={t("classSummary")}>
            <StatTile label={t("students")} value={String(detail.totals.students)} />
            <StatTile label={t("questionsWord")} value={String(detail.totals.questions)} />
            <StatTile label={t("firstTryAccuracy")} value={pctText(detail.totals.firstTryAccuracy)} />
            <StatTile
              label={t("illusionGapLabel")}
              value={gap === null ? "–" : `${gap > 0 ? "+" : ""}${gap}`}
              note={t("illusionGapNote")}
            />
          </section>

          <section className="account__section">
            <h2>{t("students")}</h2>
            {detail.students.length === 0 ? (
              <p className="account__muted">{t("noStudents")}</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("nameWord")}</th>
                      <th>{t("answered")}</th>
                      <th>{t("firstTryAccuracy")}</th>
                      <th>{t("avgConfidence")}</th>
                      <th>{t("calibrationWord")}</th>
                      <th>{t("confidentlyWrong")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.students.map((s) => (
                      <tr key={s.id}>
                        <td dir="auto">
                          {s.name}
                          {!s.signedIn && <em className="badge">{t("guest")}</em>}
                        </td>
                        <td>{s.answered}</td>
                        <td>{pctText(s.accuracy)}</td>
                        <td>{pctText(s.avgConfidence)}</td>
                        <td>
                          <span className={`cal cal--${s.calibration}`}>{t(CALIBRATION_KEY[s.calibration])}</span>
                        </td>
                        <td>{s.blindspots > 0 ? <strong>{s.blindspots}</strong> : 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="account__section">
            <h2>{t("questionsWord")}</h2>
            {detail.questions.length === 0 && <p className="account__muted">{t("noQuestions")}</p>}
            {detail.questions.map((q, i) => {
              const first = q.rounds.find((r) => r.round === 1);
              const later = q.rounds.filter((r) => r.round > 1).at(-1);
              const total = Object.values(q.optionCounts).reduce((a, b) => a + b, 0);
              return (
                <article key={q.id} className="cs-question">
                  <p className="cs-question__meta">
                    {i + 1} · {q.topic || t("noTopic")}
                    {q.source === "ai" && <span className="ai-badge">✦ AI</span>}
                    {q.kind === "open" && <span className="badge">{t("openQuestion")}</span>}
                  </p>
                  <h3 dir="auto">{q.prompt}</h3>
                  {q.kind === "open" ? (
                    q.openAnswers.length === 0 ? (
                      <p className="account__muted">{t("noAnswersYet")}</p>
                    ) : (
                      <ul className="cs-open-answers">
                        {q.openAnswers.map((a, j) => (
                          <li key={j}>
                            <strong dir="auto">{a.name}</strong>
                            <span dir="auto">{a.text}</span>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : (
                  <BarList
                    label={q.prompt}
                    max={Math.max(1, ...Object.values(q.optionCounts))}
                    items={q.options.map((o) => {
                      const count = q.optionCounts[o.id] ?? 0;
                      const correct = o.id === q.correctOptionId;
                      return {
                        id: o.id,
                        label: o.text,
                        sublabel: correct ? `✓ ${t("correctAnswer")}` : undefined,
                        value: count,
                        display: total ? `${count} · ${Math.round((count / total) * 100)}%` : "0",
                        muted: !correct,
                      };
                    })}
                  />
                  )}
                  {first && q.kind !== "open" && (
                    <p className="cs-question__rounds">
                      {t("firstTry")}: <strong>{pctText(first.correctPct)}</strong> {t("correctWord")}
                      {later && (
                        <>
                          {" "}
                          → {t("afterRecheck")}: <strong>{pctText(later.correctPct)}</strong>
                        </>
                      )}
                    </p>
                  )}
                  {first && q.kind !== "open" && (
                    <ul className="quadrant-chips">
                      {QUADRANT_KEYS.map(([key, label]) => (
                        <li key={key} className={`quadrant-chip quadrant-chip--${key}`}>
                          <b>{first.counts[key]}</b> {t(label)}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.summary && (
                    <div className="cs-question__summary">
                      <SummaryCard summary={q.summary} />
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          {detail.checkIns.length > 0 && (
            <section className="account__section">
              <h2>{t("checkInsWord")}</h2>
              <ul className="checkin-list">
                {detail.checkIns.map((c) => (
                  <li key={c.startedAt}>
                    <span dir="auto">{c.topic || t("noTopic")}</span>
                    <span>
                      <strong>{pctText(c.pct)}</strong> {t("understood")}
                    </span>
                    <small>
                      {c.green} {t("greenWord")} · {c.yellow} {t("yellowWord")} · {c.red} {t("redWord")}
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </AccountShell>
  );
}
