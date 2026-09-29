// Checks the AI setup from this machine: which providers are configured, whether each one answers,
// and how fast. Run: npm run ai:check
// It sends one tiny made-up question -- no student data.
import 'dotenv/config';
import { providersFromEnv, DEFAULT_GEMINI_MODELS } from '../src/ai/providers.ts';
import { extractJson } from '../src/ai/llm.ts';

const providers = providersFromEnv();
if (providers.length === 0) {
  console.log('No AI keys found. Add GEMINI_API_KEY (and optionally ANTHROPIC_API_KEY) to server/.env');
  process.exit(1);
}

console.log(`Trying ${providers.length} provider(s), in the order the app uses them:\n`);
let working = 0;
for (const p of providers) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const text = await p.generate(
      {
        system: 'You only reply with one JSON object.',
        prompt: 'Write one multiple-choice question about adding 1/2 + 1/4. Reply as {"prompt": "...", "options": ["...", "...", "...", "..."], "correct": 0}',
        maxTokens: 400,
        json: true,
      },
      controller.signal,
    );
    const parsed = extractJson(text) as { prompt?: string };
    console.log(`  OK    ${p.name}  (${((Date.now() - started) / 1000).toFixed(1)}s)  "${String(parsed.prompt ?? '').slice(0, 70)}"`);
    working++;
  } catch (e) {
    const msg = controller.signal.aborted ? 'timed out after 30s' : e instanceof Error ? e.message : String(e);
    console.log(`  FAIL  ${p.name}  ${msg.slice(0, 200)}`);
  } finally {
    clearTimeout(timer);
  }
}

// Which Gemini models this key can use, to pick GEMINI_MODELS if the defaults fail.
const key = process.env.GEMINI_API_KEY?.trim();
if (key) {
  try {
    const base = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
    const res = await fetch(`${base}/v1beta/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
    const data = (await res.json()) as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> };
    const flash = (data.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent') && /flash/i.test(m.name))
      .map((m) => m.name.replace('models/', ''));
    console.log(`\nGemini "flash" models your key can use:\n  ${flash.join('\n  ') || '(none listed)'}`);
    console.log(`\nDefaults are ${DEFAULT_GEMINI_MODELS.join(', ')}. To change them, set in server/.env e.g.`);
    console.log(`  GEMINI_MODELS=${flash.slice(0, 2).join(',') || 'model-a,model-b'}`);
  } catch (e) {
    console.log(`\nCould not list Gemini models: ${e instanceof Error ? e.message : e}`);
  }
}

console.log(working > 0 ? `\n${working}/${providers.length} working. The app uses the first one that answers.` : '\nNothing answered: AI features will show an error.');
process.exit(working > 0 ? 0 : 1);
