export type Status = 'green' | 'yellow' | 'red' | 'waiting';
export type Mark = Exclude<Status, 'waiting'>;
export type Counts = Record<Status, number>;
export type CheckIn = { id: string; topic: string; startedAt: number };
export type TimelineSample = { t: number; pct: number | null; marked: number; total: number; checkInId: string };
export type Summary = CheckIn & { endedAt: number; counts: Counts; marked: number; total: number; pct: number | null };
export type Comparison = { topic: string; before: number; after: number; delta: number; beforeMarked: number; afterMarked: number };
export type ReasonCount = { id: string; label: string; count: number };
export type StudentView = { id: string; name: string; connected: boolean; status: Status; reason: string | null; focusFlags: number };
export type Pulse = Omit<TimelineSample, 'checkInId'> & {
  checkIn: CheckIn;
  counts: Counts;
  reasons: ReasonCount[];
  comparison: Comparison | null;
  perStudent: StudentView[];
};
export type TeacherState = {
  code: string;
  title: string;
  focusMode: boolean;
  pulse: Pulse;
  history: Summary[];
  timeline: TimelineSample[];
};
export type StudentState = {
  studentId: string;
  name: string;
  title: string;
  topic: string;
  checkInId: string;
  status: Status;
  reason: string | null;
  focusMode: boolean;
};
export type FocusAlert = { studentId: string; name: string; count: number };
