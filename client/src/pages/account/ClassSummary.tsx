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

const CONFIDENCE_KEYS: Record<string, TranslationKey> = {
  guess: "guessing",
  "fairly-sure": "fairlySure",
  certain: "certain",
};

// The bar colour of a check-in: green when most of the class followed, amber in between, red when lost.
const pctTone = (pct: number | null) => (pct === null ? "none" : pct >= 75 ? "good" : pct >= 50 ? "mid" : "low");

// /me/classes/:id: what happened in one class, for the teacher who ran it.
export default function ClassSummary() {
  const { id = "" } = useParams();
  const { ready, profile, authedRequest } = useAuth();
  const { t, language } = usePreferences();
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [error, setError] = useState("");

  // Printing (or "save as PDF") should show the closed "who answered what" tables too.
  useEffect(() => {
    const all = () => Array.from(document.querySelectorAll<HTMLDetailsElement>("details.cs-who"));
    const opened = new Set<HTMLDetailsElement>();
    const before = () => all().forEach((d) => { if (!d.open) { opened.add(d); d.open = true; } });
    const after = () => { opened.forEach((d) => { d.open = false; }); opened.clear(); };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

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
        detail ? (
          <>
            {detail.status === "active" && (
              <Link className="account__primary" to={`/teacher/${detail.code}`}>
                {t("openDashboard")}
              </Link>
            )}
            <button type="button" className="account__primary account__print" onClick={() => window.print()}>
              {t("printReport")}
            </button>
          </>
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
                  {q.kind !== "open" && q.answers.length > 0 && (
                    <div className="cs-who-wrap">
                      {(() => {
                        const wrong = q.answers.filter((a) => !a.correct);
                        return wrong.length === 0 ? (
                          <p className="cs-wrong cs-wrong--none">✓ {t("everyoneRight")}</p>
                        ) : (
                          <div className="cs-wrong">
                            <strong>{t("gotWrong")} ({wrong.length})</strong>
                            <ul>
                              {wrong.map((a, j) => (
                                <li key={j} dir="auto" className={a.quadrant === "blindspot" ? "cs-wrong__sure" : undefined}>
                                  {a.name}
                                  {a.quadrant === "blindspot" && <small> · {t("qBlindspot")}</small>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}
                      <details className="cs-who">
                        <summary>{t("whoAnswered")}</summary>
                        <div className="table-wrap">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>{t("nameWord")}</th>
                                <th>{t("chose")}</th>
                                <th>{t("confidenceWord")}</th>
                                <th>{t("resultWord")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {q.answers.map((a, j) => {
                                const idx = q.options.findIndex((o) => o.id === a.optionId);
                                const opt = idx >= 0 ? q.options[idx] : null;
                                return (
                                  <tr key={j} className={a.correct ? undefined : "cs-row--wrong"}>
                                    <td dir="auto">{a.name}</td>
                                    <td dir="auto">{opt ? `${String.fromCharCode(65 + idx)}. ${opt.text}` : "–"}</td>
                                    <td>{t(CONFIDENCE_KEYS[a.confidence] ?? "certain")}</td>
                                    <td>{a.correct ? `✓ ${t("correctWord")}` : `✗ ${t("wrongWord")}`}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    </div>
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
              <h2>{t("understandingTimeline")}</h2>
              <p className="account__muted">{t("timelineHint")}</p>
              <ol className="cs-timeline">
                {detail.checkIns.map((c, i) => (
                  <li key={c.startedAt}>
                    <span className="cs-timeline__topic" dir="auto">
                      {i + 1} · {c.topic || t("noTopic")}
                    </span>
                    <span className="cs-timeline__bar" role="img" aria-label={`${pctText(c.pct)} ${t("understood")}`}>
                      <i className={`cs-timeline__fill cs-timeline__fill--${pctTone(c.pct)}`} style={{ width: `${c.pct ?? 0}%` }} />
                    </span>
                    <span className="cs-timeline__pct">
                      <strong>{pctText(c.pct)}</strong> {t("understood")}
                    </span>
                    <small>
                      {c.green} {t("greenWord")} · {c.yellow} {t("yellowWord")} · {c.red} {t("redWord")}
                    </small>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="account__section">
            <h2>{t("classFeedbackTitle")}</h2>
            {detail.feedback.responses === 0 ? (
              <p className="account__muted">{t("noFeedbackYet")}</p>
            ) : (
              <>
                <p className="cs-feedback__avg">
                  <strong>
                    <bdi dir="ltr">{detail.feedback.average} / 5</bdi>
                  </strong>{" "}
                  {t("feedbackAverage")} · {detail.feedback.responses} {t("feedbackResponses")}
                </p>
                <ul className="cs-feedback">
                  {detail.feedback.items.map((f, i) => (
                    <li key={i}>
                      <span className="cs-feedback__stars" aria-label={`${f.rating} / 5`}>
                        {"★".repeat(f.rating)}
                        <span>{"★".repeat(5 - f.rating)}</span>
                      </span>
                      <strong dir="auto">{f.name ?? t("anonymousStudent")}</strong>
                      {f.comment && <p dir="auto">{f.comment}</p>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}
    </AccountShell>
  );
}
