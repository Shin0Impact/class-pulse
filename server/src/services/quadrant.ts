import { CONFIDENCE, QUADRANTS } from '../../../shared/events.ts';
import type {
  Answer,
  BlindspotUpdate,
  Confidence,
  Quadrant,
  QuadrantCounts,
  QuadrantGroups,
  QuadrantStudent,
} from '../../../shared/types.ts';

// Pure functions: given answers to one question, sort students into the 2x2 quadrant.
// STUB for now -- always returns a shape-correct result so the server and client can be built
// against it today. Malak replaces the body of quadrantFor / computeQuadrants with the real
// correctness x confidence logic (M1) without anyone else's code changing.

export function quadrantFor(correct: boolean, confidence: Confidence): Quadrant {
  const confident = confidence === CONFIDENCE.CERTAIN || confidence === CONFIDENCE.FAIRLY_SURE;
  if (correct) return confident ? QUADRANTS.MASTERED : QUADRANTS.FRAGILE;
  return confident ? QUADRANTS.BLINDSPOT : QUADRANTS.AWARE;
}

// namesById: studentId -> display name, so quadrant rows can show a name without a second lookup.
export function computeQuadrants(
  questionId: string,
  answers: Answer[],
  correctOptionId: string,
  namesById: Map<string, string>,
): BlindspotUpdate {
  const groups: QuadrantGroups = { mastered: [], fragile: [], blindspot: [], aware: [] };

  for (const a of answers) {
    const correct = a.optionId === correctOptionId;
    const q = quadrantFor(correct, a.confidence);
    const student: QuadrantStudent = {
      id: a.studentId,
      name: namesById.get(a.studentId) ?? 'Student',
      optionId: a.optionId,
      confidence: a.confidence,
      correct,
    };
    groups[q].push(student);
  }

  const counts: QuadrantCounts = {
    mastered: groups.mastered.length,
    fragile: groups.fragile.length,
    blindspot: groups.blindspot.length,
    aware: groups.aware.length,
  };

  // TODO (M1): real illusion-gap math -- (felt-confident %) - (actually-correct %). Stub returns
  // null until there is real data, so the UI can show "no data yet" instead of a fake number.
  const illusionGap: number | null = null;
  const headline = counts.blindspot > 0
    ? `${counts.blindspot} student${counts.blindspot === 1 ? '' : 's'} confidently got it wrong`
    : 'No blindspots yet';

  return { questionId, groups, counts, illusionGap, headline };
}
