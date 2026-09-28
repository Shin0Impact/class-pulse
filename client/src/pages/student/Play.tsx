import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { EVENTS } from "@shared/events.ts";
import { FEATURES } from "@shared/features.ts";

import type {
  Confidence,
  Mark,
  PublicQuestion,
  StudentState,
  PairAssigned,
} from "@shared/types.ts";

import { socket, emitAck } from "../../socket/socket.ts";
import { useSocketEvents } from "../../socket/useSocketEvents.ts";
import { useFocusMode } from "../../hooks/useFocusMode.ts";

import { savedKey } from "./Join.tsx";

import ColorPicker from "./ColorPicker.tsx";

import StudentHeader from "../../components/student/StudentHeader/StudentHeader.tsx";
import QuestionCard from "../../components/student/QuestionCard/QuestionCard.tsx";
import ConfidencePicker from "../../components/student/ConfidencePicker/ConfidencePicker.tsx";
import PeerExplanation from "../../components/student/PeerExplanation/PeerExplanation.tsx";

import Button from "../../components/ui/Button.tsx";

import { usePreferences } from "../../context/PreferencesContext.tsx";

import "./Play.css";

type Saved = {
  name?: string;
  studentId?: string;
};

function readSaved(code: string): Saved {
  try {
    return (
      JSON.parse(
        sessionStorage.getItem(savedKey(code)) ?? "null",
      ) || {}
    );
  } catch {
    return {};
  }
}

