import assert from 'node:assert/strict';
import test from 'node:test';
import { loadDeck } from './deckService.ts';
import { createSession } from './sessionService.ts';
import {
  launchQuestion,
  recordAnswer,
  computeBlindspotUpdate,
} from './questionService.ts';

test('keeps the rubric private and sends the scored explanation to the teacher', async () => {
  const deck = await loadDeck('demo');
  const session = createSession('Rubric test');

  const publicQuestion = launchQuestion(session, {
    question: deck.questions[0],
  });

  assert.equal('correctOptionId' in publicQuestion, false);
  assert.equal('rubric' in publicQuestion, false);

  recordAnswer(session, { id: 'student-1' }, {
    questionId: publicQuestion.questionId,
    optionId: 'air',
    confidence: 'certain',
    explanation: 'Most mass comes from soil, but carbon dioxide is important.',
  });

  const update = computeBlindspotUpdate(session);
  const student = update.groups.mastered[0];

  assert.equal(student.correct, true);
  assert.equal(
    student.explanation,
    'Most mass comes from soil, but carbon dioxide is important.',
  );
  assert.equal(student.explanationScore?.score, 33);
  assert.deepEqual(
    student.explanationScore?.matchedMisconceptions,
    ['Mass comes from soil'],
  );
});

test('still accepts an answer without an explanation', async () => {
  const deck = await loadDeck('demo');
  const session = createSession('Optional explanation test');
  launchQuestion(session, { question: deck.questions[0] });

  recordAnswer(session, { id: 'student-2' }, {
    questionId: 'tree-dry-mass',
    optionId: 'soil',
    confidence: 'guess',
  });

  const student = computeBlindspotUpdate(session).groups.aware[0];
  assert.equal(student.explanationScore, undefined);
});