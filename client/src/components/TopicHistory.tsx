import { understandingTone } from './status.ts';
import { usePreferences } from '../context/PreferencesContext.tsx';
import type { Pulse, Summary } from '@shared/types.ts';

// Every topic so far with its understanding %, plus the live one at the bottom.
export default function TopicHistory({ history = [], pulse }: { history?: Summary[]; pulse: Pulse | null }) {
  const { t } = usePreferences();
  // When the teacher checks in, the history update can arrive a moment before the new pulse:
  // never list the same check-in twice.
  const rows = history
    .filter((h) => h.id !== pulse?.checkIn.id)
    .map((h) => ({ key: h.id, topic: h.topic, pct: h.pct, marked: h.marked, live: false }));
  if (pulse) rows.push({ key: `live-${pulse.checkIn.id}`, topic: pulse.checkIn.topic, pct: pulse.pct, marked: pulse.marked, live: true });

  return (
    <ul className="space-y-2 text-sm">
      {rows.map((r) => {
        const tone = understandingTone(r.pct);
        return (
          <li key={r.key} className="flex items-center justify-between gap-2" dir="auto">
            <span className="min-w-0 break-words">
              {r.live && <span className="mr-1 rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-700">Now</span>}
              <span className="font-medium">{r.topic || t('general')}</span>
              <span className="text-slate-400"> · {r.marked} marked</span>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 font-bold tabular-nums ${tone.pill}`}>{r.pct === null ? '–' : `${r.pct}%`}</span>
          </li>
        );
      })}
    </ul>
  );
}
