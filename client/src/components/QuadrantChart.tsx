import { useLayoutEffect, useRef } from 'react';
import type { BlindspotUpdate, Quadrant } from '@shared/types.ts';

type QuadrantChartProps = {
  update: BlindspotUpdate;
};

const quadrants: {
  key: Quadrant;
  label: string;
  description: string;
  color: string;
  dot: string;
}[] = [
  {
    key: 'mastered',
    label: 'Mastered',
    description: 'Correct and confident',
    color: 'border-emerald-300 bg-emerald-50',
    dot: 'bg-emerald-500',
  },
  {
    key: 'fragile',
    label: 'Fragile',
    description: 'Correct but unsure',
    color: 'border-amber-300 bg-amber-50',
    dot: 'bg-amber-500',
  },
  {
    key: 'blindspot',
    label: 'Blindspot',
    description: 'Wrong but confident',
    color: 'border-rose-300 bg-rose-50',
    dot: 'bg-rose-500',
  },
  {
    key: 'aware',
    label: 'Aware',
    description: 'Wrong and unsure',
    color: 'border-slate-300 bg-slate-50',
    dot: 'bg-slate-500',
  },
];

export default function QuadrantChart({ update }: QuadrantChartProps) {
  const previousPositions = useRef<Map<string, DOMRect>>(new Map());

  useLayoutEffect(() => {
    const dots = document.querySelectorAll<HTMLElement>(
      '[data-quadrant-student]'
    );

    const currentPositions = new Map<string, DOMRect>();

    dots.forEach((dot) => {
      const studentId = dot.dataset.studentId;

      if (!studentId) return;

      const newPosition = dot.getBoundingClientRect();
      currentPositions.set(studentId, newPosition);

      const oldPosition = previousPositions.current.get(studentId);

      if (!oldPosition) return;

      const deltaX = oldPosition.left - newPosition.left;
      const deltaY = oldPosition.top - newPosition.top;

      if (deltaX === 0 && deltaY === 0) return;

      // Start visually at the student's old position.
      dot.style.transition = 'none';
      dot.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

      // Force the browser to apply the starting position.
      dot.getBoundingClientRect();

      // Animate to the new quadrant.
      requestAnimationFrame(() => {
        dot.style.transition = 'transform 500ms ease';
        dot.style.transform = 'translate(0, 0)';
      });
    });

    previousPositions.current = currentPositions;
  }, [update]);

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      aria-label="Student understanding quadrants"
    >
      {quadrants.map(({ key, label, description, color, dot }) => (
        <section
          key={key}
          className={`rounded-xl border p-4 ${color}`}
          aria-label={`${label}: ${update.counts[key]} students`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">{label}</h3>
              <p className="text-sm text-slate-600">{description}</p>
            </div>

            <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-800">
              {update.counts[key]}
            </span>
          </div>

          <div className="mt-4 flex min-h-10 flex-wrap items-center gap-2">
            {update.groups[key].map((student) => (
              <span
                key={student.id}
                data-quadrant-student
                data-student-id={student.id}
                className={`inline-block h-5 w-5 rounded-full ${dot}`}
                title={`${student.name}: ${student.confidence}, chose ${student.optionId}`}
                aria-label={student.name}
                role="img"
              />
            ))}

            {update.groups[key].length === 0 && (
              <span className="text-sm text-slate-500">
                No students yet
              </span>
            )}
          </div>

          {/* Wrong answers: the teacher needs to know WHO, not just how many. */}
          {(key === 'blindspot' || key === 'aware') && update.groups[key].length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label={`${label}: student names`}>
              {update.groups[key].map((student) => (
                <li
                  key={student.id}
                  dir="auto"
                  className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-800 shadow-sm"
                >
                  {student.name}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}