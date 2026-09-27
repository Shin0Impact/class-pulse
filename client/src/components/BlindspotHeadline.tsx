type BlindspotHeadlineProps = {
  studentCount: number;
  belief: string;
};

export default function BlindspotHeadline({
  studentCount,
  belief,
}: BlindspotHeadlineProps) {
  if (studentCount <= 0 || !belief.trim()) {
    return null;
  }

  const studentLabel = studentCount === 1 ? 'student is' : 'students are';

  return (
    <section
      className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm"
      aria-label="Class blindspot"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">
          💡
        </span>

        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
          Class blindspot
        </p>
      </div>

      <p className="text-2xl font-bold leading-snug text-slate-900">
        {studentCount} {studentLabel} sure that{' '}
        <span className="text-amber-800">“{belief}”</span>
      </p>

      <p className="mt-3 text-sm text-slate-600">
        These students answered incorrectly with high confidence.
      </p>
    </section>
  );
}