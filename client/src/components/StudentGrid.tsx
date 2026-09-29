import { reasonLabel } from "./reasonLabel.ts";
import { STATUS_UI } from "./status.ts";
import { usePreferences } from "../context/PreferencesContext.tsx";
import type { StudentView } from "@shared/types.ts";

// hideNames: for a projector, show only colored dots so nobody is singled out in front of the class.
export default function StudentGrid({
  students = [],
  hideNames = false,
}: {
  students?: StudentView[];
  hideNames?: boolean;
}) {
  const { t } = usePreferences();
  if (!students.length)
    return <p className="text-sm text-slate-500">{t("nobody")}</p>;

  if (hideNames) {
    return (
      <ul className="flex flex-wrap gap-2">
        {students.map((s) => (
          <li
            key={s.id}
            title={STATUS_UI[s.status].label}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ring-1 ${STATUS_UI[s.status].chip} ${s.connected ? "" : "opacity-50"}`}
          >
            {STATUS_UI[s.status].symbol}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {students.map((s) => {
        const ui = STATUS_UI[s.status];
        const why = reasonLabel(s.reason, t);
        return (
          <li
            key={s.id}
            title={`${s.name}: ${ui.label}${why ? ` (${why})` : ""}`}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ring-1 ${ui.chip} ${s.connected ? "" : "opacity-50"}`}
          >
            <span aria-hidden>{ui.symbol}</span>
            <span dir="auto">{s.name}</span>
            {why && (
              <span dir="auto" className="text-xs font-normal opacity-75">
                · {why}
              </span>
            )}
            {s.focusFlags > 0 && (
              <span
                title={t("left")}
                className="rounded bg-slate-800 px-1 text-xs text-white"
              >
                🔒 {s.focusFlags}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
