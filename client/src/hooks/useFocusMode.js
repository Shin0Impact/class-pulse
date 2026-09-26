import { useEffect } from 'react';
import { EVENTS } from '@shared/events.js';
import { socket } from '../socket/socket.js';

// Focus mode (student side): report when the student leaves the page (switches tab or app).
// It only REPORTS to the teacher. It never blocks the student.
export function useFocusMode(active) {
  useEffect(() => {
    if (!active) return undefined;
    let last = 0;
    const report = () => {
      const now = Date.now();
      if (now - last < 800) return; // blur and visibilitychange often fire together
      last = now;
      socket.emit(EVENTS.STUDENT_FOCUS_EVENT, { type: 'left' });
    };
    const onHidden = () => document.hidden && report();
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('blur', report);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('blur', report);
    };
  }, [active]);
}
