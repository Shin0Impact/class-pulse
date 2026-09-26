import { useEffect, useRef } from 'react';
import { socket } from './socket.js';

// useSocketEvents({ [EVENTS.PULSE_UPDATE]: (data) => ..., ... })
// Subscribes on mount, unsubscribes on unmount. Handlers always see the latest state (no stale closures).
export function useSocketEvents(handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const subs = Object.keys(ref.current).map((event) => {
      const fn = (...args) => ref.current[event]?.(...args);
      socket.on(event, fn);
      return [event, fn];
    });
    return () => subs.forEach(([event, fn]) => socket.off(event, fn));
  }, []);
}
