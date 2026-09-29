import { EVENTS } from '../../../shared/events.ts';
import { UserError } from '../services/sessionService.ts';
import { store } from '../db/store.ts';
import { teacherRoom } from '../socket/helpers.ts';
import { aiEnabled, AiUnavailableError } from './llm.ts';
import { summarizeRound } from './summaryGen.ts';
import { takeHourly } from './limits.ts';
import type { Server } from 'socket.io';
import type { Session } from '../services/types.ts';
import type { Language } from './summaryGen.ts';

// Runs a class-confusion summary in the background and reports progress to the teacher's room
// (SUMMARY_UPDATE: working -> ready | failed). The socket call that asked for it returns at once.

// Which launch + round a summary describes. A deck question's id repeats when it's launched
// again, and a re-check keeps the id but starts a new round, so the id alone isn't enough.
export const launchKey = (round: { dbId: string; round: number }) => `${round.dbId}:${round.round}`;

const inFlight = new Set<string>(); // "dbId:round:answers" -- the same request twice is one request

export function startSummary(io: Server, session: Session, language: Language): void {
  const round = session.currentQuestion;
  if (!round) throw new UserError('No question is live');
  if (!aiEnabled()) throw new AiUnavailableError('AI is not set up on the server');
  const answers = [...session.answers.values()];
  if (answers.length === 0) throw new UserError('No answers yet to summarize');

  const key = `${round.dbId}:${round.round}:${answers.length}`;
  if (inFlight.has(key)) return;

  if (!takeHourly([[`sum:class:${session.code}`, 30], [`sum:who:${session.teacherId ?? session.code}`, 60]])) {
    throw new UserError('Too many summaries this hour. Try again later.');
  }

  inFlight.add(key);
  const room = teacherRoom(session.code);
  // Everything the result will be filed under, captured now: the round may move on meanwhile.
  const lk = launchKey(round);
  const roundNumber = round.round;
  io.to(room).emit(EVENTS.SUMMARY_UPDATE, { questionId: round.id, launchKey: lk, status: 'working' });

  summarizeRound(round, answers, language)
    .then((summary) => {
      store.saveSummary(round.dbId, roundNumber, summary);
      // Still the same launch and round? Then it's the live question's summary (for refreshes).
      if (session.currentQuestion === round && round.round === roundNumber) round.summary = summary;
      io.to(room).emit(EVENTS.SUMMARY_UPDATE, { questionId: round.id, launchKey: lk, status: 'ready', summary });
    })
    .catch((e: unknown) => {
      const error = e instanceof UserError ? e.message : 'The AI could not write a summary right now.';
      if (!(e instanceof UserError)) console.error('[ai] summary:', e);
      io.to(room).emit(EVENTS.SUMMARY_UPDATE, { questionId: round.id, launchKey: lk, status: 'failed', error });
    })
    .finally(() => inFlight.delete(key));
}
