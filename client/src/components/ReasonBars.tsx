import { usePreferences } from "../context/PreferencesContext.tsx";
import { reasonLabel } from "./reasonLabel.ts";
import type { ReasonCount } from "@shared/types.ts";

const MAX_NOTES = 5;

// "What would help": the reasons students gave when they marked Not sure / Lost.
// `notes` are the students' own words from the "Other" option (anonymous, no names).
export default function ReasonBars({
  reasons,
  notes = [],
}: {
  reasons?: ReasonCount[];
  notes?: string[];
}) {
  const { t } = usePreferences();
  if (!reasons?.length)
    return <p className="text-sm text-slate-500">{t("noReason")}</p>;
  const max = Math.max(...reasons.map((r) => r.count));
  return (
    <>
    <ul className="space-y-2">
      {reasons.map((r) => (
        <li key={r.id}>
          <div className="mb-0.5 flex justify-between text-sm">
            <span className="font-medium">{reasonLabel(r.id, t) ?? r.label}</span>
            <span className="tabular-nums text-slate-500">{r.count}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${(100 * r.count) / max}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
    {notes.length > 0 && (
      <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm text-slate-600">
        {notes.slice(0, MAX_NOTES).map((n) => (
          <li key={n} dir="auto" className="break-words">
            “{n}”
          </li>
        ))}
        {notes.length > MAX_NOTES && (
          <li className="text-xs text-slate-400">+{notes.length - MAX_NOTES}</li>
        )}
      </ul>
    )}
    </>
  );
}
