// Mock for EVENTS.BLINDSPOT_UPDATE -- the live quadrant breakdown the teacher's dashboard renders.
// 10 students spread across all 4 groups so Ramez can build QuadrantChart/BlindspotHeadline against
// real-looking data before quadrant.ts does the real math.
import type { BlindspotUpdate } from '@shared/types.ts';

export const mockBlindspotUpdate: BlindspotUpdate = {
  questionId: 'plant-mass-1',
  groups: {
    mastered: [
      { id: 's1', name: 'Amir', optionId: 'air', confidence: 'certain', correct: true },
      { id: 's2', name: 'Dana', optionId: 'air', confidence: 'certain', correct: true },
      { id: 's3', name: 'Yousef', optionId: 'air', confidence: 'fairly-sure', correct: true },
      { id: 's4', name: 'Lina', optionId: 'air', confidence: 'certain', correct: true },
    ],
    fragile: [
      { id: 's5', name: 'Noor', optionId: 'air', confidence: 'guess', correct: true },
      { id: 's6', name: 'Tarek', optionId: 'air', confidence: 'guess', correct: true },
    ],
    blindspot: [
      { id: 's7', name: 'Rami', optionId: 'soil', confidence: 'certain', correct: false },
      { id: 's8', name: 'Salam', optionId: 'soil', confidence: 'certain', correct: false },
      { id: 's9', name: 'Hadi', optionId: 'water', confidence: 'fairly-sure', correct: false },
    ],
    aware: [
      { id: 's10', name: 'Maya', optionId: 'water', confidence: 'guess', correct: false },
    ],
  },
  counts: { mastered: 4, fragile: 2, blindspot: 3, aware: 1 },
  illusionGap: 18, // felt-confident % minus actually-correct %, placeholder until quadrant.ts computes it for real
  headline: '3 students confidently got it wrong',
};
