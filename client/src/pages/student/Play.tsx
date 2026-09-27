import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EVENTS } from '@shared/events.ts';
import { FEATURES } from '@shared/features.ts';
import { socket, emitAck } from '../../socket/socket.ts';
import { useSocketEvents } from '../../socket/useSocketEvents.ts';
import { useFocusMode } from '../../hooks/useFocusMode.ts';
import { savedKey } from './Join.tsx';
import ColorPicker from './ColorPicker.tsx';
import Button from '../../components/ui/Button.tsx';
import type { Mark, StudentState } from '@shared/types.ts';

type Saved = { name?: string; studentId?: string };

function readSaved(code: string): Saved {
  try { return JSON.parse(sessionStorage.getItem(savedKey(code)) ?? 'null') || {}; } catch { return {}; }
}
function writeSaved(code: string, data: Saved): void {
  try { sessionStorage.setItem(savedKey(code), JSON.stringify(data)); } catch { /* storage blocked */ }
}

// phase: joining | live | ended | error
export default function Play() {
  const code = useParams().code ?? '';
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'joining' | 'live' | 'ended' | 'error'>('joining');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState<Mark | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [focusOn, setFocusOn] = useState(false);
  const [error, setError] = useState('');
  const joining = useRef(false);
  const checkInId = useRef<string | null>(null);
  // latest choice, readable inside async callbacks
  const mine = useRef<{ status: Mark | null; reason: string | null }>({ status: null, reason: null });
  mine.current = { status, reason };

  useFocusMode(FEATURES.focusMode && focusOn && phase === 'live');

  // Join on load, and AGAIN after every reconnect (phones sleep, wifi drops). Same studentId = same student.
  const join = useCallback(async () => {
    if (joining.current) return; // a join is already on its way (dev double-effect, or connect firing mid-join)
    const saved = readSaved(code);
    if (!saved.name) { navigate(`/join?code=${code}`, { replace: true }); return; }
    joining.current = true;
    try {
      const res = await emitAck<StudentState>(EVENTS.STUDENT_JOIN, { code, name: saved.name, studentId: saved.studentId });
      writeSaved(code, { name: res.name, studentId: res.studentId });
      setName(res.name);
      setTitle(res.title);
      setTopic(res.topic);
      setFocusOn(res.focusMode);
      setError('');

      const sameCheckIn = checkInId.current === res.checkInId;
      const local = mine.current;
      if (sameCheckIn && local.status && (local.status !== res.status || local.reason !== res.reason)) {
        // I tapped while offline: push my choice to the server instead of losing it
        emitAck(EVENTS.STUDENT_SET_STATUS, { status: local.status, reason: local.reason }).catch(() => {});
      } else {
        setStatus(res.status === 'waiting' ? null : res.status);
        setReason(res.reason);
      }
      checkInId.current = res.checkInId;
      setPhase('live');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    } finally {
      joining.current = false;
    }
  }, [code, navigate]);

  useEffect(() => {
    join();
    socket.on('connect', join);
    return () => { socket.off('connect', join); };
  }, [join]);

  useSocketEvents({
    // the teacher started a new check-in: everyone's color is cleared
    [EVENTS.CHECK_IN_STARTED]: (data) => {
      if (!('checkInId' in data)) return;
      checkInId.current = data.checkInId;
      setTopic(data.topic);
      setStatus(null);
      setReason(null);
    },
    [EVENTS.FOCUS_MODE]: ({ enabled }) => setFocusOn(enabled),
    [EVENTS.SESSION_ENDED]: () => setPhase('ended'),
  });

  function chooseStatus(s: Mark) {
    setStatus(s);
    setReason(null);
    setError('');
    if (navigator.vibrate) navigator.vibrate(15);
    emitAck(EVENTS.STUDENT_SET_STATUS, { status: s }).catch((e) => setError(e.message));
  }

  function chooseReason(r: string) {
    const next = reason === r ? null : r; // tap again to undo
    setReason(next);
    emitAck(EVENTS.STUDENT_SET_STATUS, { status, reason: next }).catch((e) => setError(e.message));
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <header className="mb-4 flex items-center justify-between text-sm text-slate-500">
        <span className="font-semibold text-indigo-700">Class Pulse</span>
        <span dir="auto">{name} · #{code}</span>
      </header>

      {phase === 'joining' && <p className="py-16 text-center text-slate-500">Joining…</p>}

      {phase === 'live' && (
        <>
          {title && <p className="text-sm text-slate-500" dir="auto">{title}</p>}
          <h1 className="mb-1 text-2xl font-bold leading-snug" dir="auto">
            {topic ? <>Now: {topic}</> : 'How well are you following?'}
          </h1>
          <p className="mb-5 text-slate-600">Tap any time while your teacher talks. You can change it whenever you like.</p>

          <ColorPicker status={status} reason={reason} onStatus={chooseStatus} onReason={chooseReason} />

          {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-rose-800" role="alert">{error}</p>}

          <p className="mt-6 text-center text-xs text-slate-400">
            Your teacher can see your color.
            {FEATURES.focusMode && focusOn && ' 🔒 Focus mode is on: your teacher is told if you leave this page.'}
          </p>
        </>
      )}

      {phase === 'ended' && (
        <div className="py-16 text-center">
          <h2 className="text-2xl font-bold">Class ended</h2>
          <p className="mt-2 text-slate-600">Thanks for joining!</p>
          <Button className="mt-6" onClick={() => navigate('/')}>Home</Button>
        </div>
      )}

      {phase === 'error' && (
        <div className="py-16 text-center">
          <p className="rounded-lg bg-rose-50 p-3 text-rose-800" role="alert">{error}</p>
          <Button className="mt-6" onClick={() => navigate(`/join?code=${code}`)}>Try again</Button>
        </div>
      )}
    </main>
  );
}
