import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { EVENTS } from "@shared/events.ts";
import { emitAck } from "../../socket/socket.ts";
import { useAuth } from "../../auth/AuthContext.tsx";
import { usePreferences } from "../../context/PreferencesContext.tsx";
import { downloadDocument, generateQuestion, listDocuments, uploadDocument } from "../../api/ai.ts";
import DocumentViewer from "../../pages/teacher/present/DocumentViewer.tsx";
import { ACCEPTED, capturePage, closeDocument, openDocument, type OpenDocument } from "../../pages/teacher/present/documents.ts";
import Button from "../ui/Button.tsx";
import DraftEditor, { draftProblem, draftToQuestion, emptyDraft } from "./DraftEditor.tsx";
import type { DocumentInfo, QuestionDraft, QuestionKind } from "@shared/types.ts";
import FileList from "./FileList.tsx";
import QuizDialog from "./QuizPanel.tsx";
import "../../pages/teacher/present/Present.css";

const MAX_FILE = 25 * 1024 * 1024;

// The dashboard's "ask the class": write your own question, or (only with a PDF / image uploaded)
// let the AI draft one from a page you pick. Nothing is sent to students until you launch it.
export default function QuestionStudio({ code, onLaunch }: { code: string; onLaunch?: () => void }) {
  const { t, language } = usePreferences();
  const { aiEnabled, accountsEnabled, profile } = useAuth();
  const canStore = accountsEnabled && profile?.role === "teacher";

  const [kind, setKind] = useState<QuestionKind>("mcq");
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [excerpt, setExcerpt] = useState<{ page: number; text: string } | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [doc, setDoc] = useState<OpenDocument | null>(null);
  const [page, setPage] = useState(1);
  const [recent, setRecent] = useState<DocumentInfo[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  // Newest request wins: a slow generate/open that finishes after a newer action is ignored.
  const generation = useRef(0);
  const opening = useRef(0);

  useEffect(() => () => closeDocument(doc), [doc]);

  useEffect(() => {
    if (!canStore || !aiEnabled) return;
    listDocuments().then(setRecent).catch(() => {});
  }, [canStore, aiEnabled]);

  const show = useCallback((next: OpenDocument) => {
    setDoc(next); // the effect above closes the previous one
    setPage(1);
  }, []);

  async function pickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (!ACCEPTED.split(",").includes(file.type)) return setError(t("fileTypeError"));
    if (file.size > MAX_FILE) return setError(t("fileSizeError"));
    const mine = ++opening.current;
    setStatus(t("opening"));
    try {
      const next = await openDocument(file, file.name);
      if (mine !== opening.current) return closeDocument(next);
      show(next);
    } catch (err) {
      setStatus("");
      return setError(err instanceof Error ? err.message : String(err));
    }
    if (canStore) {
      setStatus(t("savingFile"));
      try {
        const info = await uploadDocument(file);
        setRecent((list) => [info, ...list.filter((d) => d.id !== info.id)]);
      } catch (err) {
        setError(`${t("saveFileFailed")} ${err instanceof Error ? err.message : ""}`);
      }
    }
    setStatus("");
  }

  async function openRecent(info: DocumentInfo) {
    const mine = ++opening.current;
    setError("");
    setStatus(t("opening"));
    try {
      const next = await openDocument(await downloadDocument(info.id), info.name);
      if (mine !== opening.current) return closeDocument(next);
      show(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStatus("");
    }
  }

  function closeFile() {
    opening.current++;
    generation.current++;
    setGenerating(false);
    setDoc(null);
  }

  async function generate() {
    if (!doc) return;
    const mine = ++generation.current;
    setGenerating(true);
    setError("");
    setLaunched(false);
    try {
      const capture = await capturePage(doc, page);
      const next = await generateQuestion(code, {
        kind,
        page: capture,
        correctAnswer: kind === "mcq" ? correctAnswer.trim() : undefined,
        language,
      });
      if (mine !== generation.current) return;
      setDraft(next);
      setExcerpt({ page, text: capture.text });
    } catch (e) {
      if (mine === generation.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mine === generation.current) setGenerating(false);
    }
  }

  function writeOwn() {
    generation.current++;
    setGenerating(false);
    setError("");
    setLaunched(false);
    setDraft(emptyDraft(kind));
    setExcerpt(null);
  }

  function discard() {
    generation.current++;
    setGenerating(false);
    setDraft(null);
  }

  async function launch() {
    if (!draft) return;
    const problem = draftProblem(draft);
    if (problem) return setError(t(problem));
    generation.current++; // a Regenerate still running must not replace what was just launched
    setGenerating(false);
    setBusy(true);
    setError("");
    try {
      const context =
        doc && draft.source === "ai"
          ? { documentName: doc.name || undefined, page: excerpt?.page ?? page, excerpt: excerpt?.text || undefined }
          : undefined;
      onLaunch?.();
      await emitAck(EVENTS.TEACHER_LAUNCH_QUESTION, { question: { ...draftToQuestion(draft), context } });
      setDraft(null);
      setCorrectAnswer("");
      setLaunched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="present-kind qs-kind" role="radiogroup" aria-label={t("questionType")}>
        {(["mcq", "open"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}>
            {k === "mcq" ? t("multipleChoice") : t("openQuestion")}
          </button>
        ))}
      </div>

      {!draft && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={writeOwn}>
            ✎ {t("writeOwn")}
          </Button>
          {aiEnabled && (
            <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}>
              {t("aiFromFile")}
            </Button>
          )}
          <input ref={fileInput} type="file" accept={ACCEPTED} hidden onChange={pickFile} />
        </div>
      )}
      {!aiEnabled && !draft && <p className="text-base text-slate-500">{t("aiOffHint")}</p>}

      {launched && !draft && (
        <p className="rounded-xl bg-emerald-50 p-3 text-base text-emerald-800" role="status">
          ✓ {t("questionLive")}
        </p>
      )}

      {aiEnabled && !draft && !doc && (
        <>
          <p className="text-base text-slate-500">{t("aiFromFileHint")}</p>
          <FileList files={recent} canStore={canStore} onOpen={openRecent} />
        </>
      )}

      {status && <p className="text-base text-slate-500" role="status">{status}</p>}

      {doc && !draft && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 truncate text-base font-semibold" dir="auto">
              {doc.name}
            </span>
            <button type="button" className="text-base font-semibold text-slate-500 underline" onClick={closeFile}>
              {t("closeFile")}
            </button>
          </div>
          <div className="qs-preview">
            <DocumentViewer doc={doc} page={page} />
          </div>
          {doc.pages > 1 && (
            <div className="flex items-center justify-center gap-3" role="group" aria-label={t("pageWord")}>
              <Button type="button" variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label={t("prevPage")}>
                ‹
              </Button>
              <span dir="ltr" className="text-lg font-semibold">
                {page} / {doc.pages}
              </span>
              <Button type="button" variant="secondary" onClick={() => setPage((p) => Math.min(doc.pages, p + 1))} disabled={page >= doc.pages} aria-label={t("nextPage")}>
                ›
              </Button>
            </div>
          )}
          {kind === "mcq" && (
            <label className="block">
              <span className="mb-1 block text-base text-slate-500">{t("correctAnswerOptional")}</span>
              <input
                type="text"
                dir="auto"
                maxLength={200}
                className="w-full rounded-xl border border-slate-300 px-3 py-3"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
              />
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={generate} disabled={generating}>
              {generating ? (
                <>
                  <span className="ai-spinner" aria-hidden="true" /> {t("generating")}
                </>
              ) : (
                <>✦ {`${t("generateFromPage")} ${doc.pages > 1 ? page : ""}`.trim()}</>
              )}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setQuizOpen(true)}>
              ✦ {t("quizFromFile")}
            </Button>
          </div>
        </div>
      )}

      {draft && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold">
            {draft.source === "ai" ? (
              <>
                <span className="ai-badge">✦ AI</span> {t("checkBeforeLaunch")}
              </>
            ) : (
              t("writeOwn")
            )}
          </h3>
          <DraftEditor draft={draft} onChange={setDraft} />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={launch} disabled={busy}>
              {t("launchToClass")}
            </Button>
            {draft.source === "ai" && doc && (
              <Button type="button" variant="secondary" onClick={generate} disabled={generating}>
                {generating ? t("generating") : t("regenerate")}
              </Button>
            )}
            <button type="button" className="px-2 text-base font-semibold text-slate-500 underline" onClick={discard}>
              {t("discard")}
            </button>
          </div>
        </div>
      )}

      {quizStarted && (
        <p className="rounded-xl bg-emerald-50 p-3 text-base text-emerald-800" role="status">
          ✓ {t("quizLaunched")}
        </p>
      )}

      {quizOpen && doc && (
        <QuizDialog
          code={code}
          doc={doc}
          onClose={() => setQuizOpen(false)}
          onStarted={() => {
            setQuizOpen(false);
            setQuizStarted(true);
          }}
        />
      )}

      {error && (
        <p className="rounded-lg bg-rose-50 p-3 text-rose-800" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
