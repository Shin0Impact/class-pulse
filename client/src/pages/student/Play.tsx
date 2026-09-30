import { useCallback, useEffect, useRef, useState } from "react";

import FeedbackForm from "../../components/student/FeedbackForm/FeedbackForm.tsx";

import { useNavigate, useParams } from "react-router-dom";

import { EVENTS, isCustomReason } from "@shared/events.ts";

import { FEATURES } from "@shared/features.ts";

import type {
  Confidence,
  Mark,
  PublicQuestion,
  StudentState,
  PairAssigned,
  AnswerReveal as AnswerRevealData,
} from "@shared/types.ts";

import { socket, emitAck } from "../../socket/socket.ts";

import { useSocketEvents } from "../../socket/useSocketEvents.ts";

import { useFocusMode } from "../../hooks/useFocusMode.ts";

import { savedKey } from "./Join.tsx";

import { getAccessToken } from "../../auth/tokens.ts";

import ColorPicker from "./ColorPicker.tsx";

import StudentHeader from "../../components/student/StudentHeader/StudentHeader.tsx";

import QuestionCard from "../../components/student/QuestionCard/QuestionCard.tsx";

import ConfidencePicker from "../../components/student/ConfidencePicker/ConfidencePicker.tsx";

import PeerExplanation from "../../components/student/PeerExplanation/PeerExplanation.tsx";

import AnswerReveal from "../../components/student/AnswerReveal/AnswerReveal.tsx";

import Button from "../../components/ui/Button.tsx";

import { usePreferences } from "../../context/PreferencesContext.tsx";

import "./Play.css";

type Saved = {
  name?: string;

  studentId?: string;

  rejoinKey?: string;
};

function readSaved(code: string): Saved {
  try {
    return JSON.parse(sessionStorage.getItem(savedKey(code)) ?? "null") || {};
  } catch {
    return {};
  }
}

function writeSaved(code: string, data: Saved): void {
  try {
    sessionStorage.setItem(savedKey(code), JSON.stringify(data));
  } catch {
    // Storage may be blocked.
  }
}

