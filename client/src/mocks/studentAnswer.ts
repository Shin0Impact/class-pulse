// Mock for EVENTS.STUDENT_ANSWER -- a student submitting an option choice + confidence.
import type { Confidence } from '@shared/types.ts';

export const mockStudentAnswerRequest: { questionId: string; optionId: string; confidence: Confidence } = {
  questionId: 'plant-mass-1',
  optionId: 'soil', // the classic "mass comes from soil" misconception
  confidence: 'certain',
};

export const mockStudentAnswerAck = { ok: true };
