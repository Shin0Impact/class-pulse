import 'dotenv/config';
import { UserError } from '../services/sessionService.ts';
import { providersFromEnv } from './providers.ts';
import type { LlmRequest, Provider } from './providers.ts';

// Tries each provider in order until one returns something that parses AND passes `validate`.
// A timeout, a rate limit, an outage or a malformed answer all just move on to the next one.

export class AiUnavailableError extends UserError {}

let configured: Provider[] = providersFromEnv();
export const aiEnabled = () => configured.length > 0;
export const providerNames = () => configured.map((p) => p.name);

// Tests swap in fake providers.
export function setProviders(providers: Provider[]): void {
  configured = providers;
}

// Models wrap JSON in ``` fences or add a sentence around it; take the outermost {...}.
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object in the answer');
  return JSON.parse(text.slice(start, end + 1));
}

// A provider that said "rate limited" (429), "quota" or "overloaded / high demand" (503) is
// skipped for a minute instead of costing every request a failed round trip first.
const COOLDOWN_MS = 60_000;
const coolingUntil = new Map<string, number>();

export async function generateJson<T>(
  req: Omit<LlmRequest, 'json'>,
  validate: (raw: unknown, provider: string) => T,
  { timeoutMs = 20_000, providers = configured }: { timeoutMs?: number; providers?: Provider[] } = {},
): Promise<{ value: T; provider: string }> {
  if (providers.length === 0) throw new AiUnavailableError('AI is not set up on the server (no GEMINI_API_KEY or ANTHROPIC_API_KEY).');

  const failures: string[] = [];
  const ready = providers.filter((p) => (coolingUntil.get(p.name) ?? 0) < Date.now());
  // If everything is cooling down, try them all anyway rather than fail without asking.
  for (const provider of ready.length > 0 ? ready : providers) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // Race the timeout too: aborting only stops providers that honour the signal.
      const timedOut = new Promise<never>((_, reject) =>
        controller.signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true }),
      );
      const text = await Promise.race([provider.generate({ ...req, json: true }, controller.signal), timedOut]);
      return { value: validate(extractJson(text), provider.name), provider: provider.name };
    } catch (e) {
      const reason = controller.signal.aborted ? `timed out after ${timeoutMs / 1000}s` : e instanceof Error ? e.message : String(e);
      failures.push(`${provider.name}: ${reason}`);
      if (/\b(429|503|529)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded|high demand|quota|rate.?limit/i.test(reason)) {
        coolingUntil.set(provider.name, Date.now() + COOLDOWN_MS);
      }
      console.warn(`[ai] ${provider.name} failed: ${reason}`);
    } finally {
      clearTimeout(timer);
    }
  }
  console.error('[ai] every provider failed:\n  ' + failures.join('\n  '));
  throw new AiUnavailableError('The AI could not answer right now. Try again, or write the question yourself.');
}
