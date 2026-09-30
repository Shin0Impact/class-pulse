import { useEffect, useRef } from "react";
import { usePreferences } from "../../context/PreferencesContext.tsx";
import Button from "./Button.tsx";

// Our own "Are you sure?" pop-up, in place of the browser's window.confirm (which can't be styled,
// translated to match the page, or shown in dark mode). Escape or a click outside cancels.
export default function ConfirmDialog({
  message,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = usePreferences();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        ref={panel}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-label={message}
        className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl outline-none"
      >
        <p className="text-lg font-semibold text-slate-900">{message}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button type="button" variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
