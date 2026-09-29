import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeClass, summarizeClassList, summarizeProgress } from './historyService.ts';
import type { AnswerRow, QuestionRow, SessionRow, StudentRow } from './historyService.ts';

const session = (id: string, created_at: string, title = id): SessionRow => ({
  id, code: '1234', title, status: 'ended', created_at, ended_at: null,
});
const question = (id: string, session_id: string, topic: string, started_at = '2026-09-01T10:00:00Z'): QuestionRow => ({
  id, session_id, topic, prompt: `${id}?`, correct_option_id: 'a', started_at,
  options: [{ id: 'a', text: 'right' }, { id: 'b', text: 'wrong' }],
});
const answer = (question_id: string, student_id: string, correct: boolean, confidence: AnswerRow['confidence'], round = 1): AnswerRow => ({
  question_id, student_id, round, correct, confidence, option_id: correct ? 'a' : 'b',
});

test('class summary uses first attempts for accuracy and puts confidently-wrong students first', () => {
  const students: StudentRow[] = [
    { id: 'amal', session_id: 's1', name: 'Amal', user_id: 'u1' },
    { id: 'bilal', session_id: 's1', name: 'Bilal', user_id: null },
  ];
  const answers = [
    answer('q1', 'amal', true, 'certain'),
    answer('q1', 'bilal', false, 'certain'), // blindspot on the first try...
    answer('q1', 'bilal', true, 'certain', 2), // ...fixed after the re-check
  ];
  const detail = summarizeClass(session('s1', '2026-09-01T09:00:00Z'), students, [question('q1', 's1', 'Fractions')], answers, []);

  assert.equal(detail.totals.answers, 2); // the re-check doesn't count as a first attempt
  assert.equal(detail.totals.firstTryAccuracy, 50);
  assert.deepEqual(detail.students.map((s) => s.name), ['Bilal', 'Amal']);
  assert.equal(detail.students[0].blindspots, 1);
  assert.equal(detail.students[0].signedIn, false);
  assert.equal(detail.students[1].signedIn, true);

  const q = detail.questions[0];
  assert.deepEqual(q.optionCounts, { a: 1, b: 1 });
  assert.deepEqual(q.rounds.map((r) => [r.round, r.correctPct]), [[1, 50], [2, 100]]);
  assert.equal(q.rounds[0].counts.blindspot, 1);
});

test('class summary drops check-ins nobody marked', () => {
  const checkIn = (topic: string, green: number) => ({
    topic, started_at: `2026-09-01T10:0${green}:00Z`, ended_at: '2026-09-01T11:00:00Z', green, yellow: 0, red: 0, unmarked: 3, pct: green ? 100 : null,
  });
  const detail = summarizeClass(session('s1', '2026-09-01T09:00:00Z'), [], [], [], [checkIn('', 0), checkIn('Wrap-up', 2)]);
  assert.deepEqual(detail.checkIns.map((c) => c.topic), ['Wrap-up']);
});

test('class list counts students and questions per class', () => {
  const list = summarizeClassList(
    [session('s1', '2026-09-01T09:00:00Z'), session('s2', '2026-09-02T09:00:00Z')],
    [{ id: 'x', session_id: 's1', name: 'X', user_id: null }],
    [question('q1', 's1', 'T')],
    [answer('q1', 'x', false, 'fairly-sure')],
  );
  assert.equal(list[0].studentCount, 1);
  assert.equal(list[0].questionCount, 1);
  assert.equal(list[0].firstTryAccuracy, 0);
  assert.equal(list[0].blindspotCount, 1);
  assert.deepEqual([list[1].studentCount, list[1].firstTryAccuracy], [0, null]);
});

test('progress gives one calibration point per class, oldest first, and per-topic accuracy', () => {
  const sessions = [session('late', '2026-09-10T09:00:00Z'), session('early', '2026-09-01T09:00:00Z')];
  const me: StudentRow[] = [
    { id: 'me-early', session_id: 'early', name: 'Me', user_id: 'u' },
    { id: 'me-late', session_id: 'late', name: 'Me', user_id: 'u' },
  ];
  const questions = [question('q1', 'early', 'Fractions'), question('q2', 'late', 'Fractions'), question('q3', 'late', 'Probability')];
  const answers = [
    answer('q1', 'me-early', false, 'certain'),
    answer('q2', 'me-late', true, 'certain'),
    answer('q3', 'me-late', true, 'guess'),
  ];
  const progress = summarizeProgress(sessions, me, questions, answers);

  assert.deepEqual(progress.classes.map((c) => c.sessionId), ['early', 'late']);
  assert.equal(progress.classes[0].calibration, 'overconfident');
  assert.equal(progress.classes[1].accuracy, 100);
  assert.deepEqual(progress.topics.map((t) => [t.topic, t.answered, t.accuracy, t.blindspots]), [
    ['Fractions', 2, 50, 1],
    ['Probability', 1, 100, 0],
  ]);
  assert.equal(progress.overall.answered, 3);
});

test('progress with no classes is empty, not an error', () => {
  const progress = summarizeProgress([], [], [], []);
  assert.equal(progress.overall.calibration, 'no-data');
  assert.deepEqual(progress.classes, []);
});

test('open questions show their answers and summary but never count toward accuracy', () => {
  const students: StudentRow[] = [{ id: 'amal', session_id: 's1', name: 'Amal', user_id: null }];
  const open: QuestionRow = { ...question('o1', 's1', 'Plants'), kind: 'open', options: [], correct_option_id: '' };
  const answers: AnswerRow[] = [
    answer('q1', 'amal', true, 'certain'),
    { question_id: 'o1', student_id: 'amal', round: 1, option_id: '', confidence: 'certain', correct: false, answer_text: 'they eat soil' },
  ];
  const summary = { questionId: 'o1', answered: 1, headline: 'Mixed up.', confusions: [], reteach: true, suggestion: 'Redo.', provider: 'x', createdAt: 0 };
  const detail = summarizeClass(session('s1', '2026-09-01T09:00:00Z'), students, [question('q1', 's1', 'Fractions'), open], answers, [], [
    { question_id: 'o1', summary: { ...summary, headline: 'old' }, created_at: '2026-09-01T10:00:00Z' },
    { question_id: 'o1', summary, created_at: '2026-09-01T11:00:00Z' },
  ]);
  assert.equal(detail.totals.firstTryAccuracy, 100);
  assert.equal(detail.students[0].answered, 1);
  const o = detail.questions.find((q) => q.id === 'o1')!;
  assert.equal(o.kind, 'open');
  assert.deepEqual(o.openAnswers.map((a) => a.text), ['they eat soil']);
  assert.equal(o.summary?.headline, 'Mixed up.');

  const progress = summarizeProgress([session('s1', '2026-09-01T09:00:00Z')], students, [question('q1', 's1', 'Fractions'), open], answers);
  assert.deepEqual(progress.topics.map((t) => t.topic), ['Fractions']);
});
