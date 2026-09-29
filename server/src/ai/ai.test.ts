import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJson, generateJson } from './llm.ts';
import { toDraft, checkGenerateInput } from './questionGen.ts';
import { buildSummaryPrompt, toSummary } from './summaryGen.ts';
import type { Provider } from './providers.ts';
import type { QuestionRound, StudentAnswer } from '../services/types.ts';

const mcqRaw = {
  topic: 'Fractions',
  prompt: 'Which is bigger, 1/3 or 1/4?',
  options: [
    { text: '1/3', correct: true, misconception: '', tellTale: [] },
    { text: '1/4', correct: false, misconception: 'bigger denominator means bigger fraction', tellTale: ['4 is bigger than 3'] },
    { text: 'They are equal', correct: false, misconception: 'both have numerator 1', tellTale: ['same top number'] },
    { text: 'Cannot tell', correct: false, misconception: 'unlike denominators cannot be compared', tellTale: [] },
  ],
  keyIdeas: ['smaller pieces', 'same numerator'],
};

test('a multiple-choice draft keeps one correct answer, labels the mistakes and builds a rubric', () => {
  const d = toDraft(mcqRaw, { kind: 'mcq' }, 'fake');
  assert.equal(d.kind, 'mcq');
  assert.equal(d.options.length, 4);
  assert.deepEqual(d.options.map((o) => o.id), ['a', 'b', 'c', 'd']);
  const correct = d.options.find((o) => o.id === d.correctOptionId)!;
  assert.equal(correct.text, '1/3');
  assert.equal(Object.keys(d.optionNotes).length, 3);
  assert.ok(!(d.correctOptionId in d.optionNotes));
  assert.deepEqual(d.rubric?.keyIdeas, ['smaller pieces', 'same numerator']);
  assert.equal(d.rubric?.misconceptions.length, 2); // "Cannot tell" had no tell-tale phrases
  assert.equal(d.provider, 'fake');
});

test("the teacher's own answer wins, verbatim, even if the model marked another option", () => {
  const raw = { ...mcqRaw, options: mcqRaw.options.map((o) => ({ ...o, correct: o.text === '1/4' })) };
  const d = toDraft(raw, { kind: 'mcq', correctAnswer: '  1/3 ' }, 'fake');
  assert.equal(d.options.find((o) => o.id === d.correctOptionId)!.text, '1/3');
  assert.equal(d.options.filter((o) => o.text === '1/3').length, 1);
});

test('drafts the model got wrong are rejected (so the next provider is tried)', () => {
  const twoRight = { ...mcqRaw, options: mcqRaw.options.map((o, i) => ({ ...o, correct: i < 2 })) };
  assert.throws(() => toDraft(twoRight, { kind: 'mcq' }));
  assert.throws(() => toDraft({ ...mcqRaw, prompt: '' }, { kind: 'mcq' }));
  assert.throws(() => toDraft({ ...mcqRaw, options: mcqRaw.options.slice(0, 2) }, { kind: 'mcq' }));
});

test('an open draft has no options and keeps the model answer for the teacher', () => {
  const d = toDraft({ topic: 'Photosynthesis', prompt: 'Why do leaves need light?', modelAnswer: 'Light powers sugar-making.' }, { kind: 'open' });
  assert.equal(d.kind, 'open');
  assert.deepEqual(d.options, []);
  assert.equal(d.correctOptionId, '');
  assert.equal(d.modelAnswer, 'Light powers sugar-making.');
});

test('generate input needs page text or an image, and only image types the models read', () => {
  assert.throws(() => checkGenerateInput({ pageText: '   ' }), /nothing to ask/);
  assert.throws(() => checkGenerateInput({ pageText: 'x', pageImage: { mimeType: 'image/gif', data: 'x' } }), /JPEG/);
  const ok = checkGenerateInput({ kind: 'open', pageText: 'Cells', language: 'ar' });
  assert.deepEqual([ok.kind, ok.language], ['open', 'ar']);
});

test('JSON is found inside fences or chatter', () => {
  assert.deepEqual(extractJson('Sure!\n```json\n{"a": 1}\n```'), { a: 1 });
  assert.throws(() => extractJson('no json here'));
});

