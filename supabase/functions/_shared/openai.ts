/**
 * OpenAI wrapper for Edge Functions (Chat Completions).
 *
 * Env:
 *   OPENAI_API_KEY — required
 *   MODEL_FAST / MODEL_QUALITY — optional overrides (OpenAI model ids)
 *
 * Optional `app_config` keys `model.fast` / `model.quality` are not read here
 * (no DB round-trip in hot path); set the same values via Edge secrets.
 */
const OPENAI_API = 'https://api.openai.com/v1/chat/completions';

const FALLBACKS_FAST = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
const FALLBACKS_QUALITY = ['gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini'];

export type ChatUserContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: ChatUserContent;
}

export interface OpenAiCallOptions {
  model: 'fast' | 'quality';
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Parse assistant content as JSON (adds response_format + strips fences). */
  jsonOnly?: boolean;
}

export interface OpenAiCallResult<T = unknown> {
  parsed: T;
  raw: unknown;
  modelUsed: string;
  fellBackFrom?: string;
}

async function readModel(modelKey: 'fast' | 'quality'): Promise<string | undefined> {
  const envValue = Deno.env.get(modelKey === 'fast' ? 'MODEL_FAST' : 'MODEL_QUALITY');
  if (envValue) return envValue;
  return undefined;
}

export async function callOpenAI<T = unknown>(opts: OpenAiCallOptions): Promise<OpenAiCallResult<T>> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const configured = await readModel(opts.model);
  const chain = configured
    ? [configured, ...(opts.model === 'fast' ? FALLBACKS_FAST : FALLBACKS_QUALITY)]
    : opts.model === 'fast'
      ? FALLBACKS_FAST
      : FALLBACKS_QUALITY;

  let lastErr: Error | null = null;
  let attempted: string | undefined;
  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    if (!model) continue;
    attempted = attempted ?? model;
    try {
      const body: Record<string, unknown> = {
        model,
        messages: opts.messages,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.4,
      };
      if (opts.jsonOnly) {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetch(OPENAI_API, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.text();
        if (
          res.status === 404 ||
          (/model/i.test(errBody) && /not found|invalid|does not exist|deprecated/i.test(errBody))
        ) {
          lastErr = new Error(`model ${model} unavailable: ${errBody}`);
          continue;
        }
        throw new Error(`OpenAI error ${res.status}: ${errBody}`);
      }
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const text = (data?.choices?.[0]?.message?.content ?? '').trim();
      const trimmed = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      let parsed: unknown = trimmed;
      if (opts.jsonOnly) {
        parsed = JSON.parse(trimmed);
      }
      return {
        parsed: parsed as T,
        raw: data,
        modelUsed: model,
        fellBackFrom: i > 0 && attempted !== model ? attempted : undefined,
      };
    } catch (e) {
      lastErr = e as Error;
    }
  }
  throw lastErr ?? new Error('All OpenAI models failed');
}
