import assert from 'node:assert/strict';
import test from 'node:test';
import { calibrationCard, calibrationFor } from './calibration.ts';

test('returns no data when there are no answers', () => {
  assert.deepEqual(calibrationFor([]), {
    accuracy: null,
    avgConfidence: null,
    calibration: 'no-data',
    illusionGap: null,
    score: null,
  });
});

test('does not penalize an honest wrong guess', () => {
  const result = calibrationFor([
    { correct: false, confidence: 'guess' },
  ]);

  assert.equal(result.score, 100);
  assert.equal(result.calibration, 'well-calibrated');
});

test('penalizes a confident wrong answer', () => {
  const result = calibrationFor([
    { correct: false, confidence: 'certain' },
  ]);

  assert.equal(result.score, 0);
  assert.equal(result.calibration, 'overconfident');
});

test('calculates the score across several answers', () => {
  const result = calibrationFor([
    { correct: true, confidence: 'certain' },
    { correct: false, confidence: 'fairly-sure' },
    { correct: false, confidence: 'guess' },
    { correct: false, confidence: 'certain' },
  ]);

  assert.equal(result.accuracy, 25);
  assert.equal(result.avgConfidence, 63);
  assert.equal(result.illusionGap, 38);
  assert.equal(result.score, 63);
});

test('includes the student id in a calibration card', () => {
  const card = calibrationCard('s1', [
    { correct: true, confidence: 'certain' },
  ]);

  assert.equal(card.studentId, 's1');
  assert.equal(card.score, 100);
});