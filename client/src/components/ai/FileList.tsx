import { usePreferences } from "../../context/PreferencesContext.tsx";
import type { DocumentInfo } from "@shared/types.ts";

// The teacher's already-uploaded files (same list as "My files" on the Present page): pick one
// instead of uploading it again.
export default function FileList({
  files,
  canStore,
  onOpen,
  selectedId,
}: {
  files: DocumentInfo[];
  canStore: boolean;
  onOpen: (file: DocumentInfo) => void;
  selectedId?: string;
}) {
  const { t, language } = usePreferences();
  if (!canStore) return null;
  if (files.length === 0) return <p className="text-base text-slate-500">{t("noFilesYet")}</p>;
  return (
    <section aria-label={t("recentFiles")}>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t("myFiles")}</h3>
      <ul className="max-h-52 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
        {files.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => onOpen(f)}
              aria-current={selectedId === f.id}
              className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-start hover:bg-slate-50 ${selectedId === f.id ? "bg-indigo-50" : ""}`}
            >
              <span className="min-w-0 truncate font-medium" dir="auto">
                📄 {f.name}
              </span>
              <span className="shrink-0 text-sm text-slate-500">{new Date(f.lastUsedAt).toLocaleDateString(language)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
