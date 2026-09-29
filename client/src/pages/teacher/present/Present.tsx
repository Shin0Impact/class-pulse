import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { EVENTS } from "@shared/events.ts";
import { emitAck, socket } from "../../../socket/socket.ts";
import { useSocketEvents, type SummaryState } from "../../../socket/useSocketEvents.ts";
import { getAccessToken } from "../../../auth/tokens.ts";
import { useAuth } from "../../../auth/AuthContext.tsx";
import { usePreferences } from "../../../context/PreferencesContext.tsx";
import { downloadDocument, generateQuestion, listDocuments, uploadDocument } from "../../../api/ai.ts";
import DraftEditor, { draftProblem, draftToQuestion, emptyDraft } from "../../../components/ai/DraftEditor.tsx";
import SummaryCard from "../../../components/ai/SummaryCard.tsx";
import DocumentViewer from "./DocumentViewer.tsx";
import { ACCEPTED, capturePage, closeDocument, openDocument, type OpenDocument } from "./documents.ts";
import type { BlindspotUpdate, DocumentInfo, QuestionDraft, QuestionKind, TeacherState } from "@shared/types.ts";
import "./Present.css";

type Live = { questionId: string; prompt: string; kind: QuestionKind; closed: boolean };


const MAX_FILE = 25 * 1024 * 1024;
const rememberKey = (code: string) => `classpulse:present:${code}`;

function remembered(code: string): { docId?: string; page?: number } {
  try {
    return JSON.parse(sessionStorage.getItem(rememberKey(code)) ?? "null") ?? {};
  } catch {
    return {};
  }
}
function remember(code: string, value: { docId?: string; page?: number }) {
  try {
    sessionStorage.setItem(rememberKey(code), JSON.stringify({ ...remembered(code), ...value }));
  } catch {
    // storage blocked: the page just won't reopen the file after a refresh
  }
}

