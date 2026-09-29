import "./charts.css";

export type BarItem = {
  id: string;
  label: string;
  sublabel?: string;
  value: number; // drawn length, on the 0..max scale
  display: string; // the value as written at the bar tip
  muted?: boolean; // de-emphasised (grey) bar; the rest carry the accent colour
};

// Horizontal bars from one baseline, value written at each tip (few bars, so every tip is labelled).
// Bars take 80% of the track at most, leaving room for the value label so it never clips.
export default function BarList({ items, max, label }: { items: BarItem[]; max: number; label: string }) {
  const scale = max > 0 ? max : 1;
  return (
    <ul className="viz viz-bars" aria-label={label}>
      {items.map((item) => (
        <li key={item.id} className="viz-bar">
          <span className="viz-bar__label" dir="auto">
            {item.label}
            {item.sublabel && <small>{item.sublabel}</small>}
          </span>
          <span className="viz-bar__track">
            <span
              className={`viz-bar__fill${item.muted ? " viz-bar__fill--muted" : ""}`}
              style={{ width: `${Math.max(0, Math.min(1, item.value / scale)) * 80}%` }}
              aria-hidden="true"
            />
            <span className="viz-bar__value">{item.display}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
