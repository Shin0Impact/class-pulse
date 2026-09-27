import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchSession } from '../../api/http.ts';
import Button from '../../components/ui/Button.tsx';
import type { FormEvent } from 'react';

export const savedKey = (code: string) => `classpulse:${code}`;

export default function Join() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('code') ?? '');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await fetchSession(code.trim());
      // Play does the actual join (and rejoins after wifi drops); it just needs the name.
      try { sessionStorage.setItem(savedKey(code.trim()), JSON.stringify({ name: name.trim() })); } catch { /* storage blocked */ }
      navigate(`/play/${code.trim()}`, { state: { name: name.trim() } });
    } catch {
      setError('Class not found. Check the code on the board.');
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link to="/" className="mb-4 text-sm text-slate-500 hover:underline">← Back</Link>
      <h1 className="text-3xl font-bold">Join your class</h1>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Class code</span>
          <input className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center font-mono text-3xl tracking-widest"
                 inputMode="numeric" maxLength={4} placeholder="0000" value={code}
                 onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">Your name</span>
          <input dir="auto" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg" maxLength={24}
                 value={name} onChange={(e) => setName(e.target.value)} required autoComplete="given-name" />
        </label>
        {error && <p className="rounded-lg bg-rose-50 p-3 text-rose-800" role="alert">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy || code.length !== 4 || !name.trim()}>{busy ? 'Joining…' : 'Join'}</Button>
      </form>
    </main>
  );
}
