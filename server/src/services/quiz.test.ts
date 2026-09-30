import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, joinStudent } from './sessionService.ts';
import { startQuiz, closeQuiz, answerQuiz, submitQuiz, quizForStudent, quizResults } from './quizService.ts';
import { toQuiz, splitCounts, checkQuizInput } from '../ai/quizGen.ts';

const mcq = (prompt: string, correct = 'b') => ({
  kind: 'mcq',
  prompt,
  options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }],
  correctOptionId: correct,
});
const open = { kind: 'open', prompt: 'Explain it', modelAnswer: 'because' };

function setup() {
  const session = createSession('Test');
  const [amal, bilal] = ['Amal', 'Bilal'].map((name, i) => joinStudent(session, { name, socketId: `s${i}` }));
  const quiz = startQuiz(session, { title: ' Unit 1 ', questions: [mcq('Q1'), open, mcq('Q3', 'a')] });
  return { session, amal, bilal, quiz };
}

test('students get the questions without the answer key', () => {
  const { session, amal } = setup();
  const view = quizForStudent(session, amal)!;
  assert.equal(view.title, 'Unit 1');
  assert.equal(view.questions.length, 3);
  assert.equal(JSON.stringify(view).includes('correctOptionId'), false);
  assert.equal(JSON.stringify(view).includes('because'), false);
  assert.equal(view.review, null);
});

test('answers are saved, can change, and lock on submit with a review', () => {
  const { session, amal, quiz } = setup();
  answerQuiz(session, amal, { quizId: quiz.id, questionId: 'q1', optionId: 'a' });
  answerQuiz(session, amal, { quizId: quiz.id, questionId: 'q1', optionId: 'b' });
  answerQuiz(session, amal, { quizId: quiz.id, questionId: 'q2', text: '  my answer ' });
  assert.throws(() => answerQuiz(session, amal, { quizId: quiz.id, questionId: 'q1', optionId: 'zzz' }), /Pick one/);
  assert.throws(() => answerQuiz(session, amal, { quizId: 'old', questionId: 'q1', optionId: 'a' }), /no longer running/);

  const done = submitQuiz(session, amal, { quizId: quiz.id });
  assert.equal(done.submitted, true);
  assert.deepEqual(done.review?.map((r) => r.correct), [true, null, false]);
  assert.equal(done.review?.[2].correctOptionId, 'a');
  assert.throws(() => answerQuiz(session, amal, { quizId: quiz.id, questionId: 'q3', optionId: 'a' }), /already submitted/);
});

test('the teacher sees per-option counts, open answers and per-student progress', () => {
  const { session, amal, bilal, quiz } = setup();
  answerQuiz(session, amal, { quizId: quiz.id, questionId: 'q1', optionId: 'b' });
  answerQuiz(session, bilal, { quizId: quiz.id, questionId: 'q1', optionId: 'c' });
  answerQuiz(session, bilal, { quizId: quiz.id, questionId: 'q2', text: 'idk' });
  submitQuiz(session, bilal, { quizId: quiz.id });
  const r = quizResults(session)!;
  assert.equal(r.mcqTotal, 2);
  assert.deepEqual(r.questions[0].options.map((o) => o.count), [0, 1, 1]);
  assert.equal(r.questions[0].correct, 1);
  assert.deepEqual(r.questions[1].texts.map((t) => [t.name, t.text]), [['Bilal', 'idk']]);
  const row = Object.fromEntries(r.students.map((s) => [s.name, s]));
  assert.equal(row.Amal.answered, 1);
  assert.equal(row.Amal.correct, 1);
  assert.equal(row.Amal.submitted, false);
  assert.equal(row.Bilal.submitted, true);
});

test('after the teacher closes it, answers stop but a student can still submit for the review', () => {
  const { session, amal, bilal, quiz } = setup();
  answerQuiz(session, amal, { quizId: quiz.id, questionId: 'q1', optionId: 'b' });
  closeQuiz(session);
  assert.throws(() => answerQuiz(session, amal, { quizId: quiz.id, questionId: 'q3', optionId: 'a' }), /ended/);
  assert.equal(submitQuiz(session, amal, { quizId: quiz.id }).review?.[0].correct, true);
  assert.equal(quizForStudent(session, bilal), null); // never started it
  assert.throws(() => submitQuiz(session, bilal, { quizId: quiz.id }), /ended/);
});

test('bad quizzes are rejected', () => {
  const session = createSession('T');
  assert.throws(() => startQuiz(session, { questions: [] }), /at least 1/);
  assert.throws(() => startQuiz(session, { questions: [{ kind: 'mcq', prompt: 'x', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctOptionId: 'z' }] }), /correct answer/);
  assert.throws(() => startQuiz(session, { questions: [{ kind: 'mcq', prompt: '', options: [] }] }), /needs text/);
});

test('mixed quizzes split half and half, with the extra one multiple choice', () => {
  assert.deepEqual(splitCounts('mixed', 5), { mcq: 3, open: 2 });
  assert.deepEqual(splitCounts('open', 4), { mcq: 0, open: 4 });
});

test('a generated quiz drops bad questions and never exceeds the asked mix', () => {
  const input = checkQuizInput({ type: 'mixed', count: 4, pageText: 'text', language: 'en' });
  const good = (t: string) => ({ type: 'mcq', prompt: t, options: [{ text: 'right', correct: true }, { text: 'w1', correct: false }, { text: 'w2', correct: false }] });
  const raw = {
    title: 'Unit',
    questions: [good('one'), { type: 'mcq', prompt: 'broken', options: [] }, good('two'), good('extra mcq'), { type: 'open', prompt: 'why?', modelAnswer: 'because' }, { type: 'open', prompt: 'how?', modelAnswer: 'so' }],
  };
  const quiz = toQuiz(raw, input);
  assert.deepEqual(quiz.questions.map((q) => q.kind), ['mcq', 'mcq', 'open', 'open']);
  assert.throws(() => toQuiz({ questions: [good('only one')] }, input), /usable/);
  assert.throws(() => checkQuizInput({ type: 'mcq', count: 0, pageText: 'x' }), /between 1 and/);
  assert.throws(() => checkQuizInput({ type: 'mcq', count: 3, pageText: '  ' }), /no text/);
});
