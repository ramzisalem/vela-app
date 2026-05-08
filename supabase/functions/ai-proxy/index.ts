/**
 * ai-proxy Edge Function (file 03 + file 06).
 *
 * Single proxy for ALL OpenAI calls. Never expose OPENAI_API_KEY to the
 * client. Request types: score_explanation | routine_generation |
 * grooming_assessment | skin_assessment | personalized_copy | micro_payoff |
 * weekly_reveal | health_insight | treatment_insight | wrapped_copy.
 *
 * All responses are JSON-only (file 06). Uses Chat Completions with
 * `response_format: json_object` when applicable.
 */
// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, preflight } from '../_shared/cors.ts';
import { getAuthedUser } from '../_shared/auth.ts';
import { isRateLimited } from '../_shared/rate-limit.ts';
import { callOpenAI, type ChatUserContent } from '../_shared/openai.ts';

interface ProxyRequest {
  type:
    | 'score_explanation'
    | 'routine_generation'
    | 'grooming_assessment'
    | 'skin_assessment'
    | 'personalized_copy'
    | 'micro_payoff'
    | 'weekly_reveal'
    | 'health_insight'
    | 'treatment_insight'
    | 'wrapped_copy'
    | 'forecast_copy'
    | 'aging_context_guide'
    | 'yoy_insight'
    | 'experiment_verdict_copy'
    | 'diary_weekly_summary';
  payload: Record<string, unknown>;
  /** Life-stage modes the user has opted in to share with AI (file 48). */
  lifeStageContext?: string[];
}

const SYSTEM_PROMPTS: Record<ProxyRequest['type'], string> = {
  score_explanation:
    "You are Vela's score explainer. You receive numeric metrics and the user's prior week. " +
    'Return JSON with `summary` (1-2 sentences, sentence case, no exclamation marks, no medical claims, no digits) ' +
    "and `subScores` (object keyed by sub-score with a one-line explanation). Forbidden words: amazing, incredible, transformation, glow, miracle, breakthrough, radiant, fight, combat, defeat, reverse, restore, regain, anti-aging, problem area, youthful. Score declines should be framed neutrally — never as failure or worry.",
  routine_generation:
    "You are Vela's routine planner. Pick 4-8 task IDs from the allowlist. " +
    'Return JSON: `{ taskIds: string[], note: string }` where note is one short paragraph in sentence case. ' +
    'Honor the user\'s scoring framework, contraindications, and life-stage context. No exclamation marks.',
  grooming_assessment:
    "Assess grooming from the provided image. Return JSON `{ score: 0..100, qualityFlag: 'good'|'caveat'|'rejected', notes: string }`.",
  skin_assessment:
    "Assess skin from the provided image. Return JSON `{ score: 0..100, qualityFlag: 'good'|'caveat'|'rejected', clarity: 0..100, redness: 0..100, notes: string }`.",
  personalized_copy:
    "Generate 1-2 sentences of personalized in-app copy in Vela's voice. Return JSON `{ text: string }`.",
  micro_payoff:
    "Generate a one-sentence micro-payoff for an onboarding question. Return JSON `{ text: string }`.",
  weekly_reveal:
    "Generate the weekly reveal headline. Return JSON `{ headline: string, body: string }`.",
  health_insight:
    "Given { faceMetric, healthSignal, pearsonR, sampleSize }, return JSON `{ phrasing: string, confidence: 'low'|'medium'|'high' }`. Never mention raw HealthKit values.",
  treatment_insight:
    "Given a treatment timeline summary, return JSON `{ insight: string }`. Use neutral language.",
  wrapped_copy:
    "Generate the monthly Wrapped narrative. Return JSON `{ slides: Array<{ title: string, body: string }> }`.",
  forecast_copy:
    "You write copy for the day-7 trial forecast card (file 41). Return JSON " +
    "`{ headerLine: string, patternHypothesis: string, footerActionLine: string }`. " +
    "headerLine: ≤8 words, no exclamation marks, no outcome guarantees. " +
    "patternHypothesis: one line ≤22 words; if HealthKit connected, frame as 'tends to track with' or 'may correlate with', " +
    "ending in 'soon', 'sharper', or 'clearer'. footerActionLine: ≤8 words inviting the user to keep going; " +
    "must NOT use 'subscribe', 'buy', 'sign up', or 'continue trial'. " +
    "Forbidden everywhere: glow, transformation, amazing, incredible, best version, any number, any guarantee.",
  aging_context_guide:
    "You write a single short paragraph (60-80 words) explaining what tends to happen with a face metric across someone's decade " +
    "and what factors most influence it. Return JSON `{ text: string }`. Vela voice: no urgency, no medical claims, " +
    "no judgment. Always close with: 'We track it because some people like to know. We don't think you should aim for any particular shape of curve.'",
  yoy_insight:
    "You write a single observation about a year-over-year pattern in a user's face data (file 45). " +
    "Return JSON `{ insight: string, shouldShow: boolean }`. " +
    "insight: ≤32 words, sentence case, calm and observational, never alarming. " +
    "If patterns repeat, name the repeat plainly. If they diverge, note the divergence and what's different. " +
    "If no pattern is meaningful, return shouldShow=false. No exclamations, no superlatives, no speculation.",
  experiment_verdict_copy:
    "You write the verdict copy for an N-of-1 experiment (file 44). Return JSON `{ copy: string }` with ≤120 words. " +
    "Always honest about small samples. Acknowledge confounders when present. Never recommend the change. " +
    "Never use 'incredible', 'amazing', 'transformation'. Hedge appropriately for the effect-size bucket: " +
    "meaningful → 'looks like a real effect'; small → 'a small lift, worth keeping if easy'; " +
    "none → 'probably nothing'; inverted → 'went the other way'; unclear → 'hard to say'.",
  diary_weekly_summary:
    "You write a one-line summary of a week's diary entries (file 37). Return JSON `{ oneLine: string }`. " +
    "≤120 chars, sentence case, no exclamations. Quote the user's own language sparingly when it fits.",
};

