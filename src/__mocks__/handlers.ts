/**
 * MSW handlers for tests (file 26).
 *
 * The Edge Function contract is enforced through the actual fetch path —
 * stubbing the service module would mask shape regressions.
 */
import { http, HttpResponse } from 'msw';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';

interface AiProxyBody {
  type: string;
  payload?: Record<string, unknown>;
}

export const handlers = [
  http.post(`${SUPABASE_URL}/functions/v1/ai-proxy`, async ({ request }) => {
    const body = (await request.json()) as AiProxyBody;
    switch (body.type) {
      case 'score_explanation':
        return HttpResponse.json({
          ok: true,
          result: {
            summary: 'Skin clarity drove most of the change.',
            subScores: { skin: 'A bit clearer than last week.' },
          },
          modelUsed: 'mock',
        });
      case 'routine_generation':
        return HttpResponse.json({
          ok: true,
          result: {
            taskIds: ['cleanse_am', 'spf_daily', 'moisturize_am', 'cleanse_pm', 'moisturize_pm'],
            note: 'A simple, sustainable starting routine.',
          },
          modelUsed: 'mock',
        });
      case 'micro_payoff':
        return HttpResponse.json({
          ok: true,
          result: { text: 'Sun and sleep are the two levers most likely to move your score.' },
          modelUsed: 'mock',
        });
      case 'weekly_reveal':
        return HttpResponse.json({
          ok: true,
          result: {
            headline: 'Steady week',
            body: 'Your skin clarity is up; your symmetry held flat. Stick with the routine.',
          },
          modelUsed: 'mock',
        });
      case 'forecast_copy':
        return HttpResponse.json({
          ok: true,
          result: {
            headerLine: 'Your week four, if you stick around.',
            patternHypothesis:
              'Three weeks more data and the picture gets sharper.',
            footerActionLine: 'Continue with Vela',
          },
          modelUsed: 'mock',
        });
      case 'aging_context_guide':
        return HttpResponse.json({
          ok: true,
          result: {
            text:
              'Sun, sleep and stress show up here over time. Consistency does the heavy lifting. We track it because some people like to know. We don\'t think you should aim for any particular shape of curve.',
          },
          modelUsed: 'mock',
        });
      case 'grooming_assessment':
        return HttpResponse.json({
          ok: true,
          result: { score: 72, qualityFlag: 'good', notes: 'mock grooming' },
          modelUsed: 'mock',
        });
      case 'skin_assessment':
        return HttpResponse.json({
          ok: true,
          result: {
            score: 72,
            qualityFlag: 'good',
            clarity: 70,
            redness: 25,
            notes: 'mock skin',
          },
          modelUsed: 'mock',
        });
      case 'personalized_copy':
        return HttpResponse.json({
          ok: true,
          result: { text: 'Mock personalized line for this week.' },
          modelUsed: 'mock',
        });
      case 'yoy_insight':
        return HttpResponse.json({
          ok: true,
          result: { insight: 'Year over year you held steady on clarity.', shouldShow: true },
          modelUsed: 'mock',
        });
      case 'experiment_verdict_copy':
        return HttpResponse.json({
          ok: true,
          result: { copy: 'Not enough signal yet — keep logging for another week.' },
          modelUsed: 'mock',
        });
      case 'diary_weekly_summary':
        return HttpResponse.json({
          ok: true,
          result: { oneLine: 'Sleep and stress notes clustered mid-week.' },
          modelUsed: 'mock',
        });
      case 'health_insight':
        return HttpResponse.json({
          ok: true,
          result: { phrasing: 'Hydration may be helping perceived firmness.', confidence: 'low' },
          modelUsed: 'mock',
        });
      default:
        return new HttpResponse(null, { status: 404 });
    }
  }),

  // Account deletion edge function (file 18).
  http.post(`${SUPABASE_URL}/functions/v1/delete-account`, () => {
    return HttpResponse.json({ ok: true });
  }),

  // Trial extension edge function (file 41).
  http.post(`${SUPABASE_URL}/functions/v1/extend-trial`, () => {
    return HttpResponse.json({
      ok: true,
      grantedUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }),
];