function writeSaved(
  code: string,
  data: Saved,
): void {
  try {
    sessionStorage.setItem(
      savedKey(code),
      JSON.stringify(data),
    );
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
  -------------------------------- */

  const [phase, setPhase] = useState<
    "joining" | "live" | "ended" | "error"
  >("joining");

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");

  const [status, setStatus] =
    useState<Mark | null>(null);

  const [reason, setReason] =
    useState<string | null>(null);

  const [focusOn, setFocusOn] =
    useState(false);

  const [error, setError] =
    useState("");

  /* --------------------------------
     Blindspot question state
  -------------------------------- */

  const [question, setQuestion] =
    useState<PublicQuestion | null>(null);

  const [
    selectedOptionId,
    setSelectedOptionId,
  ] = useState<string | null>(null);

  const [
    confidence,
    setConfidence,
  ] = useState<Confidence | null>(null);

  const [answerSent, setAnswerSent] =
    useState(false);

  const [pairAssignment, setPairAssignment] = useState<PairAssigned | null>(null);
  const [clarityRated, setClarityRated] = useState(false);

  /* --------------------------------
     Refs
  -------------------------------- */

  const joining = useRef(false);

  const checkInId =
    useRef<string | null>(null);

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
  -------------------------------- */

  useFocusMode(
    FEATURES.focusMode &&
      focusOn &&
      phase === "live",
  );

  /* --------------------------------
     Join / reconnect
  -------------------------------- */

  const join = useCallback(async () => {
    if (joining.current) return;

    const saved = readSaved(code);

    if (!saved.name) {
      navigate(
        `/join?code=${code}`,
        { replace: true },
      );

      return;
    }

    joining.current = true;

    try {
      const res =
        await emitAck<StudentState>(
          EVENTS.STUDENT_JOIN,
          {
            code,
            name: saved.name,
            studentId: saved.studentId,
          },
        );

      writeSaved(code, {
        name: res.name,
        studentId: res.studentId,
      });

      setName(res.name);
      setTitle(res.title);
      setTopic(res.topic);
      setFocusOn(res.focusMode);
      setError("");

      const sameCheckIn =
        checkInId.current ===
        res.checkInId;

      const local = mine.current;

      if (
        sameCheckIn &&
        local.status &&
        (
          local.status !== res.status ||
          local.reason !== res.reason
        )
      ) {
        emitAck(
          EVENTS.STUDENT_SET_STATUS,
          {
            status: local.status,
            reason: local.reason,
          },
        ).catch(() => {});
      } else {
        setStatus(
          res.status === "waiting"
            ? null
            : res.status,
        );

        setReason(res.reason);
      }

      checkInId.current =
        res.checkInId;

      setPhase("live");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : String(e),
      );

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
  -------------------------------- */

  useSocketEvents({
    [EVENTS.CHECK_IN_STARTED]: (data) => {
      if (!("checkInId" in data)) return;

      checkInId.current =
        data.checkInId;

      setTopic(data.topic);

      setStatus(null);
      setReason(null);
    },

    [EVENTS.FOCUS_MODE]: ({
      enabled,
    }) => {
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

    [EVENTS.QUESTION_STARTED]: (
      data,
    ) => {
      const nextQuestion = data;

      setQuestion(nextQuestion);

      setSelectedOptionId(null);
      setConfidence(null);
      setAnswerSent(false);
      setPairAssignment(null);
      setClarityRated(false);
      setError("");

      if (navigator.vibrate) {
        navigator.vibrate(20);
      }
    },
  });

  /* --------------------------------
     Existing pulse controls
  -------------------------------- */

  function chooseStatus(s: Mark) {
    setStatus(s);
    setReason(null);
    setError("");

    if (navigator.vibrate) {
      navigator.vibrate(15);
    }

    emitAck(
      EVENTS.STUDENT_SET_STATUS,
      { status: s },
    ).catch((e) => {
      setError(e.message);
    });
  }

  function chooseReason(r: string) {
    const next =
      reason === r ? null : r;

    setReason(next);

    emitAck(
      EVENTS.STUDENT_SET_STATUS,
      {
        status,
        reason: next,
      },
    ).catch((e) => {
      setError(e.message);
    });
  }

  /* --------------------------------
     Question controls
  -------------------------------- */

  function chooseAnswer(
    optionId: string,
  ) {
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

  async function chooseConfidence(
    nextConfidence: Confidence,
  ) {
    if (
      !question ||
      !selectedOptionId ||
      answerSent
    ) {
      return;
    }

    setConfidence(nextConfidence);
    setError("");

    if (navigator.vibrate) {
      navigator.vibrate(18);
    }

    try {
      await emitAck(
        EVENTS.STUDENT_ANSWER,
        {
          questionId:
            question.questionId,

          optionId:
            selectedOptionId,

          confidence:
            nextConfidence,
        },
      );

      setAnswerSent(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : String(e),
      );
    }
  }


  async function rateClarity(rating: 1 | 3 | 5) {
    if (!pairAssignment || pairAssignment.role !== "listener") return;
    setError("");
    try {
      await emitAck(EVENTS.STUDENT_RATE_CLARITY, { pairId: pairAssignment.pairId, rating });
      setClarityRated(true);
      if (navigator.vibrate) navigator.vibrate(16);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  /* --------------------------------
     Render
  -------------------------------- */

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
              <div
                className="student-play__waiting-pulse"
                aria-hidden="true"
              >
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

          {phase === "live" && (
            <div className="student-play__stage">

              {/* PEER EXPLANATION */}

              {pairAssignment && (
                <PeerExplanation
                  assignment={pairAssignment}
                  prompt={question?.prompt ?? t("peerFallbackPrompt")}
                  rated={clarityRated}
                  onRate={rateClarity}
                />
              )}

              {/* ACTIVE QUESTION */}

              {!pairAssignment && question && !answerSent && (
                <div className="student-play__question">

                  <QuestionCard
                    topic={question.topic}
                    prompt={question.prompt}
                    options={question.options}
                    selectedOptionId={
                      selectedOptionId
                    }
                    onSelect={
                      chooseAnswer
                    }
                  />

                  {selectedOptionId && (
                    <div className="student-play__confidence">
                      <ConfidencePicker
                        value={confidence}
                        onSelect={
                          chooseConfidence
                        }
                      />
                    </div>
                  )}

                </div>
              )}

              {/* ANSWER SUBMITTED */}

              {!pairAssignment && question && answerSent && (
                <section className="student-play__state">
                  <div
                    className="student-play__state-mark"
                    aria-hidden="true"
                  >
                    ✓
                  </div>

                  <h2>
                    {t("answerSent")}
                  </h2>

                  <p>
                    {t("answerSentHint")}
                  </p>
                </section>
              )}

              {/* NO QUESTION:
                  keep existing pulse interaction */}

              {!pairAssignment && !question && (
                <>
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
                      onStatus={
                        chooseStatus
                      }
                      onReason={
                        chooseReason
                      }
                    />
                  </div>
                </>
              )}

              {error && (
                <p
                  className="student-play__error"
                  role="alert"
                >
                  {error}
                </p>
              )}

            </div>
          )}

          {/* ENDED */}

          {phase === "ended" && (
            <section className="student-play__state">
              <div
                className="student-play__state-mark"
                aria-hidden="true"
              >
                ✓
              </div>

              <h2>
                {t("ended")}
              </h2>

              <p>
                {t("thanks")}
              </p>

              <Button
                className="mt-6"
                onClick={() =>
                  navigate("/")
                }
              >
                {t("home")}
              </Button>
            </section>
          )}

          {/* ERROR */}

          {phase === "error" && (
            <section className="student-play__state">

              <p
                className="student-play__error"
                role="alert"
              >
                {error}
              </p>

              <Button
                className="mt-6"
                onClick={() =>
                  navigate(
                    `/join?code=${code}`,
                  )
                }
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