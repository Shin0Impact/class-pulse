// Throwaway demo page: renders every Blindspot mock payload so the team can SEE the shape of the
// data before the real UI (Ramez's QuadrantChart/BlindspotHeadline, Salam's AnswerScreen) exists.
// Delete this file once the real screens land -- it's scaffolding, not a deliverable.
import Card from '../components/ui/Card.tsx';
import {
  mockQuestionStarted,
  mockBlindspotUpdate,
  mockTeacherPairUpAck,
  mockPairAssignedExplainer,
  mockPairAssignedListener,
  mockCalibrationCardOverconfident,
  mockCalibrationCardWellCalibrated,
} from '../mocks/index.ts';
import type { QuadrantStudent } from '@shared/types.ts';

const QUADRANT_STYLE: Record<string, { label: string; color: string }> = {
  mastered: { label: 'Mastered (confident + correct)', color: 'border-emerald-300 bg-emerald-50' },
  fragile: { label: 'Fragile (correct but unsure)', color: 'border-amber-300 bg-amber-50' },
  blindspot: { label: 'Blindspot (confident + WRONG)', color: 'border-rose-300 bg-rose-50' },
  aware: { label: 'Aware (unsure and wrong)', color: 'border-slate-300 bg-slate-50' },
};

function StudentChip({ s }: { s: QuadrantStudent }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200">
      <div className="font-medium text-slate-800">{s.name}</div>
      <div className="text-xs text-slate-500">picked "{s.optionId}" · {s.confidence}</div>
    </div>
  );
}

export default function BlindspotDemo() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-900">Blindspot -- mock data demo</h1>
      <p className="text-sm text-slate-500">
        This page is scaffolding only: it just renders <code>client/src/mocks</code> so you can see the
        shapes on screen. Nothing here talks to the server yet (that's X4, not built).
      </p>

      <Card title="The launched question">
        <p className="mb-3 font-medium">{mockQuestionStarted.prompt}</p>
        <ul className="flex flex-wrap gap-2">
          {mockQuestionStarted.options.map((o) => (
            <li key={o.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{o.text}</li>
          ))}
        </ul>
      </Card>

      <Card
        title="blindspot:update"
        right={<span className="text-sm font-medium text-rose-600">{mockBlindspotUpdate.headline}</span>}
      >
        <div className="mb-4 text-sm text-slate-500">Illusion gap: {mockBlindspotUpdate.illusionGap ?? '—'}</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(mockBlindspotUpdate.groups) as (keyof typeof mockBlindspotUpdate.groups)[]).map((key) => (
            <div key={key} className={`rounded-xl border p-3 ${QUADRANT_STYLE[key].color}`}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                {QUADRANT_STYLE[key].label} · {mockBlindspotUpdate.counts[key]}
              </div>
              <div className="space-y-2">
                {mockBlindspotUpdate.groups[key].map((s) => <StudentChip key={s.id} s={s} />)}
                {mockBlindspotUpdate.groups[key].length === 0 && (
                  <div className="text-xs text-slate-400">nobody yet</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="pair:assigned (teacher:pairUp result)">
        <ul className="space-y-2">
          {mockTeacherPairUpAck.pairs.map((p) => (
            <li key={p.pairId} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="font-medium text-rose-700">{p.explainer.name}</span> (explains, was confident+wrong) &rarr;{' '}
              <span className="font-medium text-emerald-700">{p.listener.name}</span> (listens, was confident+right)
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          e.g. what {mockPairAssignedExplainer.partner.name} vs {mockPairAssignedListener.partner.name} each see on their own screen.
        </p>
      </Card>

      <Card title="calibration:card">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[mockCalibrationCardOverconfident, mockCalibrationCardWellCalibrated].map((c) => (
            <div key={c.studentId} className="rounded-xl border border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-800">{c.studentId}</div>
              <div className="text-sm text-slate-600">
                accuracy {c.accuracy}% · felt {c.avgConfidence}% ·{' '}
                <span className={c.calibration === 'overconfident' ? 'text-rose-600' : 'text-emerald-600'}>
                  {c.calibration}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
