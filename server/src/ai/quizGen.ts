import { UserError } from '../services/sessionService.ts';
import { generateJson } from './llm.ts';
import { toDraft } from './questionGen.ts';
import type { Language } from './questionGen.ts';
import type { QuestionDraft, QuizType } from '../../../shared/types.ts';

// "Create a quiz": N questions from the pages the teacher picked, in one model call. Each question
// goes through the same validation as a single AI question (toDraft), so a bad one is dropped
// instead of failing the whole quiz.

export const MAX_GENERATED = 15;

export type QuizGenInput = {
  type: QuizType;
  count: number;
  pageText: string;
  pageImage?: { mimeType: string; data: string };
  fromPage?: number;
  toPage?: number;
  language: Language;
};

const LANGUAGE_NAME: Record<Language, string> = { ar: 'Arabic (Modern Standard)', en: 'English' };

const SYSTEM = `You write quizzes that students take on their own phones, at their own pace, after a lesson. Every question checks real understanding of the material. You only ever reply with one JSON object.`;

// How many of each kind: "mixed" is half and half (the extra one is multiple choice).
export const splitCounts = (type: QuizType, count: number): { mcq: number; open: number } =>
  type === 'mcq' ? { mcq: count, open: 0 } : type === 'open' ? { mcq: 0, open: count } : { mcq: Math.ceil(count / 2), open: Math.floor(count / 2) };

export function buildQuizPrompt(input: QuizGenInput): string {
  const { mcq, open } = splitCounts(input.type, input.count);
  const lang = LANGUAGE_NAME[input.language];
  const range = input.fromPage && input.toPage ? `pages ${input.fromPage} to ${input.toPage}` : 'the material';
  const content = input.pageText.trim()
    ? `Text of ${range} (may be incomplete):\n"""\n${input.pageText.trim().slice(0, 24_000)}\n"""`
    : 'The material has no extractable text; use the image.';
  const parts = [mcq > 0 ? `${mcq} multiple-choice` : '', open > 0 ? `${open} open-ended` : ''].filter(Boolean).join(' and ');

  return `${content}

Write a quiz of exactly ${input.count} questions: ${parts}. Cover different parts of the material (no two questions about the same fact) and go from easier to harder.
Rules:
- Every question must stand alone: never say "the slide", "the page", "the text" or "the image" (students don't see it).
- Multiple choice: exactly 4 options, exactly one correct; every wrong option is a specific, plausible mistake a real student makes, never silly; no "all/none of the above". Question at most 200 characters, each option at most 80.
- Open-ended: answerable in 1-3 sentences; give a short model answer. Question at most 200 characters.
- Write everything in ${lang}.

Reply with exactly this JSON shape:
{"title": "2-6 word quiz title",
 "questions": [
  {"type": "mcq", "topic": "2-5 word topic", "prompt": "the question", "options": [{"text": "option text", "correct": true or false, "misconception": "for a wrong option: the mistake it stands for, max 10 words; empty for the correct one"}]},
  {"type": "open", "topic": "2-5 word topic", "prompt": "the question", "modelAnswer": "what a good answer says"}
 ]}`;
}

export type GeneratedQuiz = { title: string; questions: QuestionDraft[]; provider?: string };

// Turns the model's JSON into drafts, or throws (so llm.ts tries the next provider).
export function toQuiz(raw: unknown, input: QuizGenInput, provider?: string): GeneratedQuiz {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('not an object');
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.questions)) throw new Error('no questions');
  const { mcq, open } = splitCounts(input.type, input.count);
  const questions: QuestionDraft[] = [];
  let gotMcq = 0;
  let gotOpen = 0;
  for (const q of r.questions) {
    const kind = q && typeof q === 'object' && (q as Record<string, unknown>).type === 'open' ? 'open' : 'mcq';
    // never more of a kind than the teacher asked for
    if (kind === 'mcq' ? gotMcq >= mcq : gotOpen >= open) continue;
    try {
      const draft = toDraft(q, { kind }, provider);
      if (kind === 'open' && !draft.modelAnswer) draft.modelAnswer = '';
      questions.push(draft);
      if (kind === 'mcq') gotMcq++;
      else gotOpen++;
    } catch {
      // drop just this question
    }
  }
  if (questions.length < Math.max(1, Math.ceil(input.count * 0.6))) throw new Error(`only ${questions.length} usable questions`);
  const title = typeof r.title === 'string' ? r.title.trim().replace(/\s+/g, ' ').slice(0, 80) : '';
  return { title, questions, provider };
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BASE64 = 3_000_000;

export function checkQuizInput(body: Record<string, unknown>): QuizGenInput {
  const type: QuizType = body.type === 'open' ? 'open' : body.type === 'mixed' ? 'mixed' : 'mcq';
  const count = typeof body.count === 'number' && Number.isInteger(body.count) ? body.count : NaN;
  if (!(count >= 1 && count <= MAX_GENERATED)) throw new UserError(`Choose between 1 and ${MAX_GENERATED} questions`);
  const pageText = typeof body.pageText === 'string' ? body.pageText.slice(0, 30_000) : '';
  let pageImage: QuizGenInput['pageImage'];
  const img = body.pageImage as Record<string, unknown> | undefined;
  if (img && typeof img === 'object') {
    if (typeof img.mimeType !== 'string' || !IMAGE_TYPES.includes(img.mimeType) || typeof img.data !== 'string') {
      throw new UserError('Image must be a JPEG, PNG or WebP');
    }
    if (img.data.length > MAX_IMAGE_BASE64) throw new UserError('Image is too large');
    pageImage = { mimeType: img.mimeType, data: img.data };
  }
  if (!pageText.trim() && !pageImage) throw new UserError('These pages have no text to make a quiz from');
  const page = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 && v < 10_000 ? v : undefined);
  return { type, count, pageText, pageImage, fromPage: page(body.fromPage), toPage: page(body.toPage), language: body.language === 'ar' ? 'ar' : 'en' };
}

export async function generateQuiz(input: QuizGenInput): Promise<GeneratedQuiz> {
  const { value } = await generateJson(
    { system: SYSTEM, prompt: buildQuizPrompt(input), image: input.pageImage, maxTokens: 500 + input.count * 450 },
    (raw, provider) => toQuiz(raw, input, provider),
  );
  return value;
}
