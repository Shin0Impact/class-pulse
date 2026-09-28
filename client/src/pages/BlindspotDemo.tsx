// Demo page for the Blindspot mock data. It does not connect to the server yet.
import Card from '../components/ui/Card.tsx';
import QuadrantChart from '../components/QuadrantChart.tsx';
import {
  mockQuestionStarted,
  mockBlindspotUpdate,
  mockTeacherPairUpAck,
  mockPairAssignedExplainer,
  mockPairAssignedListener,
  mockCalibrationCardOverconfident,
  mockCalibrationCardWellCalibrated,
} from '../mocks/index.ts';

export default function BlindspotDemo() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-900">
        Blindspot — mock data demo
      </h1>
      <p className="text-sm text-slate-500">
        This page displays sample data from <code>client/src/mocks</code>.
      </p>

      <Card title="The launched question">
        <p className="mb-3 font-medium">{mockQuestionStarted.prompt}</p>
        <ul className="flex flex-wrap gap-2">
          {mockQuestionStarted.options.map((option) => (
            <li
              key={option.id}
              className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
            >
              {option.text}
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title="Quadrant chart"
        right={
          <span className="text-sm font-medium text-rose-600">
            {mockBlindspotUpdate.headline}
          </span>
        }
      >
        <p className="mb-4 text-sm text-slate-500">
          Illusion gap: {mockBlindspotUpdate.illusionGap ?? '—'}
        </p>
        <QuadrantChart update={mockBlindspotUpdate} />
      </Card>

      <Card title="pair:assigned (teacher:pairUp result)">
        <ul className="space-y-2">
          {mockTeacherPairUpAck.pairs.map((pair) => (
            <li
              key={pair.pairId}
              className="rounded-lg bg-slate-50 px-3 py-2 text-sm"
            >
              <span className="font-medium text-rose-700">
                {pair.explainer.name}
              </span>{' '}
              (explains, was confident and wrong) &rarr;{' '}
              <span className="font-medium text-emerald-700">
                {pair.listener.name}
              </span>{' '}
              (listens, was confident and right)
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Example: what {mockPairAssignedExplainer.partner.name} and{' '}
          {mockPairAssignedListener.partner.name} see on their screens.
        </p>
      </Card>

      <Card title="calibration:card">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            mockCalibrationCardOverconfident,
            mockCalibrationCardWellCalibrated,
          ].map((card) => (
            <div
              key={card.studentId}
              className="rounded-xl border border-slate-200 p-3"
            >
              <div className="text-sm font-semibold text-slate-800">
                {card.studentId}
              </div>
              <div className="text-sm text-slate-600">
                accuracy {card.accuracy}% · felt {card.avgConfidence}% ·{' '}
                <span
                  className={
                    card.calibration === 'overconfident'
                      ? 'text-rose-600'
                      : 'text-emerald-600'
                  }
                >
                  {card.calibration}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}