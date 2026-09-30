import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EVENTS } from "@shared/events.ts";
import { FEATURES } from "@shared/features.ts";
import { socket, emitAck } from "../../socket/socket.ts";
import { getAccessToken } from "../../auth/tokens.ts";
import {
  useSocketEvents,
  type SummaryState,
} from "../../socket/useSocketEvents.ts";
import { useAuth } from "../../auth/AuthContext.tsx";
import SummaryCard from "../../components/ai/SummaryCard.tsx";
import LiveStats from "../../components/live/LiveStats.tsx";
import QuestionStudio from "../../components/ai/QuestionStudio.tsx";
import { QuizResultsView } from "../../components/ai/QuizPanel.tsx";
import BlindspotHeadline from "../../components/BlindspotHeadline.tsx";
import Button from "../../components/ui/Button.tsx";
import Card from "../../components/ui/Card.tsx";
import PulseBar from "../../components/PulseBar.tsx";
import StudentGrid from "../../components/StudentGrid.tsx";
import Timeline from "../../components/Timeline.tsx";
import ReasonBars from "../../components/ReasonBars.tsx";
import BeforeAfterChart from "../../components/BeforeAfterChart.tsx";
import { usePreferences } from "../../context/PreferencesContext.tsx";
import QuadrantChart from "../../components/QuadrantChart.tsx";
import IllusionGapChart from "../../components/IllusionGapChart.tsx";
import type {
  BlindspotUpdate,
  FocusAlert,
  Pulse,
  QuizResults,
  Summary,
  TeacherState,
  TimelineSample,
} from "@shared/types.ts";

type FeedbackItem = {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  anonymous: boolean;
  studentName: string | null;
  createdAt: number;
};

type FeedbackSummary = {
  averageRating: number | null;
  totalResponses: number;
  feedback: FeedbackItem[];
};

