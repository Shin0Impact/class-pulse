import { usePreferences } from "../../context/PreferencesContext.tsx";
import type { Pulse } from "@shared/types.ts";
import "./live.css";

// The numbers a teacher wants in view at all times: how much of the class follows (the pulse %),
// how many are lost / unsure / got it, who is online, and how many have answered the live question.
// Used on the dashboard and on the Present page.
export default function LiveStats({
  pulse,
  answered = null,
  className = "",
}: {
  pulse: Pulse | null;
  answered?: number | null; // answers to the live question; null = no question is live
  className?: string;
}) {
  const { t } = usePreferences();
  const pct = pulse?.pct ?? null;
  const tone = pct === null ? "none" : pct >= 75 ? "good" : pct >= 50 ? "mid" : "low";
  const online = pulse?.perStudent.filter((s) => s.connected).length ?? 0;
  const total = pulse?.total ?? 0;

  return (
    <section className={`live-stats ${className}`} aria-label={t("understanding")}>
      <div className={`live-stats__pct live-stats__pct--${tone}`}>
        <strong aria-live="polite">{pct === null ? "–" : `${pct}%`}</strong>
        <span>{t("understandingSmall")}</span>
      </div>

      <ul className="live-stats__counts">
        <li className="live-stats__count live-stats__count--green" title={t("gotIt")}>
          <b>{pulse?.counts.green ?? 0}</b> <span aria-hidden>✓</span> {t("gotIt")}
        </li>
        <li className="live-stats__count live-stats__count--yellow" title={t("unsure")}>
          <b>{pulse?.counts.yellow ?? 0}</b> <span aria-hidden>~</span> {t("unsure")}
        </li>
        <li className="live-stats__count live-stats__count--red" title={t("lost")}>
          <b>{pulse?.counts.red ?? 0}</b> <span aria-hidden>✗</span> {t("lost")}
        </li>
      </ul>

      <ul className="live-stats__facts">
        <li>
          <b dir="ltr">
            {online}/{total}
          </b>{" "}
          {t("liveOnline")}
        </li>
        <li>
          <b dir="ltr">
            {pulse?.marked ?? 0}/{total}
          </b>{" "}
          {t("marked")}
        </li>
        {answered !== null && (
          <li className="live-stats__answered">
            <b dir="ltr">
              {answered}/{online || total}
            </b>{" "}
            {t("answered")}
          </li>
        )}
      </ul>
    </section>
  );
}
