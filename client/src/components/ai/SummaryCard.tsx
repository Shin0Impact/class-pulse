import { usePreferences } from "../../context/PreferencesContext.tsx";
import type { ClassConfusionSummary } from "@shared/types.ts";
import "./ai.css";

// The AI's read of the class for one question: what they're confused by, and whether to re-teach.
export default function SummaryCard({
  summary,
  status = "ready",
  error,
}: {
  summary?: ClassConfusionSummary | null;
  status?: "working" | "ready" | "failed";
  error?: string;
}) {
  const { t } = usePreferences();

  if (status === "working") {
    return (
      <section className="ai-summary ai-summary--working" aria-live="polite">
        <span className="ai-spinner" aria-hidden="true" />
        {t("aiSummarizing")}
      </section>
    );
  }
  if (status === "failed") {
    return (
      <section className="ai-summary ai-summary--failed" role="alert">
        <p className="ai-summary__label">✦ {t("aiSummary")}</p>
        {error || t("aiSummaryFailed")}
      </section>
    );
  }
  if (!summary) return null;

  return (
    <section className="ai-summary" aria-label={t("aiSummary")}>
      <p className="ai-summary__label">✦ {t("aiSummary")}</p>
      <p className="ai-summary__headline" dir="auto">
        {summary.headline}
      </p>
      {summary.confusions.length > 0 && (
        <ul>
          {summary.confusions.map((c, i) => (
            <li key={i} dir="auto">
              <strong>{c.issue}</strong>
              {c.detail && <span>{c.detail}</span>}
            </li>
          ))}
        </ul>
      )}
      <p className={`ai-summary__verdict ai-summary__verdict--${summary.reteach ? "reteach" : "ok"}`}>
        <b>{summary.reteach ? t("aiReteach") : t("aiMoveOn")}</b>
        <span dir="auto">{summary.suggestion}</span>
      </p>
      <p className="ai-summary__meta">
        {summary.answered} {t("answered")} · {t("aiWrittenBy")} {summary.provider.split(":").pop()}
      </p>
    </section>
  );
}
