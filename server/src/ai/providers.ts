// The AI providers, as plain REST calls (no SDKs). Each one turns { system, prompt, image? } into
// raw text; llm.ts decides the order, the timeouts and what counts as a usable answer.

export type LlmRequest = {
  system: string;
  prompt: string;
  image?: { mimeType: string; data: string }; // base64, no data: prefix
  maxTokens: number;
  json: boolean; // ask the model for a JSON object
};

export type Provider = {
  name: string; // e.g. "gemini:gemini-3.8-flash", shown in logs and to the teacher
  generate: (req: LlmRequest, signal: AbortSignal) => Promise<string>;
};

async function readError(res: Response): Promise<string> {
  const body = await res.text().catch(() => '');
  return `${res.status} ${body.slice(0, 300)}`;
}

export function geminiProvider(apiKey: string, model: string, baseUrl = 'https://generativelanguage.googleapis.com'): Provider {
  return {
    name: `gemini:${model}`,
    async generate(req, signal) {
      const parts: object[] = [{ text: req.prompt }];
      if (req.image) parts.push({ inline_data: { mime_type: req.image.mimeType, data: req.image.data } });
      const res = await fetch(`${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: req.system }] },
          contents: [{ role: 'user', parts }],
          generationConfig: {
            // Thinking models spend part of this budget before writing: leave plenty of room.
            maxOutputTokens: Math.max(req.maxTokens, 8192),
            temperature: 0.7,
            ...(req.json ? { response_mime_type: 'application/json' } : {}),
          },
        }),
      });
      if (!res.ok) throw new Error(`${this.name}: ${await readError(res)}`);
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> }; finishReason?: string }>;
        promptFeedback?: { blockReason?: string };
      };
      if (data.promptFeedback?.blockReason) throw new Error(`${this.name}: blocked (${data.promptFeedback.blockReason})`);
      const text = (data.candidates?.[0]?.content?.parts ?? [])
        .filter((p) => !p.thought && typeof p.text === 'string')
        .map((p) => p.text)
        .join('');
      const finish = data.candidates?.[0]?.finishReason;
      if (!text.trim()) throw new Error(`${this.name}: empty answer (${finish ?? 'no candidates'})`);
      if (finish === 'MAX_TOKENS') throw new Error(`${this.name}: answer was cut off (MAX_TOKENS)`);
      return text;
    },
  };
}

export function claudeProvider(apiKey: string, model: string, baseUrl = 'https://api.anthropic.com'): Provider {
  return {
    name: `claude:${model}`,
    async generate(req, signal) {
      const content: object[] = [];
      if (req.image) content.push({ type: 'image', source: { type: 'base64', media_type: req.image.mimeType, data: req.image.data } });
      content.push({ type: 'text', text: req.json ? `${req.prompt}\n\nReply with the JSON object only.` : req.prompt });
      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: req.maxTokens, system: req.system, messages: [{ role: 'user', content }] }),
      });
      if (!res.ok) throw new Error(`${this.name}: ${await readError(res)}`);
      const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
      const text = (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
      if (!text.trim()) throw new Error(`${this.name}: empty answer`);
      return text;
    },
  };
}

// Providers in the order to try them, from the environment:
//   GEMINI_API_KEY + GEMINI_MODELS (comma-separated, first = preferred)
//   ANTHROPIC_API_KEY + CLAUDE_MODEL (the backup)
//   GEMINI_BASE_URL / ANTHROPIC_BASE_URL: only to point at a proxy or a local test stand-in
// Stable Flash first (the newest one is often "high demand" = 503), newest Flash, then Flash-Lite.
export const DEFAULT_GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
export const DEFAULT_CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

export function providersFromEnv(env: NodeJS.ProcessEnv = process.env): Provider[] {
  const list: Provider[] = [];
  const geminiKey = env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    const models = (env.GEMINI_MODELS || DEFAULT_GEMINI_MODELS.join(','))
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    for (const model of models) list.push(geminiProvider(geminiKey, model, env.GEMINI_BASE_URL || undefined));
  }
  const claudeKey = env.ANTHROPIC_API_KEY?.trim();
  if (claudeKey) list.push(claudeProvider(claudeKey, env.CLAUDE_MODEL?.trim() || DEFAULT_CLAUDE_MODEL, env.ANTHROPIC_BASE_URL || undefined));
  return list;
}
