import { useEffect, useRef, useState } from "react";
import { EVENTS } from "@shared/events.ts";
import { emitAck } from "../../socket/socket.ts";
import { usePreferences } from "../../context/PreferencesContext.tsx";
import { generateQuiz } from "../../api/ai.ts";
import { captureRange, type OpenDocument } from "../../pages/teacher/present/documents.ts";
import Button from "../ui/Button.tsx";
import { draftToQuestion } from "./DraftEditor.tsx";
import type { QuestionDraft, QuizResults, QuizType } from "@shared/types.ts";

const MAX_COUNT = 15;

// The "Generate a quiz" pop-up on the dashboard's Ask the class card. It works on the PDF or image
// already open there: settings (how many, which kind, which pages) -> check the questions -> start.
export default function QuizDialog({
  code,
  doc,
  onClose,
  onStarted,
}: {
  code: string;
  doc: OpenDocument;
  onClose: () => void;
  onStarted: () => void;
}) {
  const { t, language } = usePreferences();
  const [type, setType] = useState<QuizType>("mcq");
  const [count, setCount] = useState(5);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(doc.pages);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[] | null>(null);
  const [asked, setAsked] = useState(0);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [starting, setStarting] = useState(false);
  const generation = useRef(0);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      generation.current++;
    };
  }, [onClose]);

  async function generate() {
    const lo = Math.max(1, Math.min(from, doc.pages));
    const hi = Math.max(lo, Math.min(to, doc.pages));
    const n = Math.max(1, Math.min(MAX_COUNT, Math.round(count) || 1));
    const mine = ++generation.current;
    setGenerating(true);
    setError("");
    try {
      const page = await captureRange(doc, lo, hi);
      const res = await generateQuiz(code, { type, count: n, page, fromPage: lo, toPage: hi, language });
      if (mine !== generation.current) return;
      setQuestions(res.questions);
      setAsked(n);
      setTitle(res.title || doc.name.replace(/\.[^.]+$/, ""));
    } catch (e) {
      if (mine === generation.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mine === generation.current) setGenerating(false);
    }
  }

  async function start() {
    if (!questions?.length) return setError(t("quizKeepOne"));
    setStarting(true);
    setError("");
    try {
      await emitAck(EVENTS.TEACHER_START_QUIZ, { title, questions: questions.map(draftToQuestion) });
      onStarted();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  }

  const numberBox = "w-24 rounded-xl border border-slate-300 px-3 py-2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t("quizHeading")}
        className="max-h-[90dvh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl outline-none"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">{t("quizHeading")}</h2>
            <p className="truncate text-base text-slate-500" dir="auto">📄 {doc.name}</p>
          </div>
          <button type="button" className="shrink-0 rounded-lg px-2 text-2xl leading-none text-slate-500" onClick={onClose} aria-label={t("closeFile")}>
            ×
          </button>
        </header>

        {!questions && (
          <>
            <p className="text-base text-slate-500">{t("quizHint")}</p>
            <div className="flex flex-wrap items-end gap-4">
              <label className="block">
                <span className="mb-1 block text-base text-slate-500">{t("quizHowMany")}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_COUNT}
                  className={numberBox}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </label>
              <div>
                <span className="mb-1 block text-base text-slate-500">{t("quizTypes")}</span>
                <div className="present-kind qs-kind" style={{ width: "min(100%, 480px)", gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 0 }} role="radiogroup" aria-label={t("quizTypes")}>
                  {(["mcq", "open", "mixed"] as const).map((k) => (
                    <button key={k} type="button" role="radio" aria-checked={type === k} onClick={() => setType(k)}>
                      {k === "mcq" ? t("multipleChoice") : k === "open" ? t("openQuestion") : t("quizMixed")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {doc.pages > 1 && (
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2">
                  <span className="text-base text-slate-500">{t("quizPagesFrom")}</span>
                  <input type="number" min={1} max={doc.pages} className={numberBox} value={from} onChange={(e) => setFrom(Number(e.target.value))} />
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-base text-slate-500">{t("quizPagesTo")}</span>
                  <input type="number" min={1} max={doc.pages} className={numberBox} value={to} onChange={(e) => setTo(Number(e.target.value))} />
                </label>
                <span className="text-base text-slate-500" dir="ltr">/ {doc.pages}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={generate} disabled={generating}>
                {generating ? (
                  <>
                    <span className="ai-spinner" aria-hidden="true" /> {t("generating")}
                  </>
                ) : (
                  <>✦ {t("quizGenerate")}</>
                )}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                {t("discard")}
              </Button>
            </div>
          </>
        )}

        {questions && (
          <div className="space-y-3">
            <p className="text-base text-slate-500">{t("quizCheck")}</p>
            {questions.length < asked && <p className="text-base text-amber-700">{t("quizFewer")}</p>}
            <input
              type="text"
              dir="auto"
              maxLength={80}
              className="w-full rounded-xl border border-slate-300 px-3 py-3 font-semibold"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label={t("quizHeading")}
            />
            <ol className="space-y-3">
              {questions.map((q, i) => (
                <li key={q.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-semibold" dir="auto">
                      <span dir="ltr">{i + 1}.</span> {q.prompt}
                    </p>
                    <button
                      type="button"
                      className="shrink-0 text-base font-semibold text-rose-700 underline"
                      onClick={() => setQuestions((list) => (list ?? []).filter((x) => x.id !== q.id))}
                    >
                      {t("quizRemove")}
                    </button>
                  </div>
                  {q.kind === "mcq" ? (
                    <ul className="mt-2 space-y-1 text-base">
                      {q.options.map((o) => (
                        <li key={o.id} dir="auto" className={o.id === q.correctOptionId ? "font-semibold text-emerald-700" : "text-slate-600"}>
                          {o.id === q.correctOptionId ? "✓" : "•"} {o.text}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    q.modelAnswer && (
                      <p className="mt-2 text-base text-slate-600" dir="auto">
                        <span className="font-semibold">{t("quizModelAnswer")}:</span> {q.modelAnswer}
                      </p>
                    )
                  )}
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={start} disabled={starting || questions.length === 0}>
                {t("quizStart")}
              </Button>
              <Button type="button" variant="secondary" onClick={generate} disabled={generating}>
                {generating ? t("generating") : t("regenerate")}
              </Button>
              <button type="button" className="px-2 text-base font-semibold text-slate-500 underline" onClick={() => setQuestions(null)}>
                {t("quizSettings")}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-rose-50 p-3 text-rose-800" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ results ------------------------------ */

export function QuizResultsView({ quiz }: { quiz: QuizResults }) {
  const { t: tt } = usePreferences();
  const [error, setError] = useState("");
  const total = quiz.questions.length;
  const submitted = quiz.students.filter((s) => s.submitted).length;
  const started = quiz.students.filter((s) => s.answered > 0 || s.submitted).length;

  async function end() {
    setError("");
    try {
      await emitAck(EVENTS.TEACHER_CLOSE_QUIZ, {});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-4" data-testid="quiz-results">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold" dir="auto">{quiz.title}</p>
          <p className="text-base text-slate-500">
            <span className={quiz.closed ? "" : "font-semibold text-emerald-700"}>{quiz.closed ? tt("quizIsClosed") : tt("quizLive")}</span>
            {" · "}
            <span dir="ltr">{submitted} / {quiz.students.length}</span> {tt("quizSubmittedCount")}
            {" · "}
            <span dir="ltr">{started}</span> {tt("quizAnsweredCount")}
          </p>
        </div>
        <div className="flex gap-2">
          {!quiz.closed && (
            <Button type="button" onClick={end}>
              {tt("quizEnd")}
            </Button>
          )}
        </div>
      </div>

      <ol className="space-y-3">
        {quiz.questions.map((q, i) => (
          <li key={q.id} className="rounded-xl border border-slate-200 p-3">
            <p className="font-semibold" dir="auto"><span dir="ltr">{i + 1}.</span> {q.prompt}</p>
            {q.kind === "mcq" ? (
              <div className="mt-2 space-y-1.5">
                {q.options.map((o) => {
                  const pct = q.answered ? Math.round((o.count / q.answered) * 100) : 0;
                  return (
                    <div key={o.id} className="text-base">
                      <div className="flex justify-between gap-3">
                        <span dir="auto" className={o.correct ? "font-semibold text-emerald-700" : ""}>{o.correct ? "✓ " : ""}{o.text}</span>
                        <span dir="ltr" className="shrink-0 text-slate-500">{o.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                        <div className={`h-full ${o.correct ? "bg-emerald-500" : "bg-slate-400"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <p className="text-sm text-slate-500" dir="ltr">
                  {q.answered ? Math.round((q.correct / q.answered) * 100) : 0}% {tt("quizCorrectWord")} ({q.correct}/{q.answered})
                </p>
              </div>
            ) : (
              <div className="mt-2 space-y-1.5 text-base">
                {q.modelAnswer && (
                  <p className="text-slate-600" dir="auto"><span className="font-semibold">{tt("quizModelAnswer")}:</span> {q.modelAnswer}</p>
                )}
                {q.texts.length === 0 ? (
                  <p className="text-slate-500">{tt("quizNoAnswers")}</p>
                ) : (
                  <ul className="space-y-1">
                    {q.texts.map((a) => (
                      <li key={a.studentId} dir="auto" className="rounded-lg bg-slate-50 px-3 py-2">
                        <span className="font-semibold">{a.name}:</span> {a.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>

      {quiz.students.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {quiz.students.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-base">
              <span className="min-w-0 truncate" dir="auto">{s.name}</span>
              <span className="shrink-0 text-slate-500" dir="ltr">
                {s.answered}/{total}
                {quiz.mcqTotal > 0 && s.answered > 0 ? ` · ${s.correct}/${quiz.mcqTotal}` : ""}
                {s.submitted ? " ✓" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="rounded-lg bg-rose-50 p-3 text-rose-800" role="alert">{error}</p>}
    </div>
  );
}
