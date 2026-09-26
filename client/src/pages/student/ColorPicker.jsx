import { REASONS } from '@shared/events.js';

const OPTIONS = [
  { id: 'green', label: 'I follow', hint: 'Keep going', symbol: '✓', dot: 'bg-emerald-500', on: 'border-emerald-600 bg-emerald-50' },
  { id: 'yellow', label: 'Not sure', hint: 'I am a bit lost', symbol: '~', dot: 'bg-amber-400', on: 'border-amber-500 bg-amber-50' },
  { id: 'red', label: "I'm lost", hint: 'Please slow down or repeat', symbol: '✗', dot: 'bg-rose-500', on: 'border-rose-600 bg-rose-50' },
];

// Three big buttons (thumb friendly). After Not sure / Lost, one optional tap says what would help.
export default function ColorPicker({ status, reason, onStatus, onReason }) {
  return (
    <div>
      <ul className="space-y-3">
        {OPTIONS.map((o) => {
          const selected = status === o.id;
          return (
            <li key={o.id}>
              <button
                onClick={() => onStatus(o.id)}
                aria-pressed={selected}
                className={`flex min-h-24 w-full items-center gap-4 rounded-3xl border-4 p-4 text-start transition active:scale-[0.98]
                  ${selected ? o.on : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white ${o.dot}`} aria-hidden>{o.symbol}</span>
                <span>
                  <span className="block text-2xl font-bold">{o.label}</span>
                  <span className="block text-slate-500">{o.hint}</span>
                </span>
                {selected && <span className="ms-auto text-sm font-semibold text-slate-600">Selected</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {(status === 'yellow' || status === 'red') && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-slate-600">What would help? (optional)</p>
          <ul className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <li key={r.id}>
                <button onClick={() => onReason(r.id)} aria-pressed={reason === r.id}
                        className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition ${reason === r.id ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white'}`}>
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
