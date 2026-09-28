import { STATUS_ORDER } from "./status.ts";
import { usePreferences } from "../context/PreferencesContext.tsx";
import type { Pulse } from "@shared/types.ts";
export default function PulseBar({ pulse }: { pulse: Pulse }) {
  const { t } = usePreferences(),
    total = Math.max(pulse.total, 1),
    p = pulse.pct,
    tone =
      p == null
        ? "text-slate-400"
        : p >= 75
          ? "text-emerald-600"
          : p >= 50
            ? "text-amber-600"
            : "text-rose-600",
    advice =
      p == null
        ? t("waiting")
        : p >= 75
          ? t("good")
          : p >= 50
            ? t("medium")
            : t("low"),
    labels = {
      green: t("gotIt"),
      yellow: t("unsure"),
      red: t("lost"),
      waiting: t("notMarked"),
    },
    bars = {
      green: "bg-emerald-500",
      yellow: "bg-amber-400",
      red: "bg-rose-500",
      waiting: "bg-slate-300",
    };
  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className={`text-7xl font-extrabold ${tone}`}>
            {p == null ? "–" : `${p}%`}
          </div>
          <div className="text-sm text-slate-500">
            {t("understandingSmall")}
          </div>
        </div>
        <div className="text-end">
          <strong className="text-3xl">
            {pulse.marked}/{pulse.total}
          </strong>
          <div className="text-sm text-slate-500">{t("marked")}</div>
        </div>
      </div>
      <p className={`mt-3 font-medium ${tone}`}>{advice}</p>
      <div className="mt-3 flex h-6 overflow-hidden rounded-full bg-slate-100">
        {STATUS_ORDER.map((s) => (
          <span
            key={s}
            className={bars[s]}
            style={{ width: `${(100 * pulse.counts[s]) / total}%` }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-5 text-sm">
        {STATUS_ORDER.map((s) => (
          <li key={s}>
            {pulse.counts[s]}{" "}
            <span className="text-slate-500">{labels[s]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
