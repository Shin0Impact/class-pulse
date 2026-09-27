import assert from 'node:assert/strict';
import test from 'node:test';
import { pairUp } from './pairing.ts';
import type { QuadrantStudent } from '../../../shared/types.ts';

function student(
  id: string,
  correct: boolean,
): QuadrantStudent {
  return {
    id,
    name: `Student ${id}`,
    optionId: correct ? 'air' : 'soil',
    confidence: 'certain',
    correct,
  };
}

test('pairs a mastered explainer with a blindspot listener', () => {
  const pairs = pairUp(
    [student('wrong-1', false)],
    [student('right-1', true)],
  );

  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].explainer.id, 'right-1');
  assert.equal(pairs[0].listener.id, 'wrong-1');
});

test('uses every explainer before reusing one', () => {
  const pairs = pairUp(
    [
      student('wrong-1', false),
      student('wrong-2', false),
      student('wrong-3', false),
    ],
    [student('right-1', true), student('right-2', true)],
  );

  assert.deepEqual(
    pairs.map((pair) => pair.explainer.id),
    ['right-1', 'right-2', 'right-1'],
  );
  assert.equal(new Set(pairs.map((pair) => pair.listener.id)).size, 3);
});

test('returns no pairs when there are no mastered students', () => {
  assert.deepEqual(pairUp([student('wrong-1', false)], []), []);
});

test('never pairs a student with themselves', () => {
  const pairs = pairUp(
    [student('same-id', false)],
    [student('same-id', true), student('right-2', true)],
  );

  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].explainer.id, 'right-2');
  assert.notEqual(pairs[0].explainer.id, pairs[0].listener.id);
});