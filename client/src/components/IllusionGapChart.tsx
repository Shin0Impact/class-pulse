import type { BlindspotUpdate } from "@shared/types.ts";

type IllusionGapChartProps = {
  update: BlindspotUpdate;
};

function Bar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-slate-500">{pct}%</span>
      </div>

      <div className="h-9 w-full overflow-hidden rounded-lg bg-slate-100">
        <div
          className={`flex h-full items-center justify-end rounded-lg pr-3 text-lg font-bold text-white transition-all duration-1000 ${color}`}
          style={{ width: `${Math.max(pct, 8)}%` }}
        >
          {pct}%
        </div>
      </div>
    </div>
  );
}

export default function IllusionGapChart({
  update,
}: IllusionGapChartProps) {
  const students = [
    ...update.groups.mastered,
    ...update.groups.fragile,
    ...update.groups.blindspot,
    ...update.groups.aware,
  ];

  if (students.length === 0) return null;

  const confidentStudents = students.filter(
    (student) =>
      student.confidence === "certain" ||
      student.confidence === "fairly-sure"
  ).length;

  const correctStudents = students.filter(
    (student) => student.correct
  ).length;

  const feltUnderstanding = Math.round(
    (confidentStudents / students.length) * 100
  );

  const realUnderstanding = Math.round(
    (correctStudents / students.length) * 100
  );

  const gap =
    update.illusionGap ??
    feltUnderstanding - realUnderstanding;

  return (
    <div className="space-y-3">
      <Bar
        label="Felt understanding"
        pct={feltUnderstanding}
        color="bg-amber-500"
      />

      <Bar
        label="Real understanding"
        pct={realUnderstanding}
        color="bg-emerald-500"
      />

      <p
        className={`text-lg font-bold ${
          gap > 0 ? "text-rose-700" : "text-emerald-700"
        }`}
      >
        {gap > 0 ? "▲ +" : gap < 0 ? "▼ " : ""}
        {gap} points illusion gap
      </p>
    </div>
  );
}