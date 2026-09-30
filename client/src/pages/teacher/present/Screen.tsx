import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { usePreferences } from "../../../context/PreferencesContext.tsx";
import DocumentViewer, { type Fit } from "./DocumentViewer.tsx";
import { closeDocument, openDocument, type OpenDocument } from "./documents.ts";
import { SCREEN_CHANNEL, type ScreenMessage, type ScreenQuestion } from "./screenChannel.ts";
import "./Present.css";

// /teacher/:code/screen -- the slide and nothing else, for the projector or a shared screen.
// It never talks to the server: the teacher's Present window sends it the file, the page number and
// the live question (prompt and options only: never which answer is right, never results).
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
        setPage(m.page);
        setQuestion(m.question);
        setFit(m.fit);
        setScroll(m.scroll);
      } else if (m?.type === "doc") {
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
          <h1>{unsupported ? t("screenUnsupported") : t("screenWaiting")}</h1>
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
