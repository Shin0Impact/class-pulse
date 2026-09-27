import assert from 'node:assert/strict';
import test from 'node:test';
import { computeQuadrants, quadrantFor } from './quadrant.ts';
import type { Answer } from '../../../shared/types.ts';

test('sorts answers into the four quadrants', () => {
  assert.equal(quadrantFor(true, 'certain'), 'mastered');
  assert.equal(quadrantFor(true, 'fairly-sure'), 'mastered');
  assert.equal(quadrantFor(true, 'guess'), 'fragile');
  assert.equal(quadrantFor(false, 'certain'), 'blindspot');
  assert.equal(quadrantFor(false, 'fairly-sure'), 'blindspot');
  assert.equal(quadrantFor(false, 'guess'), 'aware');
});

test('counts groups and finds the most common confident wrong answer', () => {
  const answers: Answer[] = [
    { studentId: 's1', questionId: 'q1', optionId: 'air', confidence: 'certain' },
    { studentId: 's2', questionId: 'q1', optionId: 'air', confidence: 'certain' },
    { studentId: 's3', questionId: 'q1', optionId: 'air', confidence: 'fairly-sure' },
    { studentId: 's4', questionId: 'q1', optionId: 'air', confidence: 'certain' },
    { studentId: 's5', questionId: 'q1', optionId: 'air', confidence: 'guess' },
    { studentId: 's6', questionId: 'q1', optionId: 'air', confidence: 'guess' },
    { studentId: 's7', questionId: 'q1', optionId: 'soil', confidence: 'certain' },
    { studentId: 's8', questionId: 'q1', optionId: 'soil', confidence: 'certain' },
    { studentId: 's9', questionId: 'q1', optionId: 'water', confidence: 'fairly-sure' },
    { studentId: 's10', questionId: 'q1', optionId: 'water', confidence: 'guess' },
  ];

  const result = computeQuadrants(
    'q1',
    answers,
    'air',
    new Map([['s7', 'Rami']]),
  );

  assert.deepEqual(result.counts, {
    mastered: 4,
    fragile: 2,
    blindspot: 3,
    aware: 1,
  });
  assert.equal(result.illusionGap, 10); // 70% confident minus 60% correct
  assert.equal(result.headline, '2 students confidently chose "soil"');
  assert.equal(result.groups.blindspot[0].name, 'Rami');
});

test('returns no gap or blindspot when nobody answered', () => {
  const result = computeQuadrants('q1', [], 'air', new Map());

  assert.deepEqual(result.counts, {
    mastered: 0,
    fragile: 0,
    blindspot: 0,
    aware: 0,
  });
  assert.equal(result.illusionGap, null);
  assert.equal(result.headline, 'No blindspots yet');
});