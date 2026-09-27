// Mock for EVENTS.TEACHER_RECHECK -- re-opens the same question so students can answer again
// after pairing/discussion. Broadcast to students reuses QUESTION_STARTED's shape, isRecheck: true.
import type { PublicQuestion } from '@shared/types.ts';

export const mockTeacherRecheckRequest = { questionId: 'plant-mass-1' };

export const mockQuestionRecheckStarted: PublicQuestion = {
  questionId: 'plant-mass-1',
  topic: 'Photosynthesis',
  prompt: "Where does most of a growing tree's mass come from?",
  options: [
    { id: 'air', text: 'Carbon dioxide from the air' },
    { id: 'soil', text: 'Soil' },
    { id: 'water', text: 'Water alone' },
  ],
  isRecheck: true,
};