export default function Play() {
  const code = useParams().code ?? "";

  const { t } = usePreferences();

  const navigate = useNavigate();

  /* --------------------------------



     Existing Class Pulse state



  \\-------------------------------- */

  const [phase, setPhase] = useState<"joining" | "live" | "ended" | "error">(
    "joining",
  );

  const [name, setName] = useState("");

  const [title, setTitle] = useState("");

  const [topic, setTopic] = useState("");

  const [status, setStatus] = useState<Mark | null>(null);

  const [reason, setReason] = useState<string | null>(null);

  const [focusOn, setFocusOn] = useState(false);

  const [error, setError] = useState("");

  /* --------------------------------



     Blindspot question state



  \\-------------------------------- */

  const [question, setQuestion] = useState<PublicQuestion | null>(null);

  // For join(), which is a stable callback and would otherwise see a stale question.

  const questionRef = useRef<PublicQuestion | null>(null);

  questionRef.current = question;

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const [confidence, setConfidence] = useState<Confidence | null>(null);

  const [explanation, setExplanation] = useState("");

  // Open questions: the student's written answer.

  const [openText, setOpenText] = useState("");

  // The teacher closed the question before this student answered.

  const [closedNotice, setClosedNotice] = useState(false);

  const [answerSent, setAnswerSent] = useState(false);

  const [answerReveal, setAnswerReveal] = useState<AnswerRevealData | null>(
    null,
  );

  const [pairAssignment, setPairAssignment] = useState<PairAssigned | null>(
    null,
  );

  const [clarityRated, setClarityRated] = useState(false);

  // G9 — Class Feedback

  const [feedbackRequested, setFeedbackRequested] = useState(false);

  /* --------------------------------



     Refs



  \\-------------------------------- */

  const joining = useRef(false);

  const checkInId = useRef<string | null>(null);

  const mine = useRef<{
    status: Mark | null;

    reason: string | null;
  }>({
    status: null,

    reason: null,
  });

  mine.current = {
    status,

    reason,
  };

  /* --------------------------------



     Focus mode



  \\-------------------------------- */

  useFocusMode(FEATURES.focusMode && focusOn && phase === "live");

  /* --------------------------------



     Join / reconnect



  \\-------------------------------- */

  const join = useCallback(async () => {
    if (joining.current) return;

    const saved = readSaved(code);

    if (!saved.name) {
      navigate(`/join?code=${code}`, { replace: true });

      return;
    }

    joining.current = true;

    try {
      const res = await emitAck<StudentState>(EVENTS.STUDENT_JOIN, {
        code,

        name: saved.name,

        studentId: saved.studentId,

        rejoinKey: saved.rejoinKey,

        accessToken: await getAccessToken(),
      });

      writeSaved(code, {
        name: res.name,

        studentId: res.studentId,

        rejoinKey: res.rejoinKey,
      });

      setName(res.name);

      setTitle(res.title);

      setTopic(res.topic);

      setFocusOn(res.focusMode);
      // Feedback was opened before this phone (re)joined: show the form until it has submitted.
      setFeedbackRequested(res.feedbackOpen && !res.feedbackSubmitted);

      setError("");

      const sameCheckIn = checkInId.current === res.checkInId;

      const local = mine.current;

      if (
        sameCheckIn &&
        local.status &&
        (local.status !== res.status || local.reason !== res.reason)
      ) {
        emitAck(EVENTS.STUDENT_SET_STATUS, {
          status: local.status,

          reason: local.reason,
        }).catch(() => {});
      } else {
        setStatus(res.status === "waiting" ? null : res.status);

        setReason(res.reason);
      }

      checkInId.current = res.checkInId;

      // A question already live (joined late, or the phone refreshed): show it.

      if (res.question) {
        const current = questionRef.current;

        if (
          current?.questionId !== res.question.questionId ||
          current.isRecheck !== res.question.isRecheck
        ) {
          // Slept through a new launch: an old pairing/reveal screen would hide the new question.

          setPairAssignment(null);

          setAnswerReveal(null);

          setSelectedOptionId(null);

          setConfidence(null);

          setExplanation("");

          setOpenText("");
        }

        setQuestion(res.question);

        setAnswerSent(res.answered);
      } else {
        setQuestion(null);
      }

      setPhase("live");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));

      setPhase("error");
    } finally {
      joining.current = false;
    }
  }, [code, navigate]);

  useEffect(() => {
    join();

    socket.on("connect", join);

    return () => {
      socket.off("connect", join);
    };
  }, [join]);

  /* --------------------------------



     Socket events



  \\-------------------------------- */

  useSocketEvents({
    [EVENTS.CHECK_IN_STARTED]: (data) => {
      if (!("checkInId" in data)) return;

      checkInId.current = data.checkInId;

      setTopic(data.topic);

      setStatus(null);

      setReason(null);
    },

    [EVENTS.FOCUS_MODE]: ({ enabled }) => {
      setFocusOn(enabled);
    },

    [EVENTS.SESSION_ENDED]: () => {
      setPhase("ended");
    },

    [EVENTS.PAIR_ASSIGNED]: (data) => {
      setPairAssignment(data);

      setClarityRated(false);

      setError("");

      if (navigator.vibrate) navigator.vibrate([18, 40, 18]);
    },

    [EVENTS.ANSWER_REVEAL]: (data) => {
      setAnswerReveal(data);

      setPairAssignment(null);

      setError("");

      if (navigator.vibrate) {
        navigator.vibrate(
          !data.correct && data.confidence === "certain" ? [40, 55, 40] : 25,
        );
      }
    },

    [EVENTS.QUESTION_STARTED]: (data) => {
      const nextQuestion = data;

      setQuestion(nextQuestion);

      setSelectedOptionId(null);

      setConfidence(null);

      setExplanation("");

      setOpenText("");

      setAnswerSent(false);

      setClosedNotice(false);

      setPairAssignment(null);

      setClarityRated(false);

      setError("");

      if (navigator.vibrate) {
        navigator.vibrate(20);
      }
    },

    // G9 — Teacher asks students for class feedback

    [EVENTS.FEEDBACK_REQUESTED]: () => {
      setFeedbackRequested(true);

      setError("");

      if (navigator.vibrate) {
        navigator.vibrate(20);
      }
    },

    [EVENTS.QUESTION_CLOSED]: ({ questionId }) => {
      if (question?.questionId !== questionId) return;

      setClosedNotice(!answerSent);

      setQuestion(null);
    },
  });

  /* --------------------------------



     Existing pulse controls



  \\-------------------------------- */

  function chooseStatus(s: Mark) {
    setStatus(s);

    setReason(null);

    setError("");

    if (navigator.vibrate) {
      navigator.vibrate(15);
    }

    emitAck(EVENTS.STUDENT_SET_STATUS, { status: s }).catch((e) => {
      setError(e.message);
    });
  }

  function chooseReason(r: string) {
    // Tapping the selected preset again un-selects it. A custom reason is sent as typed, so

    // re-sending the same words must not clear it.

    const next = !isCustomReason(r) && reason === r ? null : r;

    setReason(next);

    emitAck(EVENTS.STUDENT_SET_STATUS, {
      status,

      reason: next,
    }).catch((e) => {
      setError(e.message);
    });
  }

  /* --------------------------------



     Question controls



  \\-------------------------------- */

  function chooseAnswer(optionId: string) {
    if (answerSent) return;

    setSelectedOptionId(optionId);

    /*



      If the student changes their answer,



      confidence must be chosen again.



    */

    setConfidence(null);

    if (navigator.vibrate) {
      navigator.vibrate(12);
    }
  }

  async function chooseConfidence(nextConfidence: Confidence) {
    if (!question || answerSent) return;

    const isOpen = question.kind === "open";

    if (isOpen ? !openText.trim() : !selectedOptionId) return;

    setConfidence(nextConfidence);

    setError("");

    if (navigator.vibrate) {
      navigator.vibrate(18);
    }

    try {
      await emitAck(
        EVENTS.STUDENT_ANSWER,

        isOpen
          ? {
              questionId: question.questionId,

              text: openText.trim(),

              confidence: nextConfidence,
            }
          : {
              questionId: question.questionId,

              optionId: selectedOptionId,

              confidence: nextConfidence,

              explanation: explanation.trim() || undefined,
            },
      );

      setAnswerSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function rateClarity(rating: 1 | 3 | 5) {
    if (!pairAssignment || pairAssignment.role !== "listener") return;

    setError("");

    try {
      await emitAck(EVENTS.STUDENT_RATE_CLARITY, {
        pairId: pairAssignment.pairId,

        rating,
      });

      setClarityRated(true);

      if (navigator.vibrate) navigator.vibrate(16);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  /* --------------------------------



     Render



  \\-------------------------------- */

  return (
    <main className="student-play">
      <div className="student-play__container">
        {phase !== "joining" && (
          <StudentHeader
            name={name}
            code={code}
            title={title}
            connected={socket.connected}
          />
        )}

        <div className="student-play__content">
          {/* JOINING */}

          {phase === "joining" && (
            <section className="student-play__waiting">
              <div className="student-play__waiting-pulse" aria-hidden="true">
                <span />

                <span />

                <span />

                <span />

                <span />
              </div>

              <h1>{t("joining")}</h1>
            </section>
          )}

          {/* LIVE */}

          {/* LIVE */}

          {phase === "live" && (
            <div className="student-play__stage">
              {/* G9 — CLASS FEEDBACK */}

              {feedbackRequested && (
                <FeedbackForm
                  onSubmitted={() => {
                    setFeedbackRequested(false);
                  }}
                />
              )}

              {/* S4 — ANSWER REVEAL */}

              {!feedbackRequested && answerReveal && (
                <AnswerReveal
                  result={answerReveal}
                  onContinue={() => setAnswerReveal(null)}
                />
              )}

              {/* PEER EXPLANATION */}

              {!feedbackRequested && !answerReveal && pairAssignment && (
                <PeerExplanation
                  assignment={pairAssignment}
                  prompt={question?.prompt ?? t("peerFallbackPrompt")}
                  rated={clarityRated}
                  onRate={rateClarity}
                />
              )}

              {/* ACTIVE QUESTION */}

              {!feedbackRequested &&
                !answerReveal &&
                !pairAssignment &&
                question?.kind === "open" &&
                !answerSent && (
                  <div className="student-play__question">
                    <QuestionCard
                      topic={question.topic}
                      prompt={question.prompt}
                      options={[]}
                      selectedOptionId={null}
                      onSelect={() => {}}
                    />

                    <div className="student-play__explanation student-play__open">
                      <label htmlFor="student-open-answer">
                        {t("yourAnswer")}
                      </label>

                      <textarea
                        id="student-open-answer"
                        dir="auto"
                        maxLength={1000}
                        placeholder={t("openAnswerPlaceholder")}
                        value={openText}
                        onChange={(e) => {
                          setOpenText(e.target.value);

                          setConfidence(null);
                        }}
                      />
                    </div>

                    {openText.trim() && (
                      <div className="student-play__confidence">
                        <ConfidencePicker
                          value={confidence}
                          onSelect={chooseConfidence}
                        />
                      </div>
                    )}
                  </div>
                )}

              {!feedbackRequested &&
                !answerReveal &&
                !pairAssignment &&
                question &&
                question.kind !== "open" &&
                !answerSent && (
                  <div className="student-play__question">
                    <QuestionCard
                      topic={question.topic}
                      prompt={question.prompt}
                      options={question.options}
                      selectedOptionId={selectedOptionId}
                      onSelect={chooseAnswer}
                    />

                    {selectedOptionId && (
                      <div className="student-play__explanation">
                        <label htmlFor="student-explanation">
                          {t("explainThinking")}
                        </label>

                        <p className="student-play__explanation-hint">
                          {t("explainThinkingHint")}
                        </p>

                        <textarea
                          id="student-explanation"
                          dir="auto"
                          maxLength={1000}
                          placeholder={t("explanationPlaceholder")}
                          value={explanation}
                          onChange={(e) => setExplanation(e.target.value)}
                        />
                      </div>
                    )}

                    {selectedOptionId && (
                      <div className="student-play__confidence">
                        <ConfidencePicker
                          value={confidence}
                          onSelect={chooseConfidence}
                        />
                      </div>
                    )}
                  </div>
                )}

              {/* ANSWER SUBMITTED */}

              {!feedbackRequested &&
                !answerReveal &&
                !pairAssignment &&
                question &&
                answerSent && (
                  <section className="student-play__state">
                    <div
                      className="student-play__state-mark"
                      aria-hidden="true"
                    >
                      ✓
                    </div>

                    <h2>{t("answerSent")}</h2>

                    <p>{t("answerSentHint")}</p>
                  </section>
                )}

              {/* NO QUESTION:



        keep existing pulse interaction */}

              {!feedbackRequested &&
                !answerReveal &&
                !pairAssignment &&
                !question && (
                  <>
                    {closedNotice && (
                      <p className="student-play__closed" role="status">
                        {t("teacherClosedQuestion")}
                      </p>
                    )}

                    {topic && (
                      <p
                        dir="auto"
                        style={{
                          marginBottom: 8,

                          opacity: 0.55,
                        }}
                      >
                        {topic}
                      </p>
                    )}

                    <h1
                      dir="auto"
                      style={{
                        marginTop: 0,

                        marginBottom: 8,
                      }}
                    >
                      {t("follow")}
                    </h1>

                    <p
                      style={{
                        marginTop: 0,

                        opacity: 0.6,
                      }}
                    >
                      {t("studentHint")}
                    </p>

                    <div
                      style={{
                        marginTop: 32,
                      }}
                    >
                      <ColorPicker
                        status={status}
                        reason={reason}
                        onStatus={chooseStatus}
                        onReason={chooseReason}
                      />
                    </div>
                  </>
                )}

              {error && (
                <p className="student-play__error" role="alert">
                  {error}
                </p>
              )}
            </div>
          )}

          {/* ENDED */}

          {phase === "ended" && (
            <section className="student-play__state">
              <div className="student-play__state-mark" aria-hidden="true">
                ✓
              </div>

              <h2>{t("ended")}</h2>

              <p>{t("thanks")}</p>

              <Button className="mt-6" onClick={() => navigate("/")}>
                {t("home")}
              </Button>
            </section>
          )}

          {/* ERROR */}

          {phase === "error" && (
            <section className="student-play__state">
              <p className="student-play__error" role="alert">
                {error}
              </p>

              <Button
                className="mt-6"
                onClick={() => navigate(`/join?code=${code}`)}
              >
                {t("retry")}
              </Button>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
