// "What would help": the reasons students gave when they marked Not sure / Lost.
export default function ReasonBars({ reasons }) {
  if (!reasons?.length) return <p className="text-sm text-slate-500">Nobody has given a reason yet. Students can add one after marking Not sure or Lost.</p>;
  const max = Math.max(...reasons.map((r) => r.count));
  return (
    <ul className="space-y-2">
      {reasons.map((r) => (
        <li key={r.id}>
          <div className="mb-0.5 flex justify-between text-sm">
            <span className="font-medium">{r.label}</span>
            <span className="tabular-nums text-slate-500">{r.count}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${(100 * r.count) / max}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
