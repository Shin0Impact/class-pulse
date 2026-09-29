// Mock for EVENTS.TEACHER_LAUNCH_QUESTION -- what the teacher sends the server, and what students
// receive right after (QUESTION_STARTED). Uses the same shape as a deck question (deckService.ts).
import type { PublicQuestion } from '@shared/types.ts';

export const mockTeacherLaunchQuestionRequest = {
  question: {
    id: 'plant-mass-1',
    topic: 'Photosynthesis',
    prompt: "Where does most of a growing tree's mass come from?",
    correctOptionId: 'air',
    options: [
      { id: 'air', text: 'Carbon dioxide from the air' },
      { id: 'soil', text: 'Soil' },
      { id: 'water', text: 'Water alone' },
    ],
  },
};

// What each student's client receives once the question is live -- no correctOptionId or
// misconception fields, so the answer is never leaked to the browser.
export const mockQuestionStarted: PublicQuestion = {
  questionId: 'plant-mass-1',
  kind: 'mcq',
  topic: 'Photosynthesis',
  prompt: "Where does most of a growing tree's mass come from?",
  options: [
    { id: 'air', text: 'Carbon dioxide from the air' },
    { id: 'soil', text: 'Soil' },
    { id: 'water', text: 'Water alone' },
  ],
};
