// Mock for EVENTS.TEACHER_PAIR_UP -- the teacher's request to compute and hand out pairs.
import type { Pair } from '@shared/types.ts';

export const mockTeacherPairUpRequest = { questionId: 'plant-mass-1' };

export const mockTeacherPairUpAck: { ok: true; pairs: Pair[] } = {
  ok: true,
  pairs: [
    { pairId: 'pair-s7-s1', explainer: { id: 's7', name: 'Rami' }, listener: { id: 's1', name: 'Amir' } },
    { pairId: 'pair-s8-s2', explainer: { id: 's8', name: 'Salam' }, listener: { id: 's2', name: 'Dana' } },
    { pairId: 'pair-s9-s3', explainer: { id: 's9', name: 'Hadi' }, listener: { id: 's3', name: 'Yousef' } },
  ],
};
