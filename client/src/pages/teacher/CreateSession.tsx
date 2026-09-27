import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EVENTS } from '@shared/events.ts';
import { emitAck } from '../../socket/socket.ts';
import Button from '../../components/ui/Button.tsx';
import type { FormEvent } from 'react';

export default function CreateSession() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function start(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { code } = await emitAck<{ code: string }>(EVENTS.TEACHER_CREATE, { title });
      navigate(`/teacher/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link to="/" className="text-sm text-slate-500 hover:underline">← Back</Link>
      <h1 className="mt-2 text-3xl font-bold">Start a class</h1>
      <p className="mt-1 text-slate-600">You get a code for students to join. Then teach as usual.</p>

      <form onSubmit={start} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Class name (optional)</span>
          <input dir="auto" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg" maxLength={60}
                 placeholder="e.g. Math, period 3" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        {error && <p className="rounded-lg bg-rose-50 p-3 text-rose-800" role="alert">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Starting…' : 'Start class'}</Button>
      </form>
    </main>
  );
}