export default function Dashboard() {
  const { code } = useParams();
  const { t, language } = usePreferences();
  const { aiEnabled, profile } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [history, setHistory] = useState<Summary[]>([]);
  const [timeline, setTimeline] = useState<TimelineSample[]>([]);
  const [focusMode, setFocusMode] = useState(true);
  const [alerts, setAlerts] = useState<(FocusAlert & { at: number })[]>([]);
  const [hideNames, setHideNames] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [blindspotUpdate, setBlindspotUpdate] =
    useState<BlindspotUpdate | null>(null);
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const [quiz, setQuiz] = useState<QuizResults | null>(null);
  // G9 — Class Feedback
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary>({
    averageRating: null,
    totalResponses: 0,
    feedback: [],
  });

  // Every pulse is also a point on the timeline (skipping exact repeats).
  const addSample = useCallback((p: Pulse) => {
    setTimeline((list) => {
      const s = {
        t: p.t,
        pct: p.pct,
        marked: p.marked,
        total: p.total,
        checkInId: p.checkIn.id,
      };
      const last = list[list.length - 1];
      if (
        last &&
        last.pct === s.pct &&
        last.marked === s.marked &&
        last.checkInId === s.checkInId
      )
        return list;
      return [...list.slice(-599), s];
    });
  }, []);

  // On first load AND after every reconnect: ask the server for the full state.
  const rejoin = useCallback(async () => {
    try {
      const { state } = await emitAck<{ state: TeacherState }>(
        EVENTS.TEACHER_REJOIN,
        { code, accessToken: await getAccessToken() },
      );
      setTitle(state.title);
      setPulse(state.pulse);
      setHistory(state.history);
      setTimeline(state.timeline);
      setFocusMode(state.focusMode);
      setFeedbackOpen(state.feedbackOpen);
      setFeedbackSummary(state.feedback);
      setQuiz(state.quiz ?? null);
      // the live question (maybe launched from the Present page) and its AI summary
      setBlindspotUpdate(state.blindspot);
      setSummary(
        state.summary
          ? {
              questionId: state.summary.questionId,
              launchKey: state.blindspot?.launchKey,
              status: "ready",
              summary: state.summary,
            }
          : null,
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [code]);

  useEffect(() => {
    rejoin();
    socket.on("connect", rejoin);
    return () => {
      socket.off("connect", rejoin);
    };
  }, [rejoin]);

  useSocketEvents({
    [EVENTS.PULSE_UPDATE]: (p) => {
      setPulse(p);
      addSample(p);
    },

    [EVENTS.CHECK_IN_STARTED]: (data) => {
      if ("history" in data) {
        setHistory(data.history);
        setAlerts([]);
      }
    },

    [EVENTS.FOCUS_ALERT]: (a) =>
      setAlerts((l) => [{ ...a, at: Date.now() }, ...l].slice(0, 6)),

    [EVENTS.BLINDSPOT_UPDATE]: (update: BlindspotUpdate) => {
      setBlindspotUpdate(update);
    },

    [EVENTS.SUMMARY_UPDATE]: (s) => setSummary(s),
    [EVENTS.QUIZ_UPDATE]: (q: QuizResults) => setQuiz(q),
    [EVENTS.FEEDBACK_UPDATE]: (data: FeedbackSummary) => {
      setFeedbackSummary(data);
    },
    // Ending the class opens its recap (My classes); without accounts there is none, so go home.
    [EVENTS.SESSION_ENDED]: (data) =>
      navigate(data?.classId && profile?.role === "teacher" ? `/me/classes/${data.classId}` : "/"),
  });

  async function run<T extends object = Record<string, never>>(
    event: string,
    payload: object,
  ): Promise<T | undefined> {
    setBusy(true);
    setError("");
    try {
      return await emitAck<T>(event, payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function closeQuestion() {
    const res = await run<{ summarizing: boolean }>(
      EVENTS.TEACHER_CLOSE_QUESTION,
      { language },
    );
    if (res?.summarizing && blindspotUpdate) {
      setSummary({
        questionId: blindspotUpdate.questionId,
        launchKey: blindspotUpdate.launchKey,
        status: "working",
      });
    }
  }

  async function summarize() {
    await run(EVENTS.TEACHER_SUMMARIZE, { language });
  }

  async function pairUp() {
    await run(EVENTS.TEACHER_PAIR_UP, {});
  }

  async function recheckQuestion() {
    await run(EVENTS.TEACHER_RECHECK, {});
  }

  const newCheckIn = () => run(EVENTS.TEACHER_CHECK_IN, { topic: pulse?.checkIn.topic ?? "" });

  async function toggleFocus() {
    const res = await run<{ focusMode: boolean }>(
      EVENTS.TEACHER_SET_FOCUS_MODE,
      { enabled: !focusMode },
    );
    if (res) setFocusMode(res.focusMode);
  }

  async function endClass() {
    const confirmed = window.confirm(t("feedbackEndAskConfirm"));

    if (!confirmed) return;

    await run(EVENTS.TEACHER_REQUEST_FEEDBACK, {});
    setFeedbackOpen(true);
  }

  async function finishAndCloseClass() {
    const confirmed = window.confirm(t("feedbackFinishConfirm"));

    if (!confirmed) return;

    await run(EVENTS.TEACHER_END_SESSION, {});
  }

  const isOpenQuestion = blindspotUpdate?.kind === "open";
  // Only the summary of THIS launch and round (a deck question's id repeats; a re-check is a new round).
  const currentSummary =
    summary &&
    blindspotUpdate &&
    summary.launchKey === blindspotUpdate.launchKey
      ? summary
      : null;

  const joinUrl = `${window.location.origin}/join?code=${code}`;
  const topics: Record<string, string> = Object.fromEntries([
    ...history.map((h) => [h.id, h.topic]),
    ...(pulse ? [[pulse.checkIn.id, pulse.checkIn.topic]] : []),
  ]);

  return (
    <main className="mx-auto max-w-[110rem] px-4 py-6 text-lg text-slate-950 sm:px-8">
      {/* header: the join code is the star, it is on the projector */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-indigo-600 p-5 text-white">
        <div>
          <div
            className="text-xl font-bold uppercase tracking-wide text-white"
            dir="auto"
          >
            {title || "Class Pulse"}
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-lg font-semibold text-white">
              {t("joinCode")}
            </span>
            <span className="font-mono text-5xl font-extrabold tracking-widest">
              {code}
            </span>
          </div>
          <div className="mt-1 text-base text-indigo-100">
            {t("studentsOpen")} <span className="font-semibold">{joinUrl}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate(`/teacher/${code}/present`)}
          >
            ✦ {t("presentButton")}
          </Button>
          <Button variant="secondary" onClick={endClass}>
            {t("endClass")}
          </Button>
        </div>
      </header>

      {error && (
        <p
          className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-800"
          role="alert"
        >
          {error}
        </p>
      )}
      {feedbackOpen && (
        <Card className="mb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">
                {t("feedbackTeacherEyebrow")}
              </p>

              <h2 className="mt-1 text-xl font-bold">
                {t("feedbackTeacherTitle")}
              </h2>

              <p className="mt-1 text-sm opacity-70">{t("feedbackWaiting")}</p>
            </div>

            <Button type="button" onClick={finishAndCloseClass} disabled={busy}>
              {t("feedbackFinishClose")}
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="text-sm opacity-60">{t("feedbackAverage")}</p>

              <strong className="mt-1 block text-3xl">
                {feedbackSummary.averageRating === null
                  ? "—"
                  : `${feedbackSummary.averageRating} / 5`}
              </strong>

              <div className="mt-1 text-xl">⭐⭐⭐⭐⭐</div>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm opacity-60">{t("feedbackResponses")}</p>

              <strong className="mt-1 block text-3xl">
                {feedbackSummary.totalResponses}
              </strong>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {feedbackSummary.feedback.length === 0 ? (
              <div className="rounded-xl border p-4 text-sm opacity-60">
                {t("feedbackNoResponses")}
              </div>
            ) : (
              feedbackSummary.feedback.map((item) => (
                <div key={item.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong>
                      {item.anonymous || !item.studentName
                        ? t("feedbackAnonymousStudent")
                        : item.studentName}
                    </strong>

                    <span>{"⭐".repeat(item.rating)}</span>
                  </div>

                  {item.comment && (
                    <p className="mt-2 text-sm opacity-75">{item.comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}
      {/* always in view: the % and the counts */}
      <div className="sticky top-16 z-10 mb-5">
        <LiveStats
          className="live-stats--card"
          pulse={pulse}
          answered={blindspotUpdate ? (blindspotUpdate.responses ?? 0) : null}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)] 2xl:grid-cols-[minmax(0,1fr)_36rem]">
        <div className="min-w-0 space-y-5">
          <Card title={t("writeQuestionTitle")}>
            <QuestionStudio
              code={code ?? ""}
              onLaunch={() => {
                setBlindspotUpdate(null);
                setSummary(null);
              }}
            />
          </Card>

          {quiz && (
            <Card title={t("quizHeading")}>
              <QuizResultsView quiz={quiz} />
            </Card>
          )}

          {blindspotUpdate && (
            <Card title={t("questionLive")}>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={closeQuestion}
                  disabled={blindspotUpdate.closed || busy}
                >
                  {t("closeQuestion")}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={pairUp}
                  disabled={isOpenQuestion || busy}
                >
                  {t("pairUp")}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={recheckQuestion}
                  disabled={isOpenQuestion || busy}
                >
                  {t("recheckQuestion")}
                </Button>

                {aiEnabled && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={summarize}
                    disabled={
                      !blindspotUpdate.responses ||
                      summary?.status === "working" ||
                      busy
                    }
                  >
                    ✦ {t("summarize")}
                  </Button>
                )}
              </div>
            </Card>
          )}

          {currentSummary && (
            <SummaryCard
              status={currentSummary.status}
              summary={currentSummary.summary}
              error={currentSummary.error}
            />
          )}

          {blindspotUpdate && isOpenQuestion && (
            <Card
              title={`${t("openAnswers")} (${blindspotUpdate.responses ?? 0})`}
            >
              {(blindspotUpdate.openAnswers?.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-500">{t("noAnswersYet")}</p>
              ) : (
                <ul className="space-y-2">
                  {blindspotUpdate.openAnswers!.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-xl bg-slate-50 px-3 py-2 text-sm"
                      dir="auto"
                    >
                      {!hideNames && (
                        <span className="me-2 font-semibold">{a.name}:</span>
                      )}
                      {a.text}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {blindspotUpdate && !isOpenQuestion && (
            <>
              <BlindspotHeadline
                studentCount={blindspotUpdate.counts.blindspot}
                belief={blindspotUpdate.headline}
              />

              <Card title="Blindspot quadrants">
                <QuadrantChart update={blindspotUpdate} />
              </Card>

              <Card title="Illusion gap">
                <IllusionGapChart update={blindspotUpdate} />
              </Card>
            </>
          )}

          <Card
            title={
              pulse?.checkIn.topic
                ? `${t("understanding")}: ${pulse.checkIn.topic}`
                : t("understanding")
            }
            right={
              <Button
                type="button"
                variant="secondary"
                className="!px-3 !py-2 !text-sm"
                onClick={newCheckIn}
                disabled={busy}
                title={t("newCheckInHint")}
              >
                ↻ {t("newCheckIn")}
              </Button>
            }
          >
            {pulse && <PulseBar pulse={pulse} />}
          </Card>

          {pulse?.comparison && (
            <Card title={t("reteach")}>
              <BeforeAfterChart comparison={pulse.comparison} />
            </Card>
          )}
        </div>

        <div className="min-w-0 space-y-5 lg:sticky lg:top-40 lg:max-h-[calc(100dvh-11rem)] lg:self-start lg:overflow-y-auto">
          <Card
            title={`${t("students")} (${pulse?.total ?? 0})`}
            right={
              <label className="flex cursor-pointer items-center gap-1.5 text-base text-slate-500">
                <input
                  type="checkbox"
                  checked={hideNames}
                  onChange={(e) => setHideNames(e.target.checked)}
                />
                {t("hide")}
              </label>
            }
          >
            <StudentGrid students={pulse?.perStudent} hideNames={hideNames} />
            {FEATURES.focusMode && (
              <label className="mt-4 flex cursor-pointer items-center gap-2 border-t border-slate-100 pt-3 text-base text-slate-600">
                <input
                  type="checkbox"
                  checked={focusMode}
                  onChange={toggleFocus}
                />
                🔒 {t("focusTeacher")}
              </label>
            )}
          </Card>

          <Card title={t("whereLost")}>
            <Timeline samples={timeline} topics={topics} />
          </Card>

          <Card title={t("whatHelp")}>
            <ReasonBars reasons={pulse?.reasons} notes={pulse?.otherNotes} />
          </Card>

          {FEATURES.focusMode && alerts.length > 0 && (
            <Card title={`🔒 ${t("alerts")}`}>
              <ul className="space-y-1 text-base">
                {alerts.map((a, i) => (
                  <li
                    key={`${a.at}-${i}`}
                    dir="auto"
                    className="text-slate-700"
                  >
                    <span className="font-semibold">
                      {hideNames ? t("aStudent") : a.name}
                    </span>{" "}
                    {t("left")}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
