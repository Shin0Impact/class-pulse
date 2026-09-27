import type { Comparison } from '@shared/types.ts';

// The "60% -> 85%" moment: same topic, before and after re-teaching. Plain divs, no chart library needed.
function Bar({ label, pct, sub, color }: { label: string; pct: number; sub: string; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-slate-500">{sub}</span>
      </div>
      <div className="h-9 w-full overflow-hidden rounded-lg bg-slate-100">
        <div className={`flex h-full items-center justify-end rounded-lg pr-3 text-lg font-bold text-white transition-all duration-1000 ${color}`}
             style={{ width: `${Math.max(pct, 8)}%` }}>
          {pct}%
        </div>
      </div>
    </div>
  );
}

export default function BeforeAfterChart({ comparison }: { comparison: Comparison | null }) {
  if (!comparison) return null;
  const up = comparison.delta >= 0;
  return (
    <div className="space-y-3">
      <Bar label="Before re-teaching" pct={comparison.before} sub={`${comparison.beforeMarked} marked`} color="bg-slate-500" />
      <Bar label="Now" pct={comparison.after} sub={`${comparison.afterMarked} marked`} color="bg-emerald-500" />
      <p className={`text-lg font-bold ${up ? 'text-emerald-700' : 'text-rose-700'}`} dir="auto">
        {up ? '▲ +' : '▼ '}{comparison.delta} points on "{comparison.topic}"
      </p>
    </div>
  );
}
