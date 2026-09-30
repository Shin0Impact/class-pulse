import { useEffect, useMemo, useRef, useState } from "react";
import { EVENTS } from "@shared/events.ts";
import { emitAck } from "../../../socket/socket.ts";
import { usePreferences } from "../../../context/PreferencesContext.tsx";
import type { StudentQuiz } from "@shared/types.ts";
import "./QuizRunner.css";

type Answers = Record<string, { optionId?: string; text?: string }>;

// A quiz taken at your own pace: one question at a time, every answer saved as you go, then
// Submit shows what was right. Also used after a refresh (answers come back from the server).
export default function QuizRunner({
  quiz,
  onChange,
  onExit,
}: {
  quiz: StudentQuiz;
  onChange: (quiz: StudentQuiz) => void;
  onExit: () => void;
}) {
  const { t } = usePreferences();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(quiz.answers);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  // What the server already has for each open answer, so only real changes are sent.
  const saved = useRef<Record<string, string>>(
    Object.fromEntries(Object.entries(quiz.answers).map(([k, v]) => [k, v.text ?? ""])),
  );
  const autoSubmitted = useRef(false);

  const total = quiz.questions.length;
  const q = quiz.questions[Math.min(index, total - 1)];
  const locked = quiz.submitted || quiz.closed;
  const unanswered = useMemo(
    () => quiz.questions.filter((x) => !(x.kind === "open" ? answers[x.id]?.text?.trim() : answers[x.id]?.optionId)).length,
    [quiz.questions, answers],
  );

  async function saveText(id: string) {
    const text = (answers[id]?.text ?? "").trim();
    if (locked || saved.current[id] === text) return;
    saved.current[id] = text;
    try {
      await emitAck(EVENTS.STUDENT_QUIZ_ANSWER, { quizId: quiz.id, questionId: id, text });
    } catch (e) {
      saved.current[id] = "\u0000"; // try again next time
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function pick(questionId: string, optionId: string) {
    if (locked) return;
    setAnswers((a) => ({ ...a, [questionId]: { optionId } }));
    setError("");
    try {
      await emitAck(EVENTS.STUDENT_QUIZ_ANSWER, { quizId: quiz.id, questionId, optionId });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function submit() {
    if (quiz.submitted) return;
    setSending(true);
    setError("");
    try {
      if (!quiz.closed) for (const x of quiz.questions) if (x.kind === "open") await saveText(x.id);
      const res = await emitAck<{ quiz: StudentQuiz }>(EVENTS.STUDENT_QUIZ_SUBMIT, { quizId: quiz.id });
      onChange(res.quiz);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
      setConfirm(false);
    }
  }

  // The teacher ended it before this student pressed Submit: turn in what they have.
  useEffect(() => {
    if (quiz.closed && !quiz.submitted && !autoSubmitted.current) {
      autoSubmitted.current = true;
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.closed, quiz.submitted]);

  if (quiz.submitted && quiz.review) {
    const byId = Object.fromEntries(quiz.review.map((r) => [r.questionId, r]));
    const scored = quiz.review.filter((r) => r.correct !== null);
    const right = scored.filter((r) => r.correct).length;
    return (
      <section className="quiz" aria-label={quiz.title}>
        <h1 className="quiz__title" dir="auto">{quiz.title}</h1>
        {scored.length > 0 && (
          <p className="quiz__score" role="status">
            {t("quizYourScore")}: <strong dir="ltr">{right} / {scored.length}</strong>
          </p>
        )}
        <ol className="quiz__review">
          {quiz.questions.map((x, i) => {
            const r = byId[x.id];
            const mine = answers[x.id];
            const myOption = x.options.find((o) => o.id === mine?.optionId);
            const rightOption = x.options.find((o) => o.id === r?.correctOptionId);
            return (
              <li key={x.id} className={`quiz__item ${r?.correct === true ? "is-right" : r?.correct === false ? "is-wrong" : ""}`}>
                <p className="quiz__item-prompt" dir="auto"><span dir="ltr">{i + 1}.</span> {x.prompt}</p>
                {x.kind === "mcq" ? (
                  <>
                    <p dir="auto">
                      <span className="quiz__label">{t("yourAnswer")}:</span> {myOption?.text ?? t("quizNoAnswer")}{" "}
                      <strong className="quiz__verdict">{r?.correct ? `✓ ${t("quizRight")}` : `✗ ${t("quizWrong")}`}</strong>
                    </p>
                    {!r?.correct && rightOption && (
                      <p dir="auto"><span className="quiz__label">{t("quizCorrectAnswer")}:</span> {rightOption.text}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p dir="auto"><span className="quiz__label">{t("yourAnswer")}:</span> {mine?.text || t("quizNoAnswer")}</p>
                    {r?.modelAnswer && (
                      <p dir="auto"><span className="quiz__label">{t("quizModelAnswer")}:</span> {r.modelAnswer}</p>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ol>
        <button type="button" className="quiz__btn quiz__btn--primary" onClick={onExit}>
          {t("quizBackToClass")}
        </button>
      </section>
    );
  }

  if (!q) return null;
  const isLast = index >= total - 1;
  const current = answers[q.id];

  return (
    <section className="quiz" aria-label={quiz.title}>
      <header className="quiz__head">
        <h1 className="quiz__title" dir="auto">{quiz.title}</h1>
        <p className="quiz__count" dir="ltr">
          {t("quizQ")} {index + 1} {t("quizOf")} {total}
        </p>
        <div className="quiz__dots" aria-hidden="true">
          {quiz.questions.map((x, i) => (
            <button
              key={x.id}
              type="button"
              tabIndex={-1}
              className={`quiz__dot ${i === index ? "is-current" : ""} ${(x.kind === "open" ? answers[x.id]?.text?.trim() : answers[x.id]?.optionId) ? "is-done" : ""}`}
              onClick={() => { saveText(q.id); setIndex(i); }}
            />
          ))}
        </div>
      </header>

      {quiz.closed && <p className="quiz__note" role="status">{t("quizEndedNotice")}</p>}

      <h2 className="quiz__prompt" dir="auto">{q.prompt}</h2>

      {q.kind === "mcq" ? (
        <div className="quiz__options" role="radiogroup" aria-label={q.prompt}>
          {q.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={current?.optionId === o.id}
              className={`quiz__option ${current?.optionId === o.id ? "is-picked" : ""}`}
              onClick={() => pick(q.id, o.id)}
              disabled={locked}
              dir="auto"
            >
              {o.text}
            </button>
          ))}
        </div>
      ) : (
        <textarea
          className="quiz__text"
          dir="auto"
          maxLength={600}
          rows={5}
          aria-label={t("yourAnswer")}
          placeholder={t("openAnswerPlaceholder")}
          value={current?.text ?? ""}
          disabled={locked}
          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: { text: e.target.value } }))}
          onBlur={() => saveText(q.id)}
        />
      )}

      {confirm && (
        <p className="quiz__note" role="alert">{t("quizUnanswered")}</p>
      )}
      {error && <p className="quiz__error" role="alert">{error}</p>}

      <div className="quiz__nav">
        <button type="button" className="quiz__btn" disabled={index === 0} onClick={() => { saveText(q.id); setIndex(index - 1); setConfirm(false); }}>
          {t("quizPrev")}
        </button>
        {!isLast ? (
          <button type="button" className="quiz__btn quiz__btn--primary" onClick={() => { saveText(q.id); setIndex(index + 1); setConfirm(false); }}>
            {t("quizNext")}
          </button>
        ) : (
          <button
            type="button"
            className="quiz__btn quiz__btn--primary"
            disabled={sending}
            onClick={() => (unanswered > 0 && !confirm ? setConfirm(true) : submit())}
          >
            {sending ? t("quizSubmitting") : t("quizSubmit")}
          </button>
        )}
      </div>
    </section>
  );
}
