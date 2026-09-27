// Mock for EVENTS.CALIBRATION_CARD -- a per-student calibration summary after a question/recheck cycle.
import type { CalibrationCard } from '@shared/types.ts';

export const mockCalibrationCardOverconfident: CalibrationCard = {
  studentId: 's7',
  accuracy: 33,
  avgConfidence: 83,
  calibration: 'overconfident',
  illusionGap: 50,
  score: 33,
};

export const mockCalibrationCardWellCalibrated: CalibrationCard = {
  studentId: 's1',
  accuracy: 90,
  avgConfidence: 88,
  calibration: 'well-calibrated',
  illusionGap: -2,
  score: 95,
};
