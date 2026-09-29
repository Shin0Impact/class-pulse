import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, joinStudent } from './sessionService.ts';
import {
  launchQuestion,
  recordAnswer,
  computeBlindspotUpdate,
  pairStudents,
  closeQuestion,
  recheckQuestion,
  calibrationCardsForCurrentRound,
} from './questionService.ts';

function classWith(names: string[]) {
  const session = createSession('Test');
  const students = names.map((name, i) => joinStudent(session, { name, socketId: `s${i}` }));
  return { session, students };
}

test('an open question takes written answers and shows them to the teacher instead of a quadrant', () => {
  const { session, students } = classWith(['Amal', 'Bilal']);
  const pub = launchQuestion(session, { question: { id: 'o1', kind: 'open', prompt: 'Why do leaves need light?', correctOptionId: 'ignored', options: 'ignored' } });
  assert.equal(pub.kind, 'open');
  assert.deepEqual(pub.options, []);

  recordAnswer(session, students[0], { questionId: 'o1', text: '  to make food ', confidence: 'certain' });
  assert.throws(() => recordAnswer(session, students[1], { questionId: 'o1', text: '   ', confidence: 'guess' }), /Write your answer/);

  const update = computeBlindspotUpdate(session);
  assert.equal(update.kind, 'open');
  assert.equal(update.responses, 1);
  assert.deepEqual(update.openAnswers?.map((a) => [a.name, a.text]), [['Amal', 'to make food']]);
  assert.throws(() => pairStudents(session), /multiple-choice/);
  assert.throws(() => recheckQuestion(session), /multiple-choice/);
});

test('open answers never count toward calibration', () => {
  const { session, students } = classWith(['Amal']);
  launchQuestion(session, { question: { id: 'o1', kind: 'open', prompt: 'Explain.' } });
  recordAnswer(session, students[0], { questionId: 'o1', text: 'because', confidence: 'certain' });
  launchQuestion(session, { question: { id: 'm1', prompt: '2+2?', correctOptionId: 'a', options: [{ id: 'a', text: '4' }, { id: 'b', text: '5' }] } });
  recordAnswer(session, students[0], { questionId: 'm1', optionId: 'a', confidence: 'certain' });
  const [card] = calibrationCardsForCurrentRound(session);
  assert.equal(card.accuracy, 100); // only the multiple-choice answer
});

test('close stops answers; a re-check re-opens a multiple-choice question', () => {
  const { session, students } = classWith(['Amal']);
  launchQuestion(session, { question: { id: 'm1', prompt: '2+2?', correctOptionId: 'a', options: [{ id: 'a', text: '4' }, { id: 'b', text: '5' }] } });
  closeQuestion(session);
  assert.equal(computeBlindspotUpdate(session).closed, true);
  assert.throws(() => recordAnswer(session, students[0], { questionId: 'm1', optionId: 'a', confidence: 'certain' }), /closed/);
  recheckQuestion(session);
  recordAnswer(session, students[0], { questionId: 'm1', optionId: 'a', confidence: 'certain' });
  assert.equal(computeBlindspotUpdate(session).responses, 1);
});
