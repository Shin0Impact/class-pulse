import type { Pair, QuadrantStudent } from '../../../shared/types.ts';

// Pure functions: turn a quadrant breakdown into explainer/listener pairs.
// STUB for now -- pairs students in whatever order they arrive so the server/client can wire up
// teacher:pairUp -> pair:assigned today. Malak replaces the matching logic (M2): the real version
// should prefer pairing each "blindspot" student with a "mastered" student who chose the SAME
// wrong option (so the explanation is relevant), falling back to any "mastered" student if none match.

export function pairUp(blindspot: QuadrantStudent[], mastered: QuadrantStudent[]): Pair[] {
  const pairs: Pair[] = [];
  const pool = [...mastered];

  for (const explainer of blindspot) {
    if (pool.length === 0) break; // more blindspots than mastered students: leave the rest unpaired for now
    const listener = pool.shift();
    if (!listener) break;
    pairs.push({
      pairId: `pair-${explainer.id}-${listener.id}`,
      explainer: { id: explainer.id, name: explainer.name },
      listener: { id: listener.id, name: listener.name },
    });
  }

  return pairs;
}
