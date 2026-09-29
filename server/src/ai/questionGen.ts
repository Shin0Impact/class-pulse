import { randomInt, randomUUID } from 'node:crypto';
import { UserError } from '../services/sessionService.ts';
import { generateJson } from './llm.ts';
import type { QuestionDraft, QuestionKind } from '../../../shared/types.ts';

// "Generate a question from this page": the teacher's current slide/page (image + text) in, an
// editable draft out. Multiple-choice drafts hunt misconceptions -- every wrong option is a real
// mistake students make -- so a confident wrong pick means something on the Blindspot quadrant.

export type Language = 'ar' | 'en';

export type GenerateInput = {
  kind: QuestionKind;
  pageText: string;
  pageImage?: { mimeType: string; data: string };
  correctAnswer?: string; // multiple choice: the teacher's own right answer (optional)
  language: Language;
};

const LANGUAGE_NAME: Record<Language, string> = { ar: 'Arabic (Modern Standard)', en: 'English' };
const OPTION_IDS = ['a', 'b', 'c', 'd', 'e'];

const SYSTEM = `You write short check-for-understanding questions that a teacher asks the class right after explaining a page or slide. Students answer on their phones in under a minute. You only ever reply with one JSON object.`;

export function buildQuestionPrompt(input: GenerateInput): string {
  const lang = LANGUAGE_NAME[input.language];
  const content = input.pageText.trim()
    ? `Text of the page (may be incomplete; the image is the full page):\n"""\n${input.pageText.trim().slice(0, 6000)}\n"""`
    : 'The page has no extractable text; use the image.';

  if (input.kind === 'open') {
    return `${content}

Write ONE open-ended question about the most important idea on this page -- one where a student who only half-understood would give a noticeably wrong or vague answer.
Rules:
- The question must stand alone: never say "the slide", "the page" or "the image" (students don't see it).
- Answerable in 1-3 sentences. Question at most 200 characters.
- Write everything in ${lang}.

Reply with exactly this JSON shape:
{"topic": "2-5 word topic", "prompt": "the question", "modelAnswer": "what a good answer says, 1-3 sentences", "keyIdeas": ["2-4 short phrases a correct answer would contain"]}`;
  }

  const teacherAnswer = input.correctAnswer?.trim()
    ? `\nThe correct answer is exactly: "${input.correctAnswer.trim().slice(0, 200)}". Use that text, unchanged, as the one correct option, and write the question so that it is correct.`
    : '';

  return `${content}

Write ONE multiple-choice question about the most important idea on this page.
The goal is to catch students who are CONFIDENTLY WRONG, so:
- Exactly 4 options, exactly one correct.${teacherAnswer}
- Each wrong option is a specific, common misconception or mistake a real student makes about this exact content: tempting and plausible, never silly or obviously wrong.
- No "all of the above" / "none of the above", no trick wording.
- The question must stand alone: never say "the slide", "the page" or "the image" (students don't see it).
- Question at most 200 characters, each option at most 80 characters.
- Write everything in ${lang}.

Reply with exactly this JSON shape:
{"topic": "2-5 word topic",
 "prompt": "the question",
 "options": [{"text": "option text", "correct": true or false, "misconception": "for a wrong option: the mistake it represents, max 10 words; empty string for the correct one", "tellTale": ["for a wrong option: 2-3 short phrases a student holding this mistake might write when explaining; empty for the correct one"]}],
 "keyIdeas": ["2-4 short phrases a correct explanation would contain"]}`;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');
const strList = (v: unknown, maxItems: number, maxLen: number) =>
  Array.isArray(v) ? v.map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems) : [];

