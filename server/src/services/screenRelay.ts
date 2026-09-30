// The Screen window on a second device: the teacher's Present view sends its state (which saved file,
// which page, scroll, the live question) and the screen mirrors it. The file itself never passes
// through here: the screen downloads it from the teacher's saved files. In memory, per live class.
export type ScreenState = {
  doc: { id: string; name: string } | null;
  page: number;
  question: { prompt: string; options: { id: string; text: string }[]; closed: boolean } | null;
  fit: 'page' | 'scroll';
  scroll: number;
};

const latest = new Map<string, ScreenState>();

export const setScreenState = (code: string, state: ScreenState) => void latest.set(code, state);
export const screenState = (code: string) => latest.get(code) ?? null;
export const dropScreen = (code: string) => void latest.delete(code);

// Only what the students see: prompt and options, never the answer key.
export function cleanState(input: unknown): ScreenState | null {
  const s = input as Partial<ScreenState> | null;
  if (!s || typeof s !== 'object') return null;
  const q = s.question;
  const d = s.doc;
  return {
    doc: d && typeof d.id === 'string' && d.id ? { id: d.id.slice(0, 64), name: String(d.name ?? '').slice(0, 200) } : null,
    page: Number.isFinite(s.page) ? Math.max(1, Math.floor(s.page as number)) : 1,
    fit: s.fit === 'scroll' ? 'scroll' : 'page',
    scroll: Number.isFinite(s.scroll) ? Math.min(1, Math.max(0, s.scroll as number)) : 0,
    question:
      q && typeof q.prompt === 'string'
        ? {
            prompt: q.prompt.slice(0, 1000),
            closed: Boolean(q.closed),
            options: Array.isArray(q.options)
              ? q.options.slice(0, 8).map((o) => ({ id: String(o?.id ?? '').slice(0, 8), text: String(o?.text ?? '').slice(0, 500) }))
              : [],
          }
        : null,
  };
}
