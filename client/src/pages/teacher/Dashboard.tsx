import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EVENTS } from "@shared/events.ts";
import { FEATURES } from "@shared/features.ts";
import { socket, emitAck, SERVER_URL } from "../../socket/socket.ts";
import { useSocketEvents } from "../../socket/useSocketEvents.ts";
import BlindspotHeadline from "../../components/BlindspotHeadline.tsx";
import Button from "../../components/ui/Button.tsx";
import Card from "../../components/ui/Card.tsx";
import PulseBar from "../../components/PulseBar.tsx";
import StudentGrid from "../../components/StudentGrid.tsx";
import Timeline from "../../components/Timeline.tsx";
import ReasonBars from "../../components/ReasonBars.tsx";
import TopicHistory from "../../components/TopicHistory.tsx";
import BeforeAfterChart from "../../components/BeforeAfterChart.tsx";
import type { FormEvent } from "react";
import { usePreferences } from "../../context/PreferencesContext.tsx";
import QuadrantChart from "../../components/QuadrantChart.tsx";
import IllusionGapChart from "../../components/IllusionGapChart.tsx";
import type {
  BlindspotUpdate,
  CalibrationCard,
  FocusAlert,
  Pulse,
  Summary,
  TeacherState,
  TimelineSample,
} from "@shared/types.ts";

type DeckSummary = {
  id: string;
  title: string;
  questionCount: number;
};

type DeckQuestion = {
  id: string;
  topic: string;
  prompt: string;
  correctOptionId: string;
  options: {
    id: string;
    text: string;
  }[];
  rubric?: unknown;
};

type Deck = {
  id: string;
  title: string;
  questions: DeckQuestion[];
};

