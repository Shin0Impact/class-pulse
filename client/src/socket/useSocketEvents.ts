import { useEffect, useRef } from "react";
import { socket } from "./socket.ts";
import { EVENTS } from "@shared/events.ts";

import type {
  CheckIn,
  FocusAlert,
  Pulse,
  Summary,
  PublicQuestion,
  PairAssigned,
  AnswerReveal,
  BlindspotUpdate,
  CalibrationCard,
  ClassConfusionSummary,
  StudentQuiz,
  QuizResults,
} from "@shared/types.ts";

// SUMMARY_UPDATE: the AI class-confusion summary for a question
// is being written / ready / failed.
export type SummaryState = {
  questionId: string;
  launchKey?: string;
  status: "working" | "ready" | "failed";
  summary?: ClassConfusionSummary;
  error?: string;
};

type Handlers = {
  [EVENTS.PULSE_UPDATE]?: (data: Pulse) => void;

  [EVENTS.CHECK_IN_STARTED]?: (
    data:
      | { checkInId: string; topic: string }
      | { checkIn: CheckIn; history: Summary[] },
  ) => void;

  [EVENTS.FOCUS_ALERT]?: (data: FocusAlert) => void;

  [EVENTS.FOCUS_MODE]?: (data: { enabled: boolean }) => void;

  // The teacher's copy carries the id of the class that just ended (for its recap page).
  [EVENTS.SESSION_ENDED]?: (data?: { classId?: string }) => void;

  [EVENTS.QUESTION_STARTED]?: (data: PublicQuestion) => void;

  [EVENTS.PAIR_ASSIGNED]?: (data: PairAssigned) => void;

  // S4 — sent privately to the student when the round closes.
  [EVENTS.ANSWER_REVEAL]?: (data: AnswerReveal) => void;

  [EVENTS.BLINDSPOT_UPDATE]?: (data: BlindspotUpdate) => void;

  [EVENTS.CALIBRATION_CARD]?: (data: CalibrationCard) => void;

  [EVENTS.QUESTION_CLOSED]?: (data: { questionId: string }) => void;

  [EVENTS.SUMMARY_UPDATE]?: (data: SummaryState) => void;

  // Quiz: students get their own view; the teacher gets live results.
  [EVENTS.QUIZ_STARTED]?: (data: StudentQuiz) => void;
  [EVENTS.QUIZ_CLOSED]?: (data: { quizId: string }) => void;
  [EVENTS.QUIZ_UPDATE]?: (data: QuizResults) => void;

  // =====================================================
  // G9 — Class Feedback
  // =====================================================

  // Sent to students when the teacher requests class feedback.
  [EVENTS.FEEDBACK_REQUESTED]?: () => void;

  // Sent to teacher whenever a student submits feedback.
  [EVENTS.FEEDBACK_UPDATE]?: (data: {
    averageRating: number | null;
    totalResponses: number;
    feedback: {
      id: string;
      rating: 1 | 2 | 3 | 4 | 5;
      comment: string;
      anonymous: boolean;
      studentName: string | null;
      createdAt: number;
    }[];
  }) => void;
};

// useSocketEvents({
//   [EVENTS.PULSE_UPDATE]: (data) => ...,
//   ...
// })
//
// Subscribes on mount and unsubscribes on unmount.
// Handlers always see the latest state, avoiding stale closures.
export function useSocketEvents(handlers: Handlers): void {
  const ref = useRef(handlers);

  ref.current = handlers;

  useEffect(() => {
    const subs = Object.keys(ref.current).map((event) => {
      const fn = (data: unknown) => {
        const handler = ref.current[event as keyof Handlers];

        if (handler) {
          (handler as (value: unknown) => void)(data);
        }
      };

      socket.on(event, fn);

      return {
        event,
        fn,
      };
    });

    return () => {
      subs.forEach(({ event, fn }) => {
        socket.off(event, fn);
      });
    };
  }, []);
}