const JSON_ONLY_SUFFIX =
  '\n\nRespond with one JSON object only (no markdown code fences, no text before or after the object).';

function buildUserContent(
  type: ProxyRequest['type'],
  payload: Record<string, unknown>,
): ChatUserContent {
  const isImage = type === 'grooming_assessment' || type === 'skin_assessment';
  const b64 = payload['imageBase64'];
  if (isImage && typeof b64 === 'string' && b64.length > 0) {
    const { imageBase64: _omit, ...rest } = payload;
    return [
      { type: 'text', text: JSON.stringify(rest) },
      {
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${b64}` },
      },
    ];
  }
  return JSON.stringify(payload);
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    const pf = preflight(origin);
    if (pf) return pf;
  }
  const headers = corsHeaders(origin);

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers });
  }

  const { user, error: authErr } = await getAuthedUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: authErr ?? 'unauthorized' }), {
      status: 401,
      headers: { ...headers, 'content-type': 'application/json' },
    });
  }

  const limit = isRateLimited(user.id);
  if (!limit.ok) {
    return new Response(JSON.stringify({ error: 'rate_limited', retryAfter: limit.retryAfter }), {
      status: 429,
      headers: {
        ...headers,
        'content-type': 'application/json',
        'retry-after': String(limit.retryAfter ?? 60),
      },
    });
  }

  let body: ProxyRequest;
  try {
    body = (await req.json()) as ProxyRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...headers, 'content-type': 'application/json' },
    });
  }

  const system = SYSTEM_PROMPTS[body.type];
  if (!system) {
    return new Response(JSON.stringify({ error: 'unknown_type' }), {
      status: 400,
      headers: { ...headers, 'content-type': 'application/json' },
    });
  }

  const lifeStageBlock =
    Array.isArray(body.lifeStageContext) && body.lifeStageContext.length > 0
      ? `\n\nLIFE_STAGE_CONTEXT: The user has opted in to share that they are currently in: ${body.lifeStageContext.join(', ')}. ` +
        'Adjust tone with sensitivity. Never mention pregnancy outside pregnancy/postpartum context. Never claim medical knowledge.'
      : '';

  const isImageRequest = body.type === 'grooming_assessment' || body.type === 'skin_assessment';
  const useQuality = isImageRequest;

  if (isImageRequest) {
    const b64 = body.payload['imageBase64'];
    if (typeof b64 !== 'string' || !b64.length) {
      return new Response(
        JSON.stringify({ error: 'missing_image_base64', detail: 'grooming_assessment and skin_assessment require payload.imageBase64' }),
        { status: 400, headers: { ...headers, 'content-type': 'application/json' } },
      );
    }
  }

  const systemContent = system + lifeStageBlock + JSON_ONLY_SUFFIX;
  const userContent = buildUserContent(body.type, body.payload);

  try {
    const result = await callOpenAI({
      model: useQuality ? 'quality' : 'fast',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
      jsonOnly: true,
      maxTokens: useQuality ? 2048 : 1024,
      temperature: 0.4,
    });
    return new Response(
      JSON.stringify({
        ok: true,
        result: result.parsed,
        modelUsed: result.modelUsed,
        fellBackFrom: result.fellBackFrom,
      }),
      { headers: { ...headers, 'content-type': 'application/json' } },
    );
  } catch (e) {
    console.error('[ai-proxy] error', e);
    return new Response(
      JSON.stringify({ ok: false, error: 'ai_unavailable', detail: (e as Error).message }),
      { status: 502, headers: { ...headers, 'content-type': 'application/json' } },
    );
  }
});
