import { STATUS_UI, STATUS_ORDER, understandingTone } from './status.js';

// The live class understanding: one big number, one segmented bar. Built for a projector.
export default function PulseBar({ pulse }) {
  const tone = understandingTone(pulse.pct);
  const total = Math.max(pulse.total, 1);
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className={`text-7xl font-extrabold leading-none tabular-nums ${tone.text}`} aria-live="polite">
            {pulse.pct === null ? '–' : `${pulse.pct}%`}
          </div>
          <div className="mt-1 text-sm text-slate-500">class understanding</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold tabular-nums">{pulse.marked}<span className="text-lg text-slate-400">/{pulse.total}</span></div>
          <div className="text-sm text-slate-500">have marked</div>
        </div>
      </div>

      <p className={`mt-3 font-medium ${tone.text}`}>{tone.advice}</p>

      <div className="mt-3 flex h-6 w-full overflow-hidden rounded-full bg-slate-100" role="img"
           aria-label={STATUS_ORDER.map((s) => `${pulse.counts[s]} ${STATUS_UI[s].label}`).join(', ')}>
        {STATUS_ORDER.map((s) => (
          <div key={s} className={`${STATUS_UI[s].bar} transition-all duration-500`} style={{ width: `${(100 * pulse.counts[s]) / total}%` }} />
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {STATUS_ORDER.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span className={`inline-block h-3 w-3 rounded-full ${STATUS_UI[s].bar}`} />
            <span className="font-semibold tabular-nums">{pulse.counts[s]}</span>
            <span className="text-slate-500">{STATUS_UI[s].label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-400">Got it counts 100, Not sure counts 50, Lost counts 0, averaged over the students who marked.</p>
    </div>
  );
}
