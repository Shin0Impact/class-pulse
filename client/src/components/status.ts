// Single source of truth for colors. Every status also has a symbol + label, so color is never the only signal.
export const STATUS_UI = {
  green: { label: 'Got it', symbol: '✓', bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-900 ring-emerald-300', text: 'text-emerald-700' },
  yellow: { label: 'Not sure', symbol: '~', bar: 'bg-amber-400', chip: 'bg-amber-100 text-amber-900 ring-amber-300', text: 'text-amber-700' },
  red: { label: 'Lost', symbol: '✗', bar: 'bg-rose-500', chip: 'bg-rose-100 text-rose-900 ring-rose-300', text: 'text-rose-700' },
  waiting: { label: 'Not marked', symbol: '…', bar: 'bg-slate-300', chip: 'bg-slate-100 text-slate-600 ring-slate-200', text: 'text-slate-500' },
};

export const STATUS_ORDER = ['green', 'yellow', 'red', 'waiting'] as const;

// Color + advice for the class understanding %
export function understandingTone(pct: number | null | undefined) {
  if (pct === null || pct === undefined) return { text: 'text-slate-400', pill: 'bg-slate-100 text-slate-500', advice: 'Waiting for students to mark how well they follow.' };
  if (pct >= 75) return { text: 'text-emerald-600', pill: 'bg-emerald-100 text-emerald-800', advice: 'Most of the class is with you.' };
  if (pct >= 50) return { text: 'text-amber-600', pill: 'bg-amber-100 text-amber-800', advice: 'Part of the class is getting lost. A quick recap could help.' };
  return { text: 'text-rose-600', pill: 'bg-rose-100 text-rose-800', advice: 'Most of the class is lost. Consider slowing down or re-explaining.' };
}
