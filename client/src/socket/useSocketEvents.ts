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
} from "@shared/types.ts";

type Handlers = {
  [EVENTS.PULSE_UPDATE]?: (data: Pulse) => void;

  [EVENTS.CHECK_IN_STARTED]?: (
    data:
      | { checkInId: string; topic: string }
      | { checkIn: CheckIn; history: Summary[] },
  ) => void;

  [EVENTS.FOCUS_ALERT]?: (data: FocusAlert) => void;

  [EVENTS.FOCUS_MODE]?: (data: { enabled: boolean }) => void;

  [EVENTS.SESSION_ENDED]?: () => void;

  [EVENTS.QUESTION_STARTED]?: (data: PublicQuestion) => void;

  [EVENTS.PAIR_ASSIGNED]?: (data: PairAssigned) => void;

  // S4 — sent privately to the student when the round closes.
  [EVENTS.ANSWER_REVEAL]?: (data: AnswerReveal) => void;
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