// Fisher-Yates with a crypto RNG: models like to put the right answer first.
function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Turns the model's JSON into a draft, or throws (so llm.ts tries the next provider).
export function toDraft(raw: unknown, input: Pick<GenerateInput, 'kind' | 'correctAnswer'>, provider?: string): QuestionDraft {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('not an object');
  const r = raw as Record<string, unknown>;
  const prompt = str(r.prompt, 300);
  if (!prompt) throw new Error('no prompt');
  const topic = str(r.topic, 60);
  const keyIdeas = strList(r.keyIdeas, 4, 80);

  if (input.kind === 'open') {
    return {
      id: `ai-${randomUUID()}`,
      kind: 'open',
      topic,
      prompt,
      options: [],
      correctOptionId: '',
      optionNotes: {},
      modelAnswer: str(r.modelAnswer, 600),
      source: 'ai',
      provider,
    };
  }

  if (!Array.isArray(r.options)) throw new Error('no options');
  const options = r.options
    .map((o) => {
      const opt = (o && typeof o === 'object' ? o : {}) as Record<string, unknown>;
      return {
        text: str(opt.text, 120),
        correct: opt.correct === true,
        misconception: str(opt.misconception, 100),
        tellTale: strList(opt.tellTale, 3, 60),
      };
    })
    .filter((o) => o.text);

  const teacherAnswer = input.correctAnswer?.trim().slice(0, 200);
  if (teacherAnswer) {
    // The teacher's answer is authoritative: make sure it's there, verbatim, and the only correct one.
    const match = options.find((o) => o.text.toLowerCase() === teacherAnswer.toLowerCase()) ?? options.find((o) => o.correct);
    for (const o of options) o.correct = false;
    if (match) {
      match.text = teacherAnswer;
      match.correct = true;
      match.misconception = '';
      match.tellTale = [];
    } else {
      options.unshift({ text: teacherAnswer, correct: true, misconception: '', tellTale: [] });
    }
  }

  const unique = options.filter((o, i) => options.findIndex((x) => x.text.toLowerCase() === o.text.toLowerCase()) === i);
  const correct = unique.filter((o) => o.correct);
  if (correct.length !== 1) throw new Error(`${correct.length} correct options`);
  const wrong = unique.filter((o) => !o.correct).slice(0, 3);
  if (wrong.length < 2) throw new Error('too few wrong options');

  const shuffled = shuffle([...correct, ...wrong]).map((o, i) => ({ ...o, id: OPTION_IDS[i] }));
  const misconceptions = shuffled
    .filter((o) => !o.correct && o.misconception && o.tellTale.length > 0)
    .map((o) => ({ label: o.misconception, phrases: o.tellTale }));

  return {
    id: `ai-${randomUUID()}`,
    kind: 'mcq',
    topic,
    prompt,
    options: shuffled.map(({ id, text }) => ({ id, text })),
    correctOptionId: shuffled.find((o) => o.correct)!.id,
    optionNotes: Object.fromEntries(shuffled.filter((o) => !o.correct && o.misconception).map((o) => [o.id, o.misconception])),
    modelAnswer: '',
    // Plugs straight into the explanation rubric (explanationRubric.ts) used on students' "explain your thinking".
    rubric: keyIdeas.length > 0 ? { keyIdeas, misconceptions } : undefined,
    source: 'ai',
    provider,
  };
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BASE64 = 3_000_000; // ~2.2 MB image

export function checkGenerateInput(body: Record<string, unknown>): GenerateInput {
  const kind = body.kind === 'open' ? 'open' : 'mcq';
  const pageText = typeof body.pageText === 'string' ? body.pageText.slice(0, 20_000) : '';
  let pageImage: GenerateInput['pageImage'];
  const img = body.pageImage as Record<string, unknown> | undefined;
  if (img && typeof img === 'object') {
    if (typeof img.mimeType !== 'string' || !IMAGE_TYPES.includes(img.mimeType) || typeof img.data !== 'string') {
      throw new UserError('Page image must be a JPEG, PNG or WebP');
    }
    if (img.data.length > MAX_IMAGE_BASE64) throw new UserError('Page image is too large');
    pageImage = { mimeType: img.mimeType, data: img.data };
  }
  if (!pageText.trim() && !pageImage) throw new UserError('This page has nothing to ask about');
  const correctAnswer = typeof body.correctAnswer === 'string' && body.correctAnswer.trim() ? body.correctAnswer : undefined;
  const language: Language = body.language === 'ar' ? 'ar' : 'en';
  return { kind, pageText, pageImage, correctAnswer, language };
}

export async function generateQuestion(input: GenerateInput): Promise<QuestionDraft> {
  const { value } = await generateJson(
    { system: SYSTEM, prompt: buildQuestionPrompt(input), image: input.pageImage, maxTokens: 1500 },
    (raw, provider) => toDraft(raw, input, provider),
  );
  return value;
}
