import type {
  Calibration,
  CalibrationCard,
  Confidence,
} from '../../../shared/types.ts';

type AnswerResult = {
  correct: boolean;
  confidence: Confidence;
};

const CONFIDENCE_SCORE: Record<Confidence, number> = {
  guess: 0,
  'fairly-sure': 50,
  certain: 100,
};

export function calibrationFor(
  history: AnswerResult[],
): Omit<CalibrationCard, 'studentId'> {
  if (history.length === 0) {
    return {
      accuracy: null,
      avgConfidence: null,
      calibration: 'no-data',
      illusionGap: null,
      score: null,
    };
  }

  const correctCount = history.filter((answer) => answer.correct).length;
  const accuracy = Math.round((correctCount / history.length) * 100);

  const avgConfidence = Math.round(
    history.reduce(
      (sum, answer) => sum + CONFIDENCE_SCORE[answer.confidence],
      0,
    ) / history.length,
  );

  const illusionGap = avgConfidence - accuracy;

  // Score = 100 minus the average penalty for unsupported confidence.
  // Wrong + certain costs 100; wrong + fairly-sure costs 50;
  // wrong + guess costs 0. Correct answers cost 0.
  // An honest guess therefore never lowers the score.
  const totalPenalty = history.reduce(
    (sum, answer) =>
      sum + (answer.correct ? 0 : CONFIDENCE_SCORE[answer.confidence]),
    0,
  );
  const score = Math.round(100 - totalPenalty / history.length);

  let calibration: Calibration = 'well-calibrated';

  if (illusionGap > 20) {
    calibration = 'overconfident';
  } else if (
    illusionGap < -20 &&
    history.some((answer) => answer.confidence !== 'guess')
  ) {
    calibration = 'underconfident';
  }

  return {
    accuracy,
    avgConfidence,
    calibration,
    illusionGap,
    score,
  };
}

export function calibrationCard(
  studentId: string,
  history: AnswerResult[],
): CalibrationCard {
  return { studentId, ...calibrationFor(history) };
}