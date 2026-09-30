import { useEffect, useMemo, useRef, useState } from "react";
import { usePreferences } from "../../context/PreferencesContext.tsx";
import Button from "../ui/Button.tsx";
import type { DocumentInfo } from "@shared/types.ts";

// The "choose a file" pop-up for the dashboard: upload a new PDF / image, or reuse one already
// saved. The list scrolls inside the pop-up and can be searched, so a long history stays tidy.
export default function FilePicker({
  files,
  canStore,
  onPick,
  onUpload,
  onClose,
}: {
  files: DocumentInfo[];
  canStore: boolean;
  onPick: (file: DocumentInfo) => void;
  onUpload: () => void;
  onClose: () => void;
}) {
  const { t, language } = usePreferences();
  const [query, setQuery] = useState("");
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? files.filter((f) => f.name.toLowerCase().includes(q)) : files;
  }, [files, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t("pickFileTitle")}
        className="flex max-h-[85dvh] w-full max-w-lg flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl outline-none"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">{t("pickFileTitle")}</h2>
            <p className="text-base text-slate-500">{t("aiFromFileHint")}</p>
          </div>
          <button type="button" className="shrink-0 rounded-lg px-2 text-2xl leading-none text-slate-500" onClick={onClose} aria-label={t("closeFile")}>
            ×
          </button>
        </header>

        <Button type="button" onClick={onUpload}>
          ⬆ {t("uploadNew")}
        </Button>

        {canStore && (
          <section className="flex min-h-0 flex-1 flex-col gap-2" aria-label={t("myFiles")}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {t("myFiles")} <span dir="ltr">({files.length})</span>
              </h3>
            </div>
            {files.length === 0 ? (
              <p className="text-base text-slate-500">{t("noFilesYet")}</p>
            ) : (
              <>
                {files.length > 5 && (
                  <input
                    type="search"
                    dir="auto"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                    placeholder={t("searchFiles")}
                    aria-label={t("searchFiles")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                )}
                {shown.length === 0 ? (
                  <p className="text-base text-slate-500">{t("noMatchingFiles")}</p>
                ) : (
                  <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                    {shown.map((f) => (
                      <li key={f.id}>
                        <button type="button" onClick={() => onPick(f)} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-start hover:bg-slate-50">
                          <span className="min-w-0 truncate font-medium text-slate-900" dir="auto">
                            📄 {f.name}
                          </span>
                          <span className="shrink-0 text-sm text-slate-500">{new Date(f.lastUsedAt).toLocaleDateString(language)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
