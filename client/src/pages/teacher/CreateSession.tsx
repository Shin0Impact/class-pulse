import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EVENTS } from '@shared/events.ts';
import { emitAck } from '../../socket/socket.ts';
import Button from '../../components/ui/Button.tsx';
import { usePreferences } from '../../context/PreferencesContext.tsx';
import type { FormEvent } from 'react';
import './CreateSession.css';

export default function CreateSession() {
  const navigate = useNavigate();
  const { t } = usePreferences();
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
    <main className="teacher-create">
      <section className="teacher-create__shell" aria-labelledby="create-title">
        <Link to="/" className="teacher-create__back">{t('back')}</Link>
        <p className="teacher-create__eyebrow">CLASS PULSE · LIVE LEARNING</p>
        <h1 id="create-title">{t('startClass')}</h1>
        <p className="teacher-create__lead">{t('startDesc')}</p>
        <form onSubmit={start}>
          <label>
            <span>{t('className')}</span>
            <input dir="auto" maxLength={60} placeholder={t('classPlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          {error && <p className="teacher-create__error" role="alert">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? t('starting') : t('startClass')}</Button>
          <aside className="teacher-create__meta" aria-label="Class Pulse benefits">
            <span>● Real-time understanding</span><span>● No student signup</span><span>● Actionable gaps</span>
          </aside>
        </form>
      </section>
    </main>
  );
}
