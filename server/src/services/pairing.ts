import type { Pair, QuadrantStudent } from '../../../shared/types.ts';

// Pair each confident-wrong student with a confident-right student.
// Prefer an explainer who has not been paired yet. If there are more
// listeners than explainers, reuse explainers as evenly as possible.
export function pairUp(
  blindspot: QuadrantStudent[],
  mastered: QuadrantStudent[],
): Pair[] {
  const pairs: Pair[] = [];
  const timesUsed = new Map<string, number>();

  for (const listener of blindspot) {
    const candidates = mastered.filter(
      (student) => student.id !== listener.id,
    );

    if (candidates.length === 0) {
      continue;
    }

    let explainer = candidates[0];

    for (const candidate of candidates) {
      if (
        (timesUsed.get(candidate.id) ?? 0) <
        (timesUsed.get(explainer.id) ?? 0)
      ) {
        explainer = candidate;
      }
    }

    timesUsed.set(
      explainer.id,
      (timesUsed.get(explainer.id) ?? 0) + 1,
    );

    pairs.push({
      pairId: `pair-${explainer.id}-${listener.id}`,
      explainer: { id: explainer.id, name: explainer.name },
      listener: { id: listener.id, name: listener.name },
    });
  }

  return pairs;
}