import type { CheckIn, Status, Summary, TimelineSample } from '../../../shared/types.ts';

export type Student = {
  id: string;
  name: string;
  socketId: string;
  connected: boolean;
  status: Status;
  reason: string | null;
  focus: number;
};
export type Session = {
  id: string;
  code: string;
  title: string;
  createdAt: number;
  students: Map<string, Student>;
  checkIns: Summary[];
  current: CheckIn;
  timeline: TimelineSample[];
  focusMode: boolean;
};
