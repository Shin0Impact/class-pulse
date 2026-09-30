import { randomUUID } from "node:crypto";
import { UserError } from "./sessionService.ts";
import type {
  QuizQuestionPublic,
  QuizResults,
  QuizReviewItem,
  StudentQuiz,
} from "../../../shared/types.ts";
import type { Quiz, QuizQuestion, QuizResponse, Session, Student } from "./types.ts";

export const MAX_QUIZ_QUESTIONS = 20;
const MAX_TEXT = 600;

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const text = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";

// Validates the teacher's quiz (already reviewed on the dashboard) and starts it.
// Starting a new quiz replaces the previous one.
export function startQuiz(session: Session, payload: unknown): Quiz {
  const body = isObj(payload) ? payload : {};
  const raw = body.questions;
  if (!Array.isArray(raw) || raw.length === 0) throw new UserError("A quiz needs at least 1 question");
  if (raw.length > MAX_QUIZ_QUESTIONS) throw new UserError(`A quiz can have at most ${MAX_QUIZ_QUESTIONS} questions`);

  const questions: QuizQuestion[] = raw.map((q: unknown, i: number) => {
    if (!isObj(q)) throw new UserError(`Question ${i + 1} is invalid`);
    const prompt = text(q.prompt, 300);
    if (!prompt) throw new UserError(`Question ${i + 1} needs text`);
    const id = `q${i + 1}`;
    if (q.kind === "open") {
      return { id, kind: "open", prompt, options: [], correctOptionId: "", modelAnswer: text(q.modelAnswer, 600) };
    }
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
      throw new UserError(`Question ${i + 1} needs 2 to 6 options`);
    }
    const options = q.options.map((o: unknown, j: number) => {
      const t = isObj(o) ? text(o.text, 120) : "";
      const oid = isObj(o) && typeof o.id === "string" ? o.id.slice(0, 20) : "";
      if (!t || !oid) throw new UserError(`Question ${i + 1}, option ${j + 1} is incomplete`);
      return { id: oid, text: t };
    });
    if (new Set(options.map((o) => o.id)).size !== options.length) throw new UserError(`Question ${i + 1} has repeated options`);
    const correctOptionId = typeof q.correctOptionId === "string" ? q.correctOptionId : "";
    if (!options.some((o) => o.id === correctOptionId)) throw new UserError(`Question ${i + 1} needs a correct answer`);
    return { id, kind: "mcq", prompt, options, correctOptionId, modelAnswer: "" };
  });

  const quiz: Quiz = {
    id: randomUUID(),
    title: text(body.title, 80) || "Quiz",
    questions,
    closed: false,
    responses: new Map(),
    startedAt: Date.now(),
  };
  session.quiz = quiz;
  return quiz;
}

export function closeQuiz(session: Session): Quiz {
  const quiz = session.quiz;
  if (!quiz) throw new UserError("There is no quiz to close");
  quiz.closed = true;
  return quiz;
}

const publicQuestions = (quiz: Quiz): QuizQuestionPublic[] =>
  quiz.questions.map(({ id, kind, prompt, options }) => ({ id, kind, prompt, options }));

function reviewOf(quiz: Quiz, response: QuizResponse): QuizReviewItem[] {
  return quiz.questions.map((q) => {
    const a = response.answers.get(q.id);
    return {
      questionId: q.id,
      correct: q.kind === "mcq" ? a?.optionId === q.correctOptionId : null,
      correctOptionId: q.correctOptionId,
      modelAnswer: q.modelAnswer,
    };
  });
}

// What one student sees; the answer key only appears after they've submitted.
export function quizForStudent(session: Session, student: Student): StudentQuiz | null {
  const quiz = session.quiz;
  if (!quiz) return null;
  const response = quiz.responses.get(student.id);
  // A quiz that ended before this student ever started it is gone for them.
  if (quiz.closed && !response) return null;
  return {
    id: quiz.id,
    title: quiz.title,
    closed: quiz.closed,
    questions: publicQuestions(quiz),
    answers: response ? Object.fromEntries(response.answers) : {},
    submitted: response?.submitted ?? false,
    review: response?.submitted ? reviewOf(quiz, response) : null,
  };
}

