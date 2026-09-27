import type { Calibration, CalibrationCard, Confidence } from '../../../shared/types.ts';

// Pure functions: turn a student's answer history into a calibration summary (are they good at
// knowing what they know?). STUB for now -- returns a shape-correct placeholder so the server can
// emit calibration:card today. Malak replaces the body (M3) with the real math; the thresholds
// below are placeholders to tune against real classroom data.

const CONFIDENCE_SCORE: Record<Confidence, number> = { guess: 0, 'fairly-sure': 50, certain: 100 };

export function calibrationFor(history: { correct: boolean; confidence: Confidence }[]): Omit<CalibrationCard, 'studentId'> {
  if (!history || history.length === 0) {
    return { accuracy: null, avgConfidence: null, calibration: 'no-data', illusionGap: null };
  }

  const accuracy = Math.round((history.filter((h) => h.correct).length / history.length) * 100);
  const avgConfidence = Math.round(
    history.reduce((sum, h) => sum + CONFIDENCE_SCORE[h.confidence], 0) / history.length,
  );
  const illusionGap = avgConfidence - accuracy;

  let calibration: Calibration = 'well-calibrated';
  if (illusionGap > 20) calibration = 'overconfident';
  else if (illusionGap < -20) calibration = 'underconfident';

  return { accuracy, avgConfidence, calibration, illusionGap };
}

export function calibrationCard(studentId: string, history: { correct: boolean; confidence: Confidence }[]): CalibrationCard {
  return { studentId, ...calibrationFor(history) };
}
