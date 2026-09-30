// How the Present window drives the Screen window: same-origin BroadcastChannel, no server.
// The screen window is a mirror. It only ever receives what students see (never the right answer).
export const SCREEN_CHANNEL = (code: string) => `classpulse:screen:${code}`;

export type ScreenQuestion = {
  prompt: string;
  options: { id: string; text: string }[]; // empty for an open question
  closed: boolean;
};

export type ScreenMessage =
  | { type: "hello" } // screen -> present: "I just opened, send me everything"
  | { type: "doc"; blob: Blob; name: string } // present -> screen
  | { type: "nodoc" }
  | { type: "state"; page: number; question: ScreenQuestion | null; fit: "page" | "scroll"; scroll: number };
