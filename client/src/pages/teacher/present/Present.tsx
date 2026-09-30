import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
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
import LiveStats from "../../../components/live/LiveStats.tsx";
import DocumentViewer, { type Fit } from "./DocumentViewer.tsx";
import { ACCEPTED, capturePage, captureSoFar, closeDocument, openDocument, type OpenDocument } from "./documents.ts";
import { SCREEN_CHANNEL, type ScreenMessage, type ScreenQuestion } from "./screenChannel.ts";
import SiteControls from "../../../components/global/SiteControls/SiteControls.tsx";
import type { BlindspotUpdate, DocumentInfo, Pulse, QuestionDraft, QuestionKind, TeacherState } from "@shared/types.ts";
import "./Present.css";

type Live = { questionId: string; prompt: string; kind: QuestionKind; closed: boolean; options?: { id: string; text: string }[] };


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
// True while the viewport matches the query (used for the phone layout).
function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

export default function Present() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const { t, language } = usePreferences();
  const { ready, accountsEnabled, aiEnabled, profile } = useAuth();

  const [title, setTitle] = useState("");
  const [classError, setClassError] = useState("");

  const [doc, setDoc] = useState<OpenDocument | null>(null);
  const [page, setPage] = useState(1);
  const [fit, setFit] = useState<Fit>("scroll");
  const phone = useMedia("(max-width: 700px)");
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  // leaving the phone layout (rotate / resize) must not leave the menu flagged open
  useEffect(() => {
    if (!phone) setMenuOpen(false);
  }, [phone]);
  const [draftScope, setDraftScope] = useState<"page" | "so_far">("page");
  const [fullscreen, setFullscreen] = useState(false);
  const [docStatus, setDocStatus] = useState("");
  const [docError, setDocError] = useState("");
  const [recent, setRecent] = useState<DocumentInfo[]>([]);
  const [recentOpen, setRecentOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<{ blob: Blob; name: string } | null>(null);
  // The saved copy of the open file (in the teacher's account). A Screen window on another device
  // of the same account downloads this itself, so no file passes through the server relay.
  const [savedDoc, setSavedDoc] = useState<{ id: string; name: string } | null>(null);

  const [panelOpen, setPanelOpen] = useState(() => !window.matchMedia("(max-width: 700px)").matches); // phones start on the slide
  const [kind, setKind] = useState<QuestionKind>("mcq");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [draftExcerpt, setDraftExcerpt] = useState<{ page: number; text: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [askError, setAskError] = useState("");
  const [live, setLive] = useState<Live | null>(null);
  const [update, setUpdate] = useState<BlindspotUpdate | null>(null);
  const [pulse, setPulse] = useState<Pulse | null>(null);
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
      setPulse(state.pulse);
      setClassError("");
      if (state.question) {
        setLive({
          questionId: state.question.questionId,
          prompt: state.question.prompt,
          kind: state.question.kind,
          closed: state.question.closed,
          options: state.question.options?.map((o) => ({ id: o.id, text: o.text })),
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
    [EVENTS.PULSE_UPDATE]: (p) => setPulse(p),
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
    [EVENTS.SESSION_ENDED]: (data) =>
      navigate(data?.classId && profile?.role === "teacher" ? `/me/classes/${data.classId}` : profile ? "/me" : "/"),
  });

  // ---- documents ----
  const show = useCallback((next: OpenDocument, startPage = 1, blob?: Blob) => {
    sourceRef.current = blob ? { blob, name: next.name } : null; // what the Screen window is sent
    setSavedDoc(null); // until it is known to be saved (below)
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
        show(next, startPage, blob);
        setSavedDoc({ id: info.id, name: info.name });
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
      show(next, 1, file);
    } catch (err) {
      setDocStatus("");
      return setDocError(err instanceof Error ? err.message : String(err));
    }
    // Shown straight away from this computer; saved to the account in the background.
    if (canStore) {
      setDocStatus(t("savingFile"));
      try {
        const info = await uploadDocument(file);
        if (mine === opening.current) setSavedDoc({ id: info.id, name: info.name });
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

  // Full screen for this window (the projector); Esc leaves it.
  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  // Clicker / keyboard: arrows, PageUp/PageDown (what presentation remotes send).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.closest("input, textarea, select, [contenteditable]") || e.altKey || e.ctrlKey || e.metaKey)) return;
      const rtl = document.documentElement.dir === "rtl";
      if (e.key.toLowerCase() === "f") return toggleFullscreen();
      if (e.key === "PageDown" || e.key === (rtl ? "ArrowLeft" : "ArrowRight")) go(1);
      else if (e.key === "PageUp" || e.key === (rtl ? "ArrowRight" : "ArrowLeft")) go(-1);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, toggleFullscreen]);

  useEffect(() => () => closeDocument(doc), [doc]);

  // Projector mode: the site controls move into the top bar and the help bubble steps aside.
  useEffect(() => {
    document.body.classList.add("present-mode");
    return () => document.body.classList.remove("present-mode");
  }, []);

  // ---- Screen window: a second window that shows only the slide (for the projector) ----
  // What students see is mirrored to it: the page, and the live question without any answers.
  const screenQuestion = useMemo<ScreenQuestion | null>(
    () =>
      live && live.prompt
        ? { prompt: live.prompt, options: live.kind === "mcq" ? (live.options ?? []) : [], closed: live.closed }
        : null,
    [live],
  );
  const channelRef = useRef<BroadcastChannel | null>(null);
  const screenWin = useRef<Window | null>(null);
  const scrollRef = useRef(0); // the vertical scroll of this window (0..1), mirrored to the Screen window
  const mirror = useRef({ page, screenQuestion, fit, savedDoc });
  mirror.current = { page, screenQuestion, fit, savedDoc };
  const remoteTimer = useRef<number | null>(null);

  const sendDoc = useCallback(() => {
    const src = sourceRef.current;
    channelRef.current?.postMessage(
      (src ? { type: "doc", blob: src.blob, name: src.name } : { type: "nodoc" }) satisfies ScreenMessage,
    );
  }, []);
  // Another device (same teacher account) mirrors the same state through the server: a few small
  // messages, at most about ten a second while scrolling.
  // Sent straight away, then at most every 60 ms: waiting 100 ms before sending anything (as before) added
  // that much to every page turn on top of the network trip to the server and back.
  const pendingRemote = useRef(false);
  const sendRemote = useCallback(() => {
    if (remoteTimer.current !== null) {
      pendingRemote.current = true;
      return;
    }
    const m = mirror.current;
    socket.emit(EVENTS.TEACHER_SCREEN_STATE, {
      state: { doc: m.savedDoc, page: m.page, question: m.screenQuestion, fit: m.fit, scroll: scrollRef.current },
    });
    remoteTimer.current = window.setTimeout(() => {
      remoteTimer.current = null;
      if (pendingRemote.current) {
        pendingRemote.current = false;
        sendRemote();
      }
    }, 60);
  }, []);
  useEffect(
    () => () => {
      if (remoteTimer.current !== null) window.clearTimeout(remoteTimer.current);
    },
    [],
  );
  const sendState = useCallback(() => {
    sendRemote();
    channelRef.current?.postMessage({
      type: "state",
      page: mirror.current.page,
      question: mirror.current.screenQuestion,
      fit: mirror.current.fit,
      scroll: scrollRef.current,
    } satisfies ScreenMessage);
  }, [sendRemote]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(SCREEN_CHANNEL(code));
    channelRef.current = channel;
    channel.onmessage = (e: MessageEvent<ScreenMessage>) => {
      if (e.data?.type === "hello") {
        sendDoc();
        sendState();
      }
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [code, sendDoc, sendState]);
  useEffect(sendDoc, [doc, sendDoc]);
  useEffect(() => {
    scrollRef.current = 0; // a new file or mode starts at the top
  }, [doc, fit]);
  useEffect(sendState, [page, screenQuestion, fit, savedDoc, sendState]);
  useEffect(() => {
    // after a reconnect the server has forgotten this socket is the teacher until rejoin() finishes
    const again = () => window.setTimeout(sendRemote, 1000);
    socket.on("connect", again);
    return () => {
      socket.off("connect", again);
    };
  }, [sendRemote]);
  // scroll mode: the teacher scrolled and a different page is now in the middle of the view
  const onScrolledToPage = useCallback(
    (p: number) => {
      setPage(p);
      remember(code, { page: p });
    },
    [code],
  );
  const onScrollRatio = useCallback(
    (ratio: number) => {
      scrollRef.current = ratio;
      sendState();
    },
    [sendState],
  );


  function openScreen() {
    if (screenWin.current && !screenWin.current.closed) return screenWin.current.focus();
    setDocError("");
    const w = window.open(`/teacher/${encodeURIComponent(code)}/screen`, "classpulse-screen", "popup=yes,width=1280,height=720");
    screenWin.current = w;
    if (!w) setDocError(t("screenBlocked"));
  }

  // ---- asking ----
  // scope "page": a question about the page on screen. "so_far": one about everything shown from
  // page 1 up to the page on screen.
  async function generate(scope: "page" | "so_far" = "page") {
    if (!doc) return;
    const mine = ++generation.current;
    setGenerating(true);
    setAskError("");
    try {
      const capture = scope === "so_far" ? await captureSoFar(doc, page) : await capturePage(doc, page);
      const next = await generateQuestion(code, {
        kind,
        page: capture,
        scope,
        upToPage: scope === "so_far" ? page : undefined,
        correctAnswer: kind === "mcq" ? correctAnswer.trim() : undefined,
        language,
      });
      if (mine !== generation.current) return; // launched, discarded or regenerated meanwhile
      setDraft(next);
      setDraftScope(scope);
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
      setLive({
        questionId: draft.id,
        prompt: draft.prompt.trim(),
        kind: draft.kind,
        closed: false,
        options: draft.kind === "mcq" ? draft.options.map((o) => ({ id: o.id, text: o.text.trim() })) : undefined,
      });
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
        <Link to={`/teacher/${code}`} className="present-bar__back" aria-label={t("backToDashboard")}>
          {phone ? "←" : t("backToDashboard")}
        </Link>
        <div className="present-bar__doc" dir="auto">
          {doc ? doc.name : title || "Class Pulse"}
        </div>
        {phone && (
          <button type="button" className="present-btn present-bar__more" aria-expanded={menuOpen} aria-label={t("moreMenu")} onClick={() => setMenuOpen((o) => !o)}>
            ☰
          </button>
        )}
        <div className={`present-bar__tools${phone ? (menuOpen ? " is-open" : " is-closed") : ""}`}>
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
          {doc && (
            <button
              type="button"
              className="present-btn"
              aria-pressed={fit === "scroll"}
              onClick={() => setFit((f) => (f === "page" ? "scroll" : "page"))}
              title={t("fitHint")}
            >
              {fit === "page" ? `≣ ${t("scrollMode")}` : `▭ ${t("pageMode")}`}
            </button>
          )}
          <button type="button" className="present-btn" onClick={toggleFullscreen}>
            {fullscreen ? `⤡ ${t("exitFullscreen")}` : `⛶ ${t("fullscreen")}`}
          </button>
          <button type="button" className="present-btn" onClick={openScreen} title={t("screenWindowHint")}>
            ⧉ {t("screenWindow")}
          </button>
          {!phone && (
            <button type="button" className="present-btn present-btn--accent" aria-expanded={panelOpen} onClick={() => setPanelOpen((o) => !o)}>
              ✦ {t("askTheClass")}
            </button>
          )}
          {phone && <SiteControls />}
        </div>
        {!phone && <SiteControls />}
      </header>

      {phone && menuOpen && <div className="present-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <LiveStats className="live-stats--bar" pulse={pulse} answered={live ? responses : null} />

      {phone && (
        <div className="present-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={!panelOpen} onClick={() => setPanelOpen(false)}>
            {t("slideTab")}
          </button>
          <button type="button" role="tab" aria-selected={panelOpen} onClick={() => setPanelOpen(true)}>
            ✦ {t("askTheClass")}
          </button>
        </div>
      )}

      {(classError || docError || docStatus) && (
        <p className={`present-notice${classError || docError ? " present-notice--error" : ""}`} role={classError || docError ? "alert" : "status"}>
          {classError || docError || docStatus}
        </p>
      )}

      <div className={`present-body${panelOpen ? " present-body--panel" : ""}`}>
        {doc ? (
          <DocumentViewer doc={doc} page={page} fit={fit} onPageChange={onScrolledToPage} onScrollRatio={onScrollRatio} />
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
                    <button type="button" className="present-btn present-btn--accent present-btn--wide" onClick={() => generate("page")} disabled={!doc || generating}>
                      {generating ? (
                        <>
                          <span className="ai-spinner" aria-hidden="true" /> {t("generating")}
                        </>
                      ) : (
                        <>✦ {doc ? `${t("generateFromPage")} ${doc.pages > 1 ? page : ""}`.trim() : t("generateFromPage")}</>
                      )}
                    </button>
                    {doc && doc.pages > 1 && page > 1 && (
                      <button type="button" className="present-btn present-btn--wide" onClick={() => generate("so_far")} disabled={generating}>
                        ✦ {t("askSoFar")} (1–{page})
                      </button>
                    )}
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
                    <button type="button" className="present-btn" onClick={() => generate(draftScope)} disabled={generating}>
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

      {phone && live && !panelOpen && (
        <div className="present-livebar" role="status">
          <div className="present-livebar__text">
            <span>{live.closed ? t("questionClosed") : t("questionLive")}</span>
            <span>
              <b dir="ltr">{responses}</b> {t("answered")}
            </span>
          </div>
          {live.closed ? (
            <button type="button" className="present-btn" onClick={() => setPanelOpen(true)}>
              {t("seeResults")}
            </button>
          ) : (
            <button type="button" className="present-btn present-btn--accent" onClick={closeLive} disabled={busy}>
              {t("closeQuestion")}
            </button>
          )}
        </div>
      )}
    </main>
  );
}
