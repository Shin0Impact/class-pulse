import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { usePreferences } from "../../../context/PreferencesContext.tsx";
import DocumentViewer, { type Fit } from "./DocumentViewer.tsx";
import { closeDocument, openDocument, type OpenDocument } from "./documents.ts";
import { EVENTS } from "@shared/events.ts";
import { socket } from "../../../socket/socket.ts";
import { getAccessToken } from "../../../auth/tokens.ts";
import { downloadDocument } from "../../../api/ai.ts";
import { SCREEN_CHANNEL, type ScreenMessage, type ScreenQuestion } from "./screenChannel.ts";
import "./Present.css";

// /teacher/:code/screen -- the slide and nothing else, for the projector or a shared screen.
// Two ways to follow the teacher's Present window, both carrying only what students see (the page and
// the live question's prompt and options: never which answer is right, never results):
//  - same browser: a BroadcastChannel, which also hands over the file;
//  - another device signed in as the same teacher: small messages through the server, and this
//    window downloads the file from the teacher's saved files itself.
type RemoteState = {
  doc: { id: string; name: string } | null;
  page: number;
  question: ScreenQuestion | null;
  fit: Fit;
  scroll: number;
};

export default function Screen() {
  const { code = "" } = useParams();
  const { t } = usePreferences();
  const [doc, setDoc] = useState<OpenDocument | null>(null);
  const [page, setPage] = useState(1);
  const [question, setQuestion] = useState<ScreenQuestion | null>(null);
  const [fit, setFit] = useState<Fit>("page");
  const [scroll, setScroll] = useState(0);
  const [error, setError] = useState("");
  const [unsupported] = useState(typeof BroadcastChannel === "undefined");
  const opening = useRef(0);
  const joinToken = useRef<string | null>(null);
  const fromChannel = useRef(false); // a same-browser Present window handed over the file: no need to download it
  const remoteDocId = useRef<string | null>(null);
  // When the Present window in this same browser is talking to us directly, the copy of the same state
  // that comes round through the server is always older (it travelled to the server and back), and
  // applying it made the page jump back and lag. The server copy is only used when the direct one is silent.
  const lastDirect = useRef(0);
  const [remoteError, setRemoteError] = useState("");

  useEffect(() => {
    document.body.classList.add("present-mode", "screen-mode");
    return () => document.body.classList.remove("present-mode", "screen-mode");
  }, []);

  useEffect(() => {
    if (unsupported) return;
    const channel = new BroadcastChannel(SCREEN_CHANNEL(code));
    channel.onmessage = async (e: MessageEvent<ScreenMessage>) => {
      const m = e.data;
      if (m?.type === "state") {
        lastDirect.current = Date.now();
        setPage(m.page);
        setQuestion(m.question);
        setFit(m.fit);
        setScroll(m.scroll);
      } else if (m?.type === "doc") {
        fromChannel.current = true;
        const mine = ++opening.current;
        try {
          const next = await openDocument(m.blob, m.name);
          if (mine !== opening.current) return closeDocument(next);
          setError("");
          setDoc(next);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } else if (m?.type === "nodoc") {
        opening.current++;
        setDoc(null);
      }
    };
    channel.postMessage({ type: "hello" } satisfies ScreenMessage);
    return () => channel.close();
  }, [code, unsupported]);

  useEffect(() => {
    let alive = true;
    const apply = async (s: RemoteState) => {
      if (Date.now() - lastDirect.current < 3000) return;
      setPage(s.page);
      setQuestion(s.question);
      setFit(s.fit);
      setScroll(s.scroll);
      const id = s.doc?.id ?? null;
      if (id === remoteDocId.current || fromChannel.current) return;
      remoteDocId.current = id;
      const mine = ++opening.current;
      if (!s.doc) return setDoc(null);
      try {
        const blob = await downloadDocument(s.doc.id);
        const next = await openDocument(blob, s.doc.name);
        if (!alive || mine !== opening.current) return closeDocument(next);
        setError("");
        setDoc(next);
      } catch (err) {
        remoteDocId.current = null; // try again on the next update
        if (alive) setError(err instanceof Error ? err.message : String(err));
      }
    };
    const join = async () => {
      try {
        const res = await new Promise<{ ok: boolean; error?: string; state?: RemoteState | null }>((resolve) =>
          socket.timeout(8000).emit(EVENTS.SCREEN_JOIN, { code, accessToken: joinToken.current }, (err: Error | null, r: never) =>
            resolve(err ? { ok: false, error: "The server did not respond." } : r),
          ),
        );
        if (!alive) return;
        if (!res.ok) return setRemoteError(res.error ?? "");
        setRemoteError("");
        if (res.state) void apply(res.state);
      } catch {
        /* the same-browser channel still works */
      }
    };
    const onState = (s: RemoteState) => void apply(s);
    const onConnect = () => void getAccessToken().then((tk) => { joinToken.current = tk ?? null; void join(); });
    socket.on(EVENTS.SCREEN_STATE, onState);
    socket.on("connect", onConnect);
    if (socket.connected) onConnect();
    return () => {
      alive = false;
      socket.off(EVENTS.SCREEN_STATE, onState);
      socket.off("connect", onConnect);
    };
  }, [code]);

  useEffect(() => () => closeDocument(doc), [doc]);

  // F or a double-click: full screen (a projector wants no browser chrome).
  useEffect(() => {
    const toggle = () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen?.().catch(() => {});
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey && !e.altKey) toggle();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("dblclick", toggle);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("dblclick", toggle);
    };
  }, []);

  const shownPage = doc ? Math.min(Math.max(1, page), doc.pages) : 1;
  const showQuestion = question && question.prompt;

  return (
    <main className="screen">
      {doc ? (
        <DocumentViewer doc={doc} page={shownPage} fit={fit} scrollRatio={fit === "scroll" ? scroll : undefined} />
      ) : (
        <div className="present-empty">
          <h1>{remoteError || (unsupported ? t("screenUnsupported") : t("screenWaiting"))}</h1>
          <p>{t("screenFullscreenHint")}</p>
        </div>
      )}
      {error && (
        <p className="present-notice present-notice--error" role="alert">
          {error}
        </p>
      )}

      {showQuestion && (
        <section className="screen-question" aria-live="polite">
          <p className="screen-question__label">
            {question.closed ? t("screenAnswersClosed") : t("screenLiveQuestion")}
          </p>
          <h2 dir="auto">{question.prompt}</h2>
          {question.options.length > 0 && (
            <ol className="screen-question__options">
              {question.options.map((o, i) => (
                <li key={o.id} dir="auto">
                  <b>{String.fromCharCode(65 + i)}</b> {o.text}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </main>
  );
}
