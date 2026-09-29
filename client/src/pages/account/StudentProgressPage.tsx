import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.tsx";
import { usePreferences } from "../../context/PreferencesContext.tsx";
import CalibrationTrendChart from "../../components/charts/CalibrationTrendChart.tsx";
import BarList from "../../components/charts/BarList.tsx";
import AccountShell, { LoadState, StatTile } from "./AccountShell.tsx";
import { CALIBRATION_KEY, dateTime, pctText } from "./format.ts";
import type { StudentProgress } from "@shared/types.ts";

export default function StudentProgressPage() {
  const { authedRequest, profile } = useAuth();
  const { t, language } = usePreferences();
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    authedRequest<StudentProgress>("/me/progress")
      .then(setProgress)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [authedRequest]);

  const overall = progress?.overall;

  return (
    <AccountShell
      eyebrow={t("myProgress")}
      title={`${t("hello")} ${profile?.displayName ?? ""}`}
      actions={
        <Link className="account__primary" to="/join">
          {t("joinAClass")}
        </Link>
      }
    >
      <LoadState error={error} loading={progress === null && !error} />

      {progress && progress.classes.length === 0 && (
        <section className="account__empty">
          <h2>{t("noProgressYet")}</h2>
          <p>{t("noProgressHint")}</p>
        </section>
      )}

      {progress && overall && progress.classes.length > 0 && (
        <>
          <section className="stat-row" aria-label={t("myProgress")}>
            <StatTile label={t("classesWord")} value={String(progress.classes.length)} />
            <StatTile label={t("answered")} value={String(overall.answered)} />
            <StatTile label={t("firstTryAccuracy")} value={pctText(overall.accuracy)} />
            <StatTile
              label={t("calibrationWord")}
              text
              value={t(CALIBRATION_KEY[overall.calibration])}
              note={`${t("avgConfidence")} ${pctText(overall.avgConfidence)}`}
            />
          </section>

          <section className="account__section">
            <h2>{t("calibrationOverTime")}</h2>
            <p className="account__muted">{t("calibrationOverTimeHint")}</p>
            <CalibrationTrendChart
              locale={language}
              points={progress.classes.map((c) => ({
                id: c.sessionId,
                title: c.title,
                date: c.date,
                accuracy: c.accuracy,
                confidence: c.avgConfidence,
              }))}
              labels={{
                accuracy: t("accuracyWord"),
                confidence: t("confidenceWord"),
                showTable: t("showAsTable"),
                className: t("className"),
              }}
            />
          </section>

          {progress.topics.length > 0 && (
            <section className="account__section">
              <h2>{t("byTopic")}</h2>
              <BarList
                label={t("byTopic")}
                max={100}
                items={progress.topics.map((topic) => ({
                  id: topic.topic || "-",
                  label: topic.topic || t("noTopic"),
                  sublabel: `${topic.answered} ${t("answered")} · ${topic.blindspots} ${t("confidentlyWrong")}`,
                  value: topic.accuracy ?? 0,
                  display: pctText(topic.accuracy),
                }))}
              />
            </section>
          )}

          <section className="account__section">
            <h2>{t("pastClasses")}</h2>
            <ul className="checkin-list">
              {[...progress.classes].reverse().map((c) => (
                <li key={c.sessionId}>
                  <span dir="auto">{c.title || t("untitledClass")}</span>
                  <span>
                    <strong>{pctText(c.accuracy)}</strong> {t("firstTry")}
                  </span>
                  <small>
                    {dateTime(c.date, language)} · {t(CALIBRATION_KEY[c.calibration])}
                  </small>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </AccountShell>
  );
}
