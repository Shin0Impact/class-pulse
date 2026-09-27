// Mock for EVENTS.STUDENT_RATE_CLARITY -- the listener rating how clearly their partner explained.

export const mockStudentRateClarityRequest: { pairId: string; rating: 1 | 2 | 3 | 4 | 5 } = {
  pairId: 'pair-s7-s1',
  rating: 4, // 1 (confusing) to 5 (crystal clear)
};

export const mockStudentRateClarityAck = { ok: true };
