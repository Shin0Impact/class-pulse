import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreExplanation } from './explanationRubric.ts';

const rubric = {
  keyIdeas: ['carbon dioxide', 'from the air'],
  misconceptions: [
    { label: 'Mass comes from soil', phrases: ['from soil'] },
    { label: 'Mass comes from water', phrases: ['from water'] },
  ],
};

test('returns no score for an empty explanation', () => {
  assert.deepEqual(scoreExplanation('  ', rubric), {
    matchedIdeas: [],
    matchedMisconceptions: [],
    score: null,
  });
});

test('finds key ideas regardless of capitalization', () => {
  const result = scoreExplanation(
    'The tree gets CARBON DIOXIDE from the AIR.',
    rubric,
  );

  assert.equal(result.score, 100);
  assert.deepEqual(result.matchedIdeas, [
    'carbon dioxide',
    'from the air',
  ]);
  assert.deepEqual(result.matchedMisconceptions, []);
});

test('flags a misconception even when the explanation contains a key idea', () => {
  const result = scoreExplanation(
    'Carbon dioxide matters, but most mass comes from soil.',
    rubric,
  );

  assert.equal(result.score, 50);
  assert.deepEqual(result.matchedMisconceptions, [
    'Mass comes from soil',
  ]);
});

test('does not match a keyword inside a longer word', () => {
  const result = scoreExplanation('Airplane', {
    keyIdeas: ['air'],
    misconceptions: [],
  });

  assert.equal(result.score, 0);
});