export default function Dashboard() {
  const { code } = useParams();
  const { t } = usePreferences();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [history, setHistory] = useState<Summary[]>([]);
  const [timeline, setTimeline] = useState<TimelineSample[]>([]);
  const [focusMode, setFocusMode] = useState(true);
  const [alerts, setAlerts] = useState<(FocusAlert & { at: number })[]>([]);
  const [topic, setTopic] = useState("");
  const [hideNames, setHideNames] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [questions, setQuestions] = useState<DeckQuestion[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [blindspotUpdate, setBlindspotUpdate] =
    useState<BlindspotUpdate | null>(null);

  const [calibrationCard, setCalibrationCard] =
    useState<CalibrationCard | null>(null);

  useEffect(() => {
    async function loadDecks() {
      try {
        const res = await fetch(`${SERVER_URL}/decks`);

        if (!res.ok) {
          throw new Error("Failed to load decks");
        }

        const data: DeckSummary[] = await res.json();
        setDecks(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }

    loadDecks();
  }, []);


  useEffect(() => {
    if (!selectedDeckId) {
      setQuestions([]);
      setSelectedQuestionId("");
      return;
    }

    async function loadDeck() {
      try {
        const res = await fetch(`${SERVER_URL}/decks/${selectedDeckId}`);

        if (!res.ok) {
          throw new Error("Failed to load deck");
        }

        const data: Deck = await res.json();

        setQuestions(data.questions);
        setSelectedQuestionId("");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }

    loadDeck();
  }, [selectedDeckId]);


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
        { code },
      );
      setTitle(state.title);
      setPulse(state.pulse);
      setHistory(state.history);
      setTimeline(state.timeline);
      setFocusMode(state.focusMode);
      setTopic((t) => t || state.pulse.checkIn.topic);
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

    [EVENTS.CALIBRATION_CARD]: (card: CalibrationCard) => {
      setCalibrationCard(card);
    },

    [EVENTS.SESSION_ENDED]: () => navigate("/"),
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

  const selectedQuestion = questions.find(
    (question) => question.id === selectedQuestionId,
  );

  async function launchQuestion() {
    if (!selectedQuestion) return;

    setBlindspotUpdate(null);
    setCalibrationCard(null);

    await run(EVENTS.TEACHER_LAUNCH_QUESTION, {
      question: selectedQuestion,
    });
  }

  async function pairUp() {
    await run(EVENTS.TEACHER_PAIR_UP, {});
  }

  async function recheckQuestion() {
    await run(EVENTS.TEACHER_RECHECK, {});
  }


  const checkIn = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    run(EVENTS.TEACHER_CHECK_IN, { topic });
  };

  async function toggleFocus() {
    const res = await run<{ focusMode: boolean }>(
      EVENTS.TEACHER_SET_FOCUS_MODE,
      { enabled: !focusMode },
    );
    if (res) setFocusMode(res.focusMode);
  }

  async function endClass() {
    if (!window.confirm(t("endConfirm"))) return;
    await run(EVENTS.TEACHER_END_SESSION, {});
  }

  const joinUrl = `${window.location.origin}/join?code=${code}`;
  const topics: Record<string, string> = Object.fromEntries([
    ...history.map((h) => [h.id, h.topic]),
    ...(pulse ? [[pulse.checkIn.id, pulse.checkIn.topic]] : []),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {/* header: the join code is the star, it is on the projector */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-indigo-600 p-5 text-white">
        <div>
          <div
            className="text-sm uppercase tracking-wide text-indigo-200"
            dir="auto"
          >
            {title || "Class Pulse"}
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-sm text-indigo-200">{t("joinCode")}</span>
            <span className="font-mono text-5xl font-extrabold tracking-widest">
              {code}
            </span>
          </div>
          <div className="mt-1 text-sm text-indigo-100">
            {t("studentsOpen")} <span className="font-semibold">{joinUrl}</span>
          </div>
        </div>
        <Button variant="secondary" onClick={endClass}>
          {t("endClass")}
        </Button>
      </header>

      {error && (
        <p
          className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-800"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">

          <Card title="Question launcher">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm text-slate-500">
                  Deck
                </span>

                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-3"
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  disabled={busy}
                >
                  <option value="">Choose a deck</option>

                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.title} ({deck.questionCount})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-slate-500">
                  Question
                </span>

                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-3"
                  value={selectedQuestionId}
                  onChange={(e) => setSelectedQuestionId(e.target.value)}
                  disabled={!selectedDeckId || busy}
                >
                  <option value="">{t("chooseQuestion")}</option>

                  {questions.map((question) => (
                    <option key={question.id} value={question.id}>
                      {question.topic} — {question.prompt}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={launchQuestion}
                  disabled={!selectedQuestion || busy}
                >
                  {t("launchQuestion")}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  disabled
                >
                  {t("closeQuestion")}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={pairUp}
                  disabled={!blindspotUpdate || busy}
                >
                  {t("pairUp")}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={recheckQuestion}
                  disabled={!blindspotUpdate || busy}
                >
                  {t("recheckQuestion")}
                </Button>
              </div>
            </div>
          </Card>

          <Card title={t("questionLauncher")}>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm text-slate-500">
                  {t("deck")}
                </span>

                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-3"
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  disabled={busy}
                >
                  <option value="">Choose a deck</option>

                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.title} ({deck.questionCount})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-slate-500">
                  Question
                </span>

                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-3"
                  value={selectedQuestionId}
                  onChange={(e) => setSelectedQuestionId(e.target.value)}
                  disabled={!selectedDeckId || busy}
                >
                  <option value="">Choose a question</option>

                  {questions.map((question) => (
                    <option key={question.id} value={question.id}>
                      {question.topic} — {question.prompt}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={launchQuestion}
                  disabled={!selectedQuestion || busy}
                >
                  Launch
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  disabled
                  title="Close question event is not available yet"
                >
                  Close
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={pairUp}
                  disabled={!blindspotUpdate || busy}
                >
                  Pair up
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={recheckQuestion}
                  disabled={!blindspotUpdate || busy}
                >
                  Re-check
                </Button>
              </div>
            </div>
          </Card>


          {blindspotUpdate && (
            <>
              <BlindspotHeadline
                studentCount={blindspotUpdate.counts.blindspot}
                belief={blindspotUpdate.headline}
              />

              <QuadrantChart update={blindspotUpdate} />

              <IllusionGapChart update={blindspotUpdate} />
            </>
          )}


          {blindspotUpdate && (
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


          <Card title={t("teaching")}>
            <form onSubmit={checkIn} className="flex flex-wrap items-end gap-3">
              <label className="min-w-0 flex-1">
                <span className="mb-1 block text-sm text-slate-500">
                  {t("topicLabel")}
                </span>
                <input
                  dir="auto"
                  className="w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
                  maxLength={80}
                  placeholder={t("topicPlaceholder")}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </label>
              <Button type="submit" disabled={busy}>
                {t("check")}
              </Button>
            </form>
            <p className="mt-2 text-sm text-slate-500">{t("teacherHint")}</p>
            {FEATURES.focusMode && (
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={focusMode}
                  onChange={toggleFocus}
                />
                🔒 {t("focusTeacher")}
              </label>
            )}
          </Card>

          <Card
            title={
              pulse?.checkIn.topic
                ? `${t("understanding")}: ${pulse.checkIn.topic}`
                : t("understanding")
            }
          >
            {pulse && <PulseBar pulse={pulse} />}
          </Card>

          {pulse?.comparison && (
            <Card title={t("reteach")}>
              <BeforeAfterChart comparison={pulse.comparison} />
            </Card>
          )}

          <Card title={t("whereLost")}>
            <Timeline samples={timeline} topics={topics} />
          </Card>

          <Card title={t("whatHelp")}>
            <ReasonBars reasons={pulse?.reasons} />
          </Card>
        </div>

        <div className="space-y-5">
          <Card
            title={`${t("students")} (${pulse?.total ?? 0})`}
            right={
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
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
          </Card>

          <Card title={t("topics")}>
            <TopicHistory history={history} pulse={pulse} />
          </Card>

          {FEATURES.focusMode && alerts.length > 0 && (
            <Card title={`🔒 ${t("alerts")}`}>
              <ul className="space-y-1 text-sm">
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
