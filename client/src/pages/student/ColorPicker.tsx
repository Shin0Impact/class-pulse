import { useState } from "react";
import { REASONS } from "@shared/events.ts";
import { usePreferences } from "../../context/PreferencesContext.tsx";
import type { Mark } from "@shared/types.ts";

const CUSTOM_REASON_PREFIX = "other:";

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

  const existingCustomReason = reason?.startsWith(CUSTOM_REASON_PREFIX)
    ? reason.slice(CUSTOM_REASON_PREFIX.length)
    : "";

  const [showOtherReason, setShowOtherReason] = useState(
    Boolean(existingCustomReason),
  );

  const [customReason, setCustomReason] = useState(existingCustomReason);

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

  function getReasonLabel(id: string) {
    switch (id) {
      case "too-fast":
        return t("reasonTooFast");

      case "unclear-steps":
        return t("reasonUnclearSteps");

      case "need-example":
        return t("reasonNeedExample");

      case "missing-basics":
        return t("reasonMissingBasics");

      default:
        return id;
    }
  }

  function selectPresetReason(id: string) {
    setShowOtherReason(false);
    setCustomReason("");

    onReason(id);
  }

  function selectOtherReason() {
    setShowOtherReason(true);

    if (reason && !reason.startsWith(CUSTOM_REASON_PREFIX)) {
      onReason("");
    }
  }

  function submitCustomReason() {
    const cleaned = customReason.trim();

    if (!cleaned) return;

    onReason(`${CUSTOM_REASON_PREFIX}${cleaned}`);
  }

  const customSelected = reason?.startsWith(CUSTOM_REASON_PREFIX) ?? false;

  return (
    <section>
      <ul className="space-y-3">
        {O.map((x) => {
          const on = status === x.id;

          return (
            <li key={x.id}>
              <button
                type="button"
                onClick={() => {
                  onStatus(x.id);

                  if (x.id === "green") {
                    setShowOtherReason(false);
                    setCustomReason("");
                  }
                }}
                aria-pressed={on}
                className={`flex min-h-24 w-full items-center gap-4 rounded-3xl border-4 p-4 text-start transition ${
                  on ? x.o : "border-slate-200 bg-white"
                }`}
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
                  type="button"
                  onClick={() => selectPresetReason(r.id)}
                  className={`rounded-full border-2 px-4 py-2 text-sm transition ${
                    reason === r.id
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  {getReasonLabel(r.id)}
                </button>
              </li>
            ))}

            <li>
              <button
                type="button"
                onClick={selectOtherReason}
                className={`rounded-full border-2 px-4 py-2 text-sm transition ${
                  showOtherReason || customSelected
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                {t("reasonOther")}
              </button>
            </li>
          </ul>

          {showOtherReason && (
            <div className="mt-4">
              <label
                htmlFor="custom-reason"
                className="mb-2 block text-sm font-medium text-slate-600"
              >
                {t("reasonOtherLabel")}
              </label>

              <textarea
                id="custom-reason"
                value={customReason}
                maxLength={160}
                rows={3}
                dir="auto"
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder={t("reasonOtherPlaceholder")}
                className="w-full resize-none rounded-2xl border-2 border-slate-200 bg-white p-4 text-base outline-none transition focus:border-indigo-500"
              />

              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  {customReason.length}/160
                </span>

                <button
                  type="button"
                  disabled={!customReason.trim()}
                  onClick={submitCustomReason}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("reasonSend")}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