// /teacher/:code/present -- the lesson file on the projector, with the "ask the class" panel beside
// it: generate a question from the page on screen (or write one), launch it, close it, and read
// the AI's summary of what the class is confused by.
export default function Present() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const { t, language } = usePreferences();
  const { ready, accountsEnabled, aiEnabled, profile } = useAuth();

  const [title, setTitle] = useState("");
  const [classError, setClassError] = useState("");

  const [doc, setDoc] = useState<OpenDocument | null>(null);
  const [page, setPage] = useState(1);
  const [docStatus, setDocStatus] = useState("");
  const [docError, setDocError] = useState("");
  const [recent, setRecent] = useState<DocumentInfo[]>([]);
  const [recentOpen, setRecentOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [panelOpen, setPanelOpen] = useState(true);
  const [kind, setKind] = useState<QuestionKind>("mcq");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [draftExcerpt, setDraftExcerpt] = useState<{ page: number; text: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [askError, setAskError] = useState("");
  const [live, setLive] = useState<Live | null>(null);
  const [update, setUpdate] = useState<BlindspotUpdate | null>(null);
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  // Newest request wins: a slow Regenerate/open that finishes after a newer action is ignored.
  const generation = useRef(0);
  const opening = useRef(0);

  // ---- attach this socket to the class as its teacher (also after a reconnect) ----
  const rejoin = useCallback(async () => {
    try {
      const { state } = await emitAck<{ state: TeacherState }>(EVENTS.TEACHER_REJOIN, {
        code,
        accessToken: await getAccessToken(),
      });
      setTitle(state.title);
      setClassError("");
      if (state.question) {
        setLive({
          questionId: state.question.questionId,
          prompt: state.question.prompt,
          kind: state.question.kind,
          closed: state.question.closed,
        });
        setUpdate(state.blindspot);
        setSummary(
          state.summary
            ? { questionId: state.summary.questionId, launchKey: state.blindspot?.launchKey, status: "ready", summary: state.summary }
            : null,
        );
      }
    } catch (e) {
      setClassError(e instanceof Error ? e.message : String(e));
    }
  }, [code]);

  useEffect(() => {
    if (!ready) return;
    rejoin();
    socket.on("connect", rejoin);
    return () => {
      socket.off("connect", rejoin);
    };
  }, [ready, rejoin]);

  useSocketEvents({
    [EVENTS.BLINDSPOT_UPDATE]: (u) => {
      setUpdate(u);
      // A question launched from the dashboard shows up here too.
      setLive((current) =>
        current?.questionId === u.questionId
          ? { ...current, closed: Boolean(u.closed) }
          : { questionId: u.questionId, prompt: "", kind: u.kind ?? "mcq", closed: Boolean(u.closed) },
      );
    },
    [EVENTS.SUMMARY_UPDATE]: (s) => setSummary(s),
    [EVENTS.SESSION_ENDED]: () => navigate(profile ? "/me" : "/"),
  });

  // ---- documents ----
  const show = useCallback((next: OpenDocument, startPage = 1) => {
    setDoc(next); // the effect below closes the previous one
    setPage(Math.min(Math.max(1, startPage), next.pages));
    setDraft(null);
  }, []);

  const openRecent = useCallback(
    async (info: { id: string; name: string }, startPage = 1) => {
      const mine = ++opening.current;
      setRecentOpen(false);
      setDocError("");
      setDocStatus(t("opening"));
      try {
        const blob = await downloadDocument(info.id);
        const next = await openDocument(blob, info.name);
        if (mine !== opening.current) return closeDocument(next); // a newer file was picked meanwhile
        show(next, startPage);
        remember(code, { docId: info.id, page: startPage });
      } catch (e) {
        setDocError(e instanceof Error ? e.message : String(e));
      } finally {
        setDocStatus("");
      }
    },
    [code, show, t],
  );

  // Recent uploads, and reopen what was on screen before a refresh.
  const canStore = accountsEnabled && profile?.role === "teacher";
  const restored = useRef(false);
  useEffect(() => {
    if (!canStore || restored.current) return;
    restored.current = true;
    const saved = remembered(code);
    listDocuments()
      .then((list) => {
        setRecent(list);
        const info = list.find((d) => d.id === saved.docId);
        if (info) openRecent(info, saved.page ?? 1);
      })
      .catch(() => {});
  }, [canStore, code, openRecent]);

  async function pickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setDocError("");
    if (!ACCEPTED.split(",").includes(file.type)) return setDocError(t("fileTypeError"));
    if (file.size > MAX_FILE) return setDocError(t("fileSizeError"));
    const mine = ++opening.current;
    setDocStatus(t("opening"));
    try {
      const next = await openDocument(file, file.name);
      if (mine !== opening.current) return closeDocument(next);
      show(next);
    } catch (err) {
      setDocStatus("");
      return setDocError(err instanceof Error ? err.message : String(err));
    }
    // Shown straight away from this computer; saved to the account in the background.
    if (canStore) {
      setDocStatus(t("savingFile"));
      try {
        const info = await uploadDocument(file);
        remember(code, { docId: info.id, page: 1 });
        setRecent((list) => [info, ...list.filter((d) => d.id !== info.id)]);
      } catch (err) {
        setDocError(`${t("saveFileFailed")} ${err instanceof Error ? err.message : ""}`);
      }
    }
    setDocStatus("");
  }

  const pages = doc?.pages ?? 1;
  const go = useCallback(
    (delta: number) =>
      setPage((p) => {
        const next = Math.min(pages, Math.max(1, p + delta));
        if (next !== p) remember(code, { page: next });
        return next;
      }),
    [code, pages],
  );

  // Clicker / keyboard: arrows, PageUp/PageDown (what presentation remotes send).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.closest("input, textarea, select, [contenteditable]") || e.altKey || e.ctrlKey || e.metaKey)) return;
      const rtl = document.documentElement.dir === "rtl";
      if (e.key === "PageDown" || e.key === (rtl ? "ArrowLeft" : "ArrowRight")) go(1);
      else if (e.key === "PageUp" || e.key === (rtl ? "ArrowRight" : "ArrowLeft")) go(-1);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  useEffect(() => () => closeDocument(doc), [doc]);

  // Projector mode: the site controls move into the top bar and the help bubble steps aside.
  useEffect(() => {
    document.body.classList.add("present-mode");
    return () => document.body.classList.remove("present-mode");
  }, []);

  // ---- asking ----
  async function generate() {
    if (!doc) return;
    const mine = ++generation.current;
    setGenerating(true);
    setAskError("");
    try {
      const capture = await capturePage(doc, page);
      const next = await generateQuestion(code, { kind, page: capture, correctAnswer: kind === "mcq" ? correctAnswer.trim() : undefined, language });
      if (mine !== generation.current) return; // launched, discarded or regenerated meanwhile
      setDraft(next);
      setDraftExcerpt({ page, text: capture.text });
    } catch (e) {
      if (mine === generation.current) setAskError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mine === generation.current) setGenerating(false);
    }
  }

  function writeOwn() {
    generation.current++;
    setGenerating(false);
    setAskError("");
    setDraft(emptyDraft(kind));
    setDraftExcerpt(null);
  }

  async function launch() {
    if (!draft) return;
    const problem = draftProblem(draft);
    if (problem) return setAskError(t(problem));
    generation.current++; // a Regenerate still running must not replace the live panel
    setGenerating(false);
    setBusy(true);
    setAskError("");
    try {
      const context = doc
        ? {
            documentName: doc.name || undefined,
            page: draftExcerpt?.page ?? page,
            excerpt: draftExcerpt?.text || undefined,
          }
        : undefined;
      await emitAck(EVENTS.TEACHER_LAUNCH_QUESTION, { question: { ...draftToQuestion(draft), context } });
      setLive({ questionId: draft.id, prompt: draft.prompt.trim(), kind: draft.kind, closed: false });
      setUpdate(null);
      setSummary(null);
      setShowAnswers(false);
      setDraft(null);
      setCorrectAnswer("");
    } catch (e) {
      setAskError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function closeLive() {
    setBusy(true);
    setAskError("");
    try {
      const res = await emitAck<{ summarizing: boolean }>(EVENTS.TEACHER_CLOSE_QUESTION, { language });
      setLive((l) => (l ? { ...l, closed: true } : l));
      if (res.summarizing && live) {
        setSummary({ questionId: live.questionId, launchKey: update?.launchKey, status: "working" });
      }
    } catch (e) {
      setAskError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function summarize() {
    setAskError("");
    try {
      await emitAck(EVENTS.TEACHER_SUMMARIZE, { language });
    } catch (e) {
      setAskError(e instanceof Error ? e.message : String(e));
    }
  }

  if (ready && accountsEnabled && !profile) return <Navigate to={`/login?next=${encodeURIComponent(`/teacher/${code}/present`)}`} replace />;

  const responses = update?.questionId === live?.questionId ? (update?.responses ?? 0) : 0;
  // Only the summary of this launch and round (deck ids repeat; a re-check is a new round).
  const liveSummary = summary && update && summary.launchKey === update.launchKey ? summary : null;
  const joinHost = window.location.host;

  return (
    <main className="present">
      <header className="present-bar">
        <Link to={`/teacher/${code}`} className="present-bar__back">
          {t("backToDashboard")}
        </Link>
        <div className="present-bar__doc" dir="auto">
          {doc ? doc.name : title || "Class Pulse"}
        </div>
        <div className="present-bar__tools">
          <button type="button" className="present-btn" onClick={() => fileInput.current?.click()}>
            {t("openFile")}
          </button>
          <input ref={fileInput} type="file" accept={ACCEPTED} hidden onChange={pickFile} />
          {canStore && recent.length > 0 && (
            <div className="present-recent">
              <button type="button" className="present-btn" aria-expanded={recentOpen} onClick={() => setRecentOpen((o) => !o)}>
                {t("recentFiles")} ▾
              </button>
              {recentOpen && (
                <ul className="present-recent__menu">
                  {recent.map((d) => (
                    <li key={d.id}>
                      <button type="button" onClick={() => openRecent(d)} dir="auto">
                        {d.name}
                        <small>{new Date(d.lastUsedAt).toLocaleDateString(language)}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {doc && doc.pages > 1 && (
            <div className="present-pager" role="group" aria-label={t("pageWord")}>
              <button type="button" className="present-btn" onClick={() => go(-1)} disabled={page <= 1} aria-label={t("prevPage")}>
                ‹
              </button>
              <span dir="ltr">
                {page} / {doc.pages}
              </span>
              <button type="button" className="present-btn" onClick={() => go(1)} disabled={page >= doc.pages} aria-label={t("nextPage")}>
                ›
              </button>
            </div>
          )}
          <button type="button" className="present-btn present-btn--accent" aria-expanded={panelOpen} onClick={() => setPanelOpen((o) => !o)}>
            ✦ {t("askTheClass")}
          </button>
        </div>
      </header>

      {(classError || docError || docStatus) && (
        <p className={`present-notice${classError || docError ? " present-notice--error" : ""}`} role={classError || docError ? "alert" : "status"}>
          {classError || docError || docStatus}
        </p>
      )}

      <div className={`present-body${panelOpen ? " present-body--panel" : ""}`}>
        {doc ? (
          <DocumentViewer doc={doc} page={page} />
        ) : (
          <div className="present-empty">
            <h1>{t("presentEmptyTitle")}</h1>
            <p>{t("presentEmptyHint")}</p>
            <button type="button" className="present-btn present-btn--accent" onClick={() => fileInput.current?.click()}>
              {t("openFile")}
            </button>
          </div>
        )}

        {panelOpen && (
          <aside className="present-panel" aria-label={t("askTheClass")}>
            <div className="present-join">
              <span>{t("joinAt")} {joinHost}/join</span>
              <strong dir="ltr">{code}</strong>
            </div>

            {live && !draft && (
              <section className="present-live">
                <p className="present-live__label">
                  {live.closed ? t("questionClosed") : t("questionLive")}
                </p>
                {live.prompt && (
                  <h2 dir="auto">{live.prompt}</h2>
                )}
                <p className="present-live__count">
                  <strong>{responses}</strong> {t("answered")}
                </p>
                {update && update.questionId === live.questionId && update.kind !== "open" && responses > 0 && (
                  <ul className="present-quadrants">
                    <li><b>{update.counts.mastered}</b> {t("qMastered")}</li>
                    <li><b>{update.counts.fragile}</b> {t("qFragile")}</li>
                    <li className="present-quadrants__alarm"><b>{update.counts.blindspot}</b> {t("qBlindspot")}</li>
                    <li><b>{update.counts.aware}</b> {t("qAware")}</li>
                  </ul>
                )}
                {update?.kind === "open" && update.questionId === live.questionId && (update.openAnswers?.length ?? 0) > 0 && (
                  <div className="present-answers">
                    <button type="button" className="present-link" onClick={() => setShowAnswers((s) => !s)}>
                      {showAnswers ? t("hideAnswers") : t("showAnswers")}
                    </button>
                    {showAnswers && (
                      <ul>
                        {update.openAnswers!.map((a) => (
                          <li key={a.id} dir="auto">
                            {a.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <div className="present-actions">
                  {!live.closed && (
                    <button type="button" className="present-btn present-btn--accent" onClick={closeLive} disabled={busy}>
                      {t("closeQuestion")}
                    </button>
                  )}
                  {aiEnabled && responses > 0 && liveSummary?.status !== "working" && (
                    <button type="button" className="present-btn" onClick={summarize}>
                      ✦ {liveSummary?.status === "ready" ? t("summarizeAgain") : t("summarize")}
                    </button>
                  )}
                </div>
                {liveSummary && (
                  <SummaryCard status={liveSummary.status} summary={liveSummary.summary} error={liveSummary.error} />
                )}
                {!liveSummary && live.closed && !aiEnabled && <p className="present-hint">{t("aiOffHint")}</p>}
                {live.kind === "mcq" && <p className="present-hint">{t("pairFromDashboard")}</p>}
                <button type="button" className="present-link" onClick={() => setLive(null)}>
                  + {t("askAnother")}
                </button>
              </section>
            )}

            {!live && !draft && (
              <section className="present-ask">
                <h2>{t("askAboutPage")}</h2>
                <div className="present-kind" role="radiogroup" aria-label={t("questionType")}>
                  {(["mcq", "open"] as const).map((k) => (
                    <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}>
                      {k === "mcq" ? t("multipleChoice") : t("openQuestion")}
                    </button>
                  ))}
                </div>
                {aiEnabled ? (
                  <>
                    {kind === "mcq" && (
                      <label className="present-field">
                        <span>{t("correctAnswerOptional")}</span>
                        <input type="text" dir="auto" maxLength={200} value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} />
                      </label>
                    )}
                    <button type="button" className="present-btn present-btn--accent present-btn--wide" onClick={generate} disabled={!doc || generating}>
                      {generating ? (
                        <>
                          <span className="ai-spinner" aria-hidden="true" /> {t("generating")}
                        </>
                      ) : (
                        <>✦ {doc ? `${t("generateFromPage")} ${doc.pages > 1 ? page : ""}`.trim() : t("generateFromPage")}</>
                      )}
                    </button>
                    {!doc && <p className="present-hint">{t("openFileFirst")}</p>}
                    <div className="present-or">{t("orWord")}</div>
                  </>
                ) : (
                  <p className="present-hint">{t("aiOffHint")}</p>
                )}
                <button type="button" className="present-btn present-btn--wide" onClick={writeOwn}>
                  {t("writeOwn")}
                </button>
              </section>
            )}

            {draft && (
              <section className="present-draft">
                <h2>
                  {draft.source === "ai" ? (
                    <>
                      <span className="ai-badge">✦ AI</span> {t("checkBeforeLaunch")}
                    </>
                  ) : (
                    t("writeOwn")
                  )}
                </h2>
                <DraftEditor draft={draft} onChange={setDraft} />
                <div className="present-actions">
                  <button type="button" className="present-btn present-btn--accent" onClick={launch} disabled={busy}>
                    {t("launchToClass")}
                  </button>
                  {draft.source === "ai" && (
                    <button type="button" className="present-btn" onClick={generate} disabled={generating}>
                      {generating ? t("generating") : t("regenerate")}
                    </button>
                  )}
                  <button
                    type="button"
                    className="present-link"
                    onClick={() => {
                      generation.current++;
                      setGenerating(false);
                      setDraft(null);
                    }}
                  >
                    {t("discard")}
                  </button>
                </div>
              </section>
            )}

            {askError && (
              <p className="present-notice present-notice--error" role="alert">
                {askError}
              </p>
            )}
          </aside>
        )}
      </div>
    </main>
  );
}
