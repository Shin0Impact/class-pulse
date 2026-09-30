import { randomUUID } from "node:crypto";
import { UserError } from "./sessionService.ts";
import type { ClassFeedback, Session, Student } from "./types.ts";

const MAX_COMMENT_LENGTH = 500;

function cleanComment(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_COMMENT_LENGTH);
}

// Teacher opens feedback for the current class.
export function openFeedback(session: Session): void {
  session.feedbackOpen = true;
}

// Student submits or updates their feedback.
// One feedback entry per student per session.
export function submitFeedback(
  session: Session,
  student: Student,
  payload: {
    rating?: unknown;
    comment?: unknown;
    anonymous?: unknown;
  },
): ClassFeedback {
  if (!session.feedbackOpen) {
    throw new UserError("Feedback is not open yet");
  }

  const rating = Number(payload.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new UserError("Please choose a rating from 1 to 5");
  }

  const comment = cleanComment(payload.comment);
  const anonymous = payload.anonymous === true;

  const existing = session.feedback.find(
    (item) => item.studentId === student.id,
  );

  if (existing) {
    existing.rating = rating as 1 | 2 | 3 | 4 | 5;
    existing.comment = comment;
    existing.anonymous = anonymous;
    existing.createdAt = Date.now();

    return existing;
  }

  const feedback: ClassFeedback = {
    id: randomUUID(),
    studentId: student.id,
    rating: rating as 1 | 2 | 3 | 4 | 5,
    comment,
    anonymous,
    createdAt: Date.now(),
  };

  session.feedback.push(feedback);

  return feedback;
}

// IMPORTANT:
// This is the only shape that should be sent to the teacher.
// Anonymous feedback never exposes studentId or the student's name.
export function feedbackSummary(session: Session) {
  const totalResponses = session.feedback.length;

  const averageRating =
    totalResponses === 0
      ? null
      : Math.round(
          (session.feedback.reduce((sum, item) => sum + item.rating, 0) /
            totalResponses) *
            10,
        ) / 10;

  const feedback = session.feedback.map((item) => {
    const student = session.students.get(item.studentId);

    return {
      id: item.id,
      rating: item.rating,
      comment: item.comment,
      anonymous: item.anonymous,

      // Never reveal the identity when Anonymous is selected.
      studentName: item.anonymous ? null : (student?.name ?? null),

      createdAt: item.createdAt,
    };
  });

  return {
    averageRating,
    totalResponses,
    feedback,
  };
}
