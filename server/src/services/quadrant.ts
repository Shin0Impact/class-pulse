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

// Sort each answer by correctness and confidence.
export function quadrantFor(correct: boolean, confidence: Confidence): Quadrant {
  const confident =
    confidence === CONFIDENCE.CERTAIN ||
    confidence === CONFIDENCE.FAIRLY_SURE;

  if (correct) {
    return confident ? QUADRANTS.MASTERED : QUADRANTS.FRAGILE;
  }

  return confident ? QUADRANTS.BLINDSPOT : QUADRANTS.AWARE;
}

// namesById maps each student ID to the name shown to the teacher.
export function computeQuadrants(
  questionId: string,
  answers: Answer[],
  correctOptionId: string,
  namesById: Map<string, string>,
): BlindspotUpdate {
  const groups: QuadrantGroups = {
    mastered: [],
    fragile: [],
    blindspot: [],
    aware: [],
  };

  for (const answer of answers) {
    const correct = answer.optionId === correctOptionId;
    const quadrant = quadrantFor(correct, answer.confidence);

    const student: QuadrantStudent = {
      id: answer.studentId,
      name: namesById.get(answer.studentId) ?? 'Student',
      optionId: answer.optionId,
      confidence: answer.confidence,
      correct,
    };

    groups[quadrant].push(student);
  }

  const counts: QuadrantCounts = {
    mastered: groups.mastered.length,
    fragile: groups.fragile.length,
    blindspot: groups.blindspot.length,
    aware: groups.aware.length,
  };

  const total = answers.length;
  const confidentCount = counts.mastered + counts.blindspot;
  const correctCount = counts.mastered + counts.fragile;

  // Percentage points: felt confident minus actually correct.
  // With no answers, there is no meaningful percentage yet.
  const illusionGap: number | null =
    total === 0
      ? null
      : Math.round(
          (confidentCount / total - correctCount / total) * 100,
        );

  // Count wrong options chosen by confident students.
  const wrongBeliefCounts = new Map<string, number>();

  for (const student of groups.blindspot) {
    wrongBeliefCounts.set(
      student.optionId,
      (wrongBeliefCounts.get(student.optionId) ?? 0) + 1,
    );
  }

  let commonWrongOptionId: string | null = null;
  let commonWrongCount = 0;

  for (const [optionId, count] of wrongBeliefCounts) {
    if (count > commonWrongCount) {
      commonWrongOptionId = optionId;
      commonWrongCount = count;
    }
  }

  const headline =
    commonWrongOptionId === null
      ? 'No blindspots yet'
      : `${commonWrongCount} student${commonWrongCount === 1 ? '' : 's'} confidently chose "${commonWrongOptionId}"`;

  return {
    questionId,
    groups,
    counts,
    illusionGap,
    headline,
  };
}