const fake = (name: string, answer: () => Promise<string>): Provider => ({ name, generate: () => answer() });

test('falls through failing, slow and malformed providers to the first good one', async () => {
  const providers = [
    fake('down', () => Promise.reject(new Error('503'))),
    fake('slow', () => new Promise(() => {})), // never answers
    fake('garbled', async () => '{"prompt": ""}'),
    fake('good', async () => JSON.stringify(mcqRaw)),
  ];
  const { value, provider } = await generateJson(
    { system: 's', prompt: 'p', maxTokens: 10 },
    (raw, p) => toDraft(raw, { kind: 'mcq' }, p),
    { providers, timeoutMs: 50 },
  );
  assert.equal(provider, 'good');
  assert.equal(value.provider, 'good');
});

test('with every provider failing the teacher gets a plain message', async () => {
  await assert.rejects(
    generateJson({ system: 's', prompt: 'p', maxTokens: 10 }, (r) => r, { providers: [fake('x', () => Promise.reject(new Error('boom')))], timeoutMs: 50 }),
    /could not answer right now/,
  );
  await assert.rejects(generateJson({ system: 's', prompt: 'p', maxTokens: 10 }, (r) => r, { providers: [] }), /not set up/);
});

const round = (over: Partial<QuestionRound> = {}): QuestionRound => ({
  id: 'q1', dbId: 'db1', round: 1, kind: 'mcq', topic: 'Fractions', prompt: 'Which is bigger?',
  correctOptionId: 'a', options: [{ id: 'a', text: '1/3' }, { id: 'b', text: '1/4' }],
  source: 'ai', closed: true, startedAt: 0, ...over,
});

test('the summary prompt counts picks and confidence, and carries no student names', () => {
  const answers: StudentAnswer[] = [
    { optionId: 'b', confidence: 'certain', explanation: 'four is more than three' },
    { optionId: 'b', confidence: 'certain' },
    { optionId: 'a', confidence: 'guess' },
  ];
  const prompt = buildSummaryPrompt(round({ context: { page: 4, documentName: 'Unit 2.pdf', excerpt: 'Comparing unit fractions' } }), answers, 'ar');
  assert.match(prompt, /B\) 1\/4: 2 \(certain 2, fairly sure 0, guessing 0\)/);
  assert.match(prompt, /2 SURE BUT WRONG/);
  assert.match(prompt, /"four is more than three"/);
  assert.match(prompt, /page 4 of "Unit 2.pdf"/);
  assert.match(prompt, /Arabic/);
  assert.doesNotMatch(prompt, /Amal|studentId|name:/);
});

test('open-question summaries read the written answers', () => {
  const prompt = buildSummaryPrompt(round({ kind: 'open', options: [], correctOptionId: '', modelAnswer: 'Light makes sugar.' }), [
    { optionId: '', text: 'plants eat soil', confidence: 'certain' },
  ], 'en');
  assert.match(prompt, /Their answers:/);
  assert.match(prompt, /plants eat soil/);
  assert.match(prompt, /Light makes sugar/);
});

test('summaries are clipped and need a headline', () => {
  const s = toSummary(
    { headline: 'Most of the class thinks 1/4 > 1/3.', confusions: [{ issue: 'bigger denominator = bigger', detail: '2 of 3' }, {}, {}, { issue: 'x' }, { issue: 'y' }], reteach: true, suggestion: 'Draw pizzas.' },
    { questionId: 'q1', answered: 3, provider: 'fake' },
  );
  assert.equal(s.confusions.length, 3);
  assert.equal(s.reteach, true);
  assert.throws(() => toSummary({ confusions: [] }, { questionId: 'q1', answered: 1, provider: 'x' }));
});

test('a rate-limited provider is skipped on the next request', async () => {
  let limitedCalls = 0;
  const providers = [
    fake('limited', async () => { limitedCalls++; throw new Error('429 Resource exhausted'); }),
    fake('backup', async () => '{"ok": true}'),
  ];
  const run = () => generateJson({ system: 's', prompt: 'p', maxTokens: 10 }, (r) => r, { providers, timeoutMs: 50 });
  assert.equal((await run()).provider, 'backup');
  assert.equal((await run()).provider, 'backup');
  assert.equal(limitedCalls, 1);
});
