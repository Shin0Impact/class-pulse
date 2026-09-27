// A dev-only index of scaffolding/demo pages -- not part of the real app flow.
// Add a { to, title, blurb } entry here for every new demo the team builds; nothing else to wire up.
import { Link } from 'react-router-dom';

const DEMOS = [
  {
    to: '/demo/blindspot',
    title: 'Blindspot mock data',
    blurb: 'The 2x2 quadrant, pairing and calibration payloads from client/src/mocks, rendered so you can see the shape before the real UI exists.',
  },
];

export default function DemoIndex() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Demos</h1>
      <p className="mt-2 text-slate-600">
        Scaffolding pages for the team to preview data/UI shapes before the real screens are wired up.
        None of these talk to the server.
      </p>

      <div className="mt-6 space-y-3">
        {DEMOS.map((d) => (
          <Link
            key={d.to}
            to={d.to}
            className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <div className="text-lg font-semibold text-slate-900">{d.title}</div>
            <div className="mt-1 text-sm text-slate-500">{d.blurb}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
