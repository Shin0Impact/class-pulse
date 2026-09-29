import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { useWidth } from "./useWidth.ts";
import "./charts.css";

export type TrendPoint = {
  id: string;
  title: string;
  date: string; // ISO
  accuracy: number | null; // 0-100
  confidence: number | null; // 0-100
};

type Labels = {
  accuracy: string;
  confidence: string;
  showTable: string;
  className: string;
};

const HEIGHT = 220;
const M = { top: 12, right: 48, bottom: 28, left: 40 };
const TICKS = [0, 25, 50, 75, 100];

// Accuracy vs confidence, one point per class, on ONE 0-100% axis: the gap between the two lines is
// the story (confidence above accuracy = overconfident). Hover/focus shows both values at a class.
export default function CalibrationTrendChart({
  points,
  labels,
  locale,
}: {
  points: TrendPoint[];
  labels: Labels;
  locale: string;
}) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const dayFmt = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const timeFmt = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  // Several classes on one day would all read "Sep 29": add the time when days repeat.
  const days = points.map((p) => dayFmt.format(new Date(p.date)));
  const fmtDate = new Set(days).size < days.length ? timeFmt : dayFmt;
  const plotW = width - M.left - M.right;
  const plotH = HEIGHT - M.top - M.bottom;
  const n = points.length;
  const x = (i: number) => M.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => M.top + plotH - (v / 100) * plotH;

  const series = [
    { key: "accuracy" as const, name: labels.accuracy, color: "var(--viz-series-1)" },
    { key: "confidence" as const, name: labels.confidence, color: "var(--viz-series-2)" },
  ];

  const path = (key: "accuracy" | "confidence") =>
    points
      .map((p, i) => (p[key] === null ? null : `${x(i)},${y(p[key] as number)}`))
      .filter(Boolean)
      .map((pt, i) => `${i === 0 ? "M" : "L"}${pt}`)
      .join(" ");

  // Every ~70px (~110px with times) gets a date label; the rest stay in the tooltip and the table.
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / (fmtDate === timeFmt ? 110 : 70)))));

  function nearest(e: PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left;
    const i = n === 1 ? 0 : Math.round((px / box.width) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  }

  function onKey(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  }

  const last = points[n - 1];
  const endLabels =
    last && last.accuracy !== null && last.confidence !== null && Math.abs(y(last.accuracy) - y(last.confidence)) >= 14;

  const activePoint = active !== null ? points[active] : null;
  const tipLeft = active !== null ? (x(active) > width - 190 ? x(active) - 170 : x(active) + 14) : 0;

  return (
    <div className="viz" ref={wrapRef} dir="ltr">
      <ul className="viz-legend">
        {series.map((s) => (
          <li key={s.key}>
            <span className="viz-key" style={{ background: s.color }} aria-hidden="true" />
            {s.name}
          </li>
        ))}
      </ul>

      <svg
        className="viz-svg"
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`${labels.accuracy} / ${labels.confidence}`}
        tabIndex={0}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {TICKS.map((v) => (
          <g key={v}>
            <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke="var(--viz-grid)" strokeWidth={1} />
            <text x={M.left - 8} y={y(v) + 4} textAnchor="end">
              {v}%
            </text>
          </g>
        ))}

        {points.map((p, i) =>
          i % every === 0 || i === n - 1 ? (
            <text key={p.id} x={x(i)} y={HEIGHT - 8} textAnchor="middle">
              {fmtDate.format(new Date(p.date))}
            </text>
          ) : null,
        )}

        {active !== null && (
          <line x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + plotH} stroke="var(--faint)" strokeWidth={1} />
        )}

        {series.map((s) => (
          <g key={s.key}>
            <path d={path(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) =>
              p[s.key] === null ? null : (
                <circle
                  key={p.id}
                  cx={x(i)}
                  cy={y(p[s.key] as number)}
                  r={active === i ? 5.5 : 4}
                  fill={s.color}
                  stroke="var(--viz-surface)"
                  strokeWidth={2}
                />
              ),
            )}
          </g>
        ))}

        {endLabels && last && (
          <>
            <text className="viz-end-label" x={x(n - 1) + 10} y={y(last.accuracy as number) + 4}>
              {last.accuracy}%
            </text>
            <text className="viz-end-label" x={x(n - 1) + 10} y={y(last.confidence as number) + 4}>
              {last.confidence}%
            </text>
          </>
        )}

        {/* hit area: the whole plot, so the pointer only has to be near a class, not on a dot */}
        <rect
          x={M.left - 10}
          y={M.top}
          width={plotW + 20}
          height={plotH}
          fill="transparent"
          onPointerMove={nearest}
          onPointerDown={nearest}
          onPointerLeave={() => setActive(null)}
        />
      </svg>

      {activePoint && (
        <div className="viz-tooltip" style={{ left: tipLeft, top: 36 }}>
          <p>
            {activePoint.title || fmtDate.format(new Date(activePoint.date))}
          </p>
          {series.map((s) => (
            <div key={s.key}>
              <span className="viz-key" style={{ background: s.color }} aria-hidden="true" />
              <strong>{activePoint[s.key] === null ? "–" : `${activePoint[s.key]}%`}</strong>
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      )}

      <details className="viz-table">
        <summary>{labels.showTable}</summary>
        <table>
          <thead>
            <tr>
              <th>{labels.className}</th>
              <th>{labels.accuracy}</th>
              <th>{labels.confidence}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.id}>
                <td dir="auto">
                  {p.title || "—"} · {fmtDate.format(new Date(p.date))}
                </td>
                <td>{p.accuracy === null ? "–" : `${p.accuracy}%`}</td>
                <td>{p.confidence === null ? "–" : `${p.confidence}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
