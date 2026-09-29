import { useEffect, useState } from "react";
import {
  REASONS,
  CUSTOM_REASON_PREFIX,
  CUSTOM_REASON_MAX,
  isCustomReason,
  customReasonText,
} from "@shared/events.ts";
import { usePreferences } from "../../context/PreferencesContext.tsx";
import { reasonLabel } from "../../components/reasonLabel.ts";
import type { Mark } from "@shared/types.ts";
export default function ColorPicker({
  status,
  reason,
  onStatus,
  onReason,
}: {
  status: Mark | null;
  reason: string | null;
  onStatus: (s: Mark) => void;
  onReason: (r: string) => void;
}) {
  const { t } = usePreferences();

  // "Other": the student writes their own reason. The box is open while their current reason is
  // custom, or after they tap the chip. It resets when they change color.
  const [otherOpen, setOtherOpen] = useState(isCustomReason(reason));
  const [otherText, setOtherText] = useState(
    isCustomReason(reason) ? customReasonText(reason) : "",
  );
  useEffect(() => {
    setOtherOpen(isCustomReason(reason));
    setOtherText(isCustomReason(reason) ? customReasonText(reason) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  const sentOther = isCustomReason(reason) ? customReasonText(reason) : null;
  const canSend = otherText.trim().length > 0 && otherText.trim() !== sentOther;
  const O = [
    {
      id: "green" as Mark,
      l: t("followGreen"),
      h: t("keep"),
      s: "✓",
      d: "bg-emerald-500",
      o: "border-emerald-600 bg-emerald-50",
    },
    {
      id: "yellow" as Mark,
      l: t("unsure"),
      h: t("bitLost"),
      s: "~",
      d: "bg-amber-400",
      o: "border-amber-500 bg-amber-50",
    },
    {
      id: "red" as Mark,
      l: t("lost"),
      h: t("slow"),
      s: "✗",
      d: "bg-rose-500",
      o: "border-rose-600 bg-rose-50",
    },
  ];
  return (
    <section>
      <ul className="space-y-3">
        {O.map((x) => {
          const on = status === x.id;
          return (
            <li key={x.id}>
              <button
                onClick={() => onStatus(x.id)}
                aria-pressed={on}
                className={`flex min-h-24 w-full items-center gap-4 rounded-3xl border-4 p-4 text-start transition ${on ? x.o : "border-slate-200 bg-white"}`}
              >
                <span
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white ${x.d}`}
                >
                  {x.s}
                </span>
                <span>
                  <strong className="block text-2xl">{x.l}</strong>
                  <span className="block text-slate-500">{x.h}</span>
                </span>
                {on && (
                  <span className="ms-auto text-sm font-semibold">
                    {t("selected")}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {(status === "yellow" || status === "red") && (
        <section className="mt-5">
          <p className="mb-2 text-sm font-medium text-slate-600">
            {t("helpOptional")}
          </p>
          <ul className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => {
                    setOtherOpen(false);
                    onReason(r.id);
                  }}
                  className={`rounded-full border-2 px-4 py-2 text-sm ${reason === r.id ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white"}`}
                >
                  {reasonLabel(r.id, t) ?? r.label}
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={() => setOtherOpen(true)}
                aria-expanded={otherOpen}
                className={`rounded-full border-2 px-4 py-2 text-sm ${otherOpen || sentOther ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white"}`}
              >
                {t("reasonOther")}
              </button>
            </li>
          </ul>

          {otherOpen && (
            <div className="mt-4">
              <label
                htmlFor="custom-reason"
                className="mb-2 block text-sm font-medium text-slate-600"
              >
                {t("reasonOtherLabel")}
              </label>
              <textarea
                id="custom-reason"
                dir="auto"
                rows={3}
                maxLength={CUSTOM_REASON_MAX}
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder={t("reasonOtherPlaceholder")}
                className="w-full resize-none rounded-2xl border-2 border-slate-200 bg-white p-4 text-base outline-none focus:border-indigo-500"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  {otherText.length}/{CUSTOM_REASON_MAX}
                </span>
                {sentOther && !canSend ? (
                  <span className="text-sm font-medium text-emerald-700" role="status">
                    ✓ {t("reasonSent")}
                  </span>
                ) : (
                  <button
                    disabled={!canSend}
                    onClick={() => onReason(CUSTOM_REASON_PREFIX + otherText.trim())}
                    className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {t("reasonSend")}
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