// Saves one answer (overwriting an earlier one) so nothing is lost on a refresh.
export function answerQuiz(session: Session, student: Student, payload: unknown): void {
  const quiz = session.quiz;
  const body = isObj(payload) ? payload : {};
  if (!quiz || body.quizId !== quiz.id) throw new UserError("This quiz is no longer running");
  if (quiz.closed) throw new UserError("The teacher has ended this quiz");
  const q = quiz.questions.find((x) => x.id === body.questionId);
  if (!q) throw new UserError("Unknown question");
  let response = quiz.responses.get(student.id);
  if (!response) quiz.responses.set(student.id, (response = { answers: new Map(), submitted: false }));
  if (response.submitted) throw new UserError("You already submitted this quiz");

  if (q.kind === "open") {
    const t = typeof body.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : "";
    if (t) response.answers.set(q.id, { text: t });
    else response.answers.delete(q.id);
  } else {
    if (!q.options.some((o) => o.id === body.optionId)) throw new UserError("Pick one of the options");
    response.answers.set(q.id, { optionId: body.optionId as string });
  }
}

// Locks a student's answers in and returns their review. Allowed after the teacher closed the quiz
// (that's how a student who never finished gets their review).
export function submitQuiz(session: Session, student: Student, payload: unknown): StudentQuiz {
  const quiz = session.quiz;
  const body = isObj(payload) ? payload : {};
  if (!quiz || body.quizId !== quiz.id) throw new UserError("This quiz is no longer running");
  let response = quiz.responses.get(student.id);
  if (!response) {
    if (quiz.closed) throw new UserError("The teacher has ended this quiz");
    quiz.responses.set(student.id, (response = { answers: new Map(), submitted: false }));
  }
  response.submitted = true;
  return quizForStudent(session, student)!;
}

export function quizResults(session: Session): QuizResults | null {
  const quiz = session.quiz;
  if (!quiz) return null;
  const students = [...session.students.values()];
  const name = new Map(students.map((s) => [s.id, s.name]));

  const questions = quiz.questions.map((q) => {
    const counts = new Map<string, number>();
    const texts: Array<{ studentId: string; name: string; text: string }> = [];
    let answered = 0;
    let correct = 0;
    for (const [sid, r] of quiz.responses) {
      const a = r.answers.get(q.id);
      if (!a) continue;
      answered++;
      if (q.kind === "open") texts.push({ studentId: sid, name: name.get(sid) ?? "?", text: a.text ?? "" });
      else if (a.optionId) {
        counts.set(a.optionId, (counts.get(a.optionId) ?? 0) + 1);
        if (a.optionId === q.correctOptionId) correct++;
      }
    }
    return {
      id: q.id,
      kind: q.kind,
      prompt: q.prompt,
      modelAnswer: q.modelAnswer,
      answered,
      correct,
      options: q.options.map((o) => ({ id: o.id, text: o.text, count: counts.get(o.id) ?? 0, correct: o.id === q.correctOptionId })),
      texts,
    };
  });

  const rows = students
    .filter((s) => quiz.responses.has(s.id) || s.connected)
    .map((s) => {
      const r = quiz.responses.get(s.id);
      let right = 0;
      if (r) for (const q of quiz.questions) if (q.kind === "mcq" && r.answers.get(q.id)?.optionId === q.correctOptionId) right++;
      return { id: s.id, name: s.name, connected: s.connected, answered: r?.answers.size ?? 0, submitted: r?.submitted ?? false, correct: right };
    });

  return {
    id: quiz.id,
    title: quiz.title,
    closed: quiz.closed,
    mcqTotal: quiz.questions.filter((q) => q.kind === "mcq").length,
    questions,
    students: rows,
  };
}
