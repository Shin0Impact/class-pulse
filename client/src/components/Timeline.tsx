import { usePreferences } from '../context/PreferencesContext.tsx';
import type { TimelineSample } from '@shared/types.ts';
const W = 640, H = 190, PL = 42, PR = 10, PT = 10, PB = 28;
const MIN_LABEL_GAP = 96; // px between topic labels, so they never pile on top of each other

const short = (s: string, n = 18) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// "Where did we lose them?": class understanding over the lesson, split by check-in/topic.
// samples: [{ t, pct, marked, checkInId }]   topics: { [checkInId]: topic }
type MarkedSample = TimelineSample & { pct: number };
export default function Timeline({ samples, topics }: { samples: TimelineSample[]; topics: Record<string, string> }) {
  const { t } = usePreferences();
  const pts = samples.filter((s): s is MarkedSample => s.pct !== null);
  if (pts.length < 2) {
    return <p className="text-sm text-slate-500">{t('chartWait')}</p>;
  }

  const t0 = samples[0].t;
  const t1 = Math.max(samples[samples.length - 1].t, t0 + 30000);
  const x = (t: number) => PL + ((t - t0) / (t1 - t0)) * (W - PL - PR);
  const y = (p: number) => PT + ((100 - p) / 100) * (H - PT - PB);

  // one line per check-in, so the line breaks when the teacher checks in again
  const segments: { id: string; pts: MarkedSample[] }[] = [];
  for (const s of pts) {
    const last = segments[segments.length - 1];
    if (last && last.id === s.checkInId) last.pts.push(s);
    else segments.push({ id: s.checkInId, pts: [s] });
  }
  // a dashed divider where each new check-in starts; only label it if there is room
  const withData = new Set(pts.map((s) => s.checkInId)); // skip check-ins nobody marked anything in
  const dividers: (TimelineSample & { showLabel: boolean })[] = [];
  let prev: string | null = null;
  let lastLabelX = -Infinity;
  for (const s of samples) {
    if (s.checkInId === prev) continue;
    prev = s.checkInId;
    if (!withData.has(s.checkInId)) continue;
    const showLabel = x(s.t) - lastLabelX >= MIN_LABEL_GAP;
    if (showLabel) lastLabelX = x(s.t);
    dividers.push({ ...s, showLabel });
  }

  // stepped line: the class stays where it is until someone changes their mind
  const path = (list: MarkedSample[]) => list.map((s, i) => (i === 0 ? `M${x(s.t)} ${y(s.pct)}` : `H${x(s.t)} V${y(s.pct)}`)).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Class understanding over the lesson">
      <rect x={PL} y={y(100)} width={W - PL - PR} height={y(75) - y(100)} className="fill-emerald-50" />
      <rect x={PL} y={y(75)} width={W - PL - PR} height={y(50) - y(75)} className="fill-amber-50" />
      <rect x={PL} y={y(50)} width={W - PL - PR} height={y(0) - y(50)} className="fill-rose-50" />
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} className="stroke-slate-200" />
          <text x={PL - 6} y={y(v) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">{v}%</text>
        </g>
      ))}

      {dividers.map((s, i) => (
        <g key={`${s.checkInId}-${i}`}>
          <line x1={x(s.t)} x2={x(s.t)} y1={PT} y2={H - PB} className="stroke-slate-400" strokeDasharray="4 3" />
          {s.showLabel && <text x={x(s.t) + 4} y={H - 10} className="fill-slate-600 text-[11px] font-semibold">{short(topics[s.checkInId] || t('general'))}</text>}
        </g>
      ))}

      {segments.map((seg, i) => (
        <g key={`${seg.id}-${i}`}>
          <path d={path(seg.pts)} fill="none" strokeWidth="3" strokeLinejoin="round" className="stroke-indigo-600" />
          {seg.pts.map((s, j) => <circle key={j} cx={x(s.t)} cy={y(s.pct)} r="3" className="fill-indigo-600" />)}
        </g>
      ))}
    </svg>
  );
}
