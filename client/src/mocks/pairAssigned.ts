// Mock for EVENTS.PAIR_ASSIGNED -- what each of the two paired students receives.
import type { PairAssigned } from '@shared/types.ts';

export const mockPairAssignedExplainer: PairAssigned = {
  pairId: 'pair-s7-s1',
  partner: { id: 's1', name: 'Amir' },
  role: 'explainer', // was confident and wrong: explain your reasoning to your partner
  questionId: 'plant-mass-1',
};

export const mockPairAssignedListener: PairAssigned = {
  pairId: 'pair-s7-s1',
  partner: { id: 's7', name: 'Rami' },
  role: 'listener', // was confident and right: listen, then rate how clearly they explained it
  questionId: 'plant-mass-1',
};
