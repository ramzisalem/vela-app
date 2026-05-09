/**
 * Editorial delights — facts and data viz tied to answers (illustrative, not clinical).
 * Full `viz` packs ring + sparkline + heat + bars; `delightVizSlice` picks ONE layer per screen.
 */
import type { Question, QuestionId } from '@/core/onboarding/questions';
import type { MilestoneAfterSection } from '@/core/onboarding/sectionCopy';
import type { DelightVizSpec } from '@/core/onboarding/delightTypes';
import type { Gender } from '@/types';

export type AnswerMap = Partial<Record<QuestionId, unknown>>;

export interface LiveDelight {
  headline: string;
  fact: string;
  viz: DelightVizSpec;
}

function sparkLoft(n: number, spread = 0.12): number[] {
  const base = [0.32, 0.38, 0.44, 0.41, 0.48, 0.52, 0.55, 0.58, 0.62, 0.66, 0.7];
  return base.map((v, i) => Math.min(1, Math.max(0.08, v + spread * Math.sin((i + n) * 0.55))));
}

function heatWeek(seed: number): number[] {
  const out: number[] = [];
  let s = seed;
  for (let i = 0; i < 7; i++) {
    s = (s * 1664525 + 1013904223) % 0x10000;
    out.push(0.25 + (s / 0x10000) * 0.7);
  }
  return out;
}

function ringFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 0.45 + (h % 45) / 100;
}

/** Short line before auto-advance on select. */
export function getSelectOptionCelebration(questionId: QuestionId, optionValue: string): string | null {
  switch (questionId) {
    case 'q1_gender': {
      const m: Record<string, string> = {
        man: 'Symmetry norms lean on broad male reference data. Your line stays yours.',
        woman: 'Female-reference curves anchor balance and proportion for you.',
        non_binary: 'Neutral scoring so nothing is squeezed into a single mold.',
        prefer_not_to_say: 'We skip gendered defaults and keep calibration as fair as we can.',
      };
      return m[optionValue] ?? null;
    }
    case 'q4_skin_type': {
      const skin: Record<string, string> = {
        I: 'Very sun-sensitive skin often reads redder on camera. We dial UV sensitivity down for you.',
        II: 'Light skin that burns fast gets a gentler UV-stress read in scores.',
        III: 'Middle Fitzpatrick is our busiest reference band for balanced readouts.',
        IV: 'Olive and brown tones carry pigment differently. We avoid over-calling redness.',
        V: 'Deep melanin shifts how we frame contrast and spot detail.',
        VI: 'Rich pigment means glow and texture lead the story in summaries.',
      };
      return skin[optionValue] ?? 'Sun response steers how we read pigment shifts over time.';
    }
    case 'q11_primary_goal': {
      const m: Record<string, string> = {
        baseline_track: 'A steady baseline makes week-to-week deltas easier to spot.',
        address_skin: 'Texture and tone get more weight in your feed.',
        optimize_routine: 'Small wins before big routine overhauls.',
        monitor_treatment: 'Before-and-after style deltas surface where they help.',
        understand_aging: 'Gradual structural trends, not single-day noise.',
        objective_view: 'Plain language and numbers forward.',
      };
      return m[optionValue] ?? null;
    }
    case 'q13_routine_intensity':
      return 'Routine depth changes how aggressive our product nudges feel.';
    case 'q15_budget':
      return 'Budget bands steer us toward realistic routine tiers, not fantasy shelves.';
    case 'q16_spf_habit':
      return 'SPF cadence changes how we interpret UV-sensitive signals.';
    case 'q20_exercise':
      return 'Movement quietly shapes circulation and stress load between scans.';
    case 'q21_diet':
      return 'Diet pattern is context when texture or oiliness swings.';
    case 'q22_water':
      return 'Hydration habits show up in plumpness and fine-line contrast.';
    case 'q23_sleep':
      return 'Sleep depth often tracks under-eye and texture stability.';
    case 'q24_stress':
      return 'Stress context keeps us from dramatizing a rough skin week.';
    case 'q25_substances':
      return 'We use this lightly, mostly to explain noisy weeks without blame.';
    case 'q29_notifications':
      return 'Reminder style is locked. We will keep prompts calm.';
    default:
      return null;
  }
}

function selectDelight(id: QuestionId, v: string): LiveDelight | null {
  const r = ringFromString(v);
  const spark = sparkLoft(v.length * 7 + v.charCodeAt(0), 0.14);
  const heat = heatWeek(v.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const barsBase = [0.4, 0.52, 0.48, 0.62, 0.55, 0.58, 0.45];

  const pack = (headline: string, fact: string, barTweak?: number[]): LiveDelight => ({
    headline,
    fact,
    viz: {
      ring: { fraction: r, caption: 'Personal fit' },
      sparkline: spark,
      heatStrip: heat,
      bars: barTweak ?? barsBase,
    },
  });

  switch (id) {
    case 'q1_gender': {
      const fact =
        v === 'man'
          ? 'Reference curves skew male for symmetry baselines.'
          : v === 'woman'
            ? 'Reference curves skew female for proportion balance.'
            : 'Neutral calibration path for your scores.';
      return pack('Identity signal', fact, [0.55, 0.48, 0.62, 0.5, 0.58, 0.52, 0.46]);
    }
    case 'q1b_framework':
      return pack(
        'Scoring frame',
        v === 'masculine'
          ? 'Structured angles weighted a touch higher in summaries.'
          : v === 'feminine'
            ? 'Soft geometry and balance weighted in your language.'
            : 'Neutral blend across structure and softness.',
      );
    case 'q3_ethnicity':
      return pack(
        'Calibration note',
        'We use background only to keep fairness across groups, never to stereotype.',
        [0.48, 0.55, 0.5, 0.6, 0.52, 0.57, 0.49],
      );
    case 'q4_skin_type':
      return pack(
        'UV fingerprint',
        'Fitzpatrick type steers how aggressively we read pinkness versus pigment.',
        [0.42, 0.58, 0.52, 0.68, 0.55, 0.5, 0.62],
      );
    case 'q5_hair':
      return pack('Hair context', 'Hair mass changes how we frame upper-face balance in 2D.');
    case 'q6_facial_hair':
      return pack('Lower face frame', 'Facial hair masks or sharpens jaw signals in captures.');
    case 'q7_face_shape':
      return pack('Silhouette', 'Face shape nudges how we talk about width versus length.');
    case 'q11_primary_goal':
      return pack('North star', 'Your primary goal is the headline whenever we compress insight.');
    case 'q13_routine_intensity':
      return pack('Effort band', 'Intensity sets how dense routine suggestions can get.');
    case 'q14_time_available':
      return pack('Minutes budget', 'We will not stack steps you cannot realistically run.');
    case 'q15_budget':
      return pack('Spend posture', 'We bias recommendations toward tiers you signaled.');
    case 'q16_spf_habit':
      return pack('Sun shielding', 'SPF habits re-weight UV-sensitive features in the model.');
    case 'q19_recent_procedures':
      return pack('Clinical context', 'Recent tweaks explain short-term swelling or redness swings.');
    case 'q20_exercise':
      return pack('Movement', 'Cardio load shows up as tone and under-eye stability over time.');
    case 'q21_diet':
      return pack('Fuel pattern', 'Diet is never a grade, only a caption when texture shifts.');
    case 'q22_water':
      return pack('Hydration', 'Water intake nudges how we read plumpness versus creasing.');
    case 'q23_sleep':
      return pack('Recovery hours', 'Sleep shapes recovery language in weekly recaps.');
    case 'q24_stress':
      return pack('Load index', 'Stress helps excuse a temporary dip without ignoring real change.');
    case 'q25_substances':
      return pack('Lifestyle factors', 'Used quietly to contextualize, not to moralize.');
    case 'q26_hormonal':
      return pack('Hormone context', 'Cycles and shifts inform how we phrase volatile weeks.');
    case 'q29_notifications':
      return pack('Ping style', 'We will match reminder tone to your choice here.');
    default:
      return pack('Locked in', 'This answer flows into your personal calibration map.');
  }
}

export function getQuestionLiveDelight(question: Question, value: unknown): LiveDelight | null {
  if (question.type === 'select' && typeof value === 'string' && value.length > 0) {
    return selectDelight(question.id, value);
  }

  if (question.id === 'q2_age' && question.type === 'number') {
    const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
    if (n == null) return null;
    const bracket =
      n < 25 ? 'early twenties' : n < 35 ? 'late twenties to mid-thirties' : n < 50 ? 'mid-life' : 'mature';
    const frac = Math.min(1, Math.max(0.15, (n - 13) / 87));
    return {
      headline: 'Decade anchor',
      fact: `Trends for people in their ${bracket} stay separate from teen baselines.`,
      viz: {
        ring: { fraction: frac, caption: 'Life stage' },
        sparkline: sparkLoft(n, 0.18),
        heatStrip: heatWeek(n),
        bars: [0.35, 0.55, n < 30 ? 0.85 : n < 45 ? 0.72 : 0.66, 0.48, 0.4, 0.52, 0.44],
      },
    };
  }

  if (question.type === 'multiselect' && Array.isArray(value) && value.length > 0) {
    const n = value.length;
    const max = question.maxSelections ?? 6;
    const intensity = Math.min(1, n / Math.max(1, max));
    return {
      headline: n === 1 ? 'One signal' : `${n} parallel tracks`,
      fact:
        question.id === 'q8_skin_conditions'
          ? 'More conditions mean we watch a wider lattice when something spikes.'
          : question.id === 'q10_appearance_goals'
            ? 'Each goal adds a lane in your future recap headlines.'
            : question.id === 'q12_ideal_outcomes'
              ? 'Outcomes stack into how we phrase wins and tradeoffs.'
              : question.id === 'q28_focus_regions'
                ? 'Regions you name get brighter callouts in crop views.'
                : 'We will cross-check these picks when summarizing scan deltas.',
      viz: {
        ring: { fraction: 0.42 + intensity * 0.45, caption: 'Focus density' },
        sparkline: sparkLoft(n * 11, 0.2),
        heatStrip: heatWeek(value.join('').length),
        bars: [
          intensity * 0.88,
          intensity * 0.72,
          intensity * 0.8,
          0.38 + intensity * 0.2,
          0.42,
          0.48,
          0.52,
        ],
      },
    };
  }

  if (question.type === 'number' && question.id === 'q9_self_perceived_age' && typeof value === 'number') {
    const n = Math.round(value);
    return {
      headline: 'Felt age',
      fact: 'Stored beside calendar age to catch mirror versus math gaps over quarters.',
      viz: {
        ring: { fraction: Math.min(1, Math.max(0.2, n / 80)), caption: 'Self read' },
        sparkline: sparkLoft(n + 3, 0.15),
        heatStrip: heatWeek(n * 3),
        bars: [0.5, 0.48, 0.55, 0.52, 0.5, 0.54, 0.51],
      },
    };
  }

  if (question.type === 'text' && typeof value === 'string') {
    const t = value.trim();
    if (t.length < 8) return null;
    if (question.id === 'q27_self_perception') {
      return {
        headline: 'Your voice',
        fact: 'We echo this tone when automation would otherwise sound cold.',
        viz: {
          ring: { fraction: Math.min(0.95, 0.35 + t.length / 400), caption: 'Voice depth' },
          sparkline: sparkLoft(t.length, 0.22),
          heatStrip: heatWeek(t.length),
          bars: [0.52, 0.5, 0.58, 0.55, 0.5, 0.53, 0.56],
        },
      };
    }
    if (question.id === 'q17_current_products') {
      return {
        headline: 'Routine shelf',
        fact: 'We map what you named into future routine tiles without judging brands.',
        viz: {
          ring: { fraction: Math.min(0.92, 0.3 + t.length / 500), caption: 'Detail level' },
          sparkline: sparkLoft(t.length + 1, 0.17),
          heatStrip: heatWeek(t.length * 2),
          bars: [0.45, 0.55, 0.5, 0.62, 0.58, 0.52, 0.48],
        },
      };
    }
    if (question.id === 'q18_active_treatments') {
      return {
        headline: 'Active care',
        fact: 'Treatments on file help us avoid tone-deaf tips that clash with what you already run.',
        viz: {
          ring: { fraction: Math.min(0.9, 0.4 + t.length / 350), caption: 'Clinical load' },
          sparkline: sparkLoft(t.length + 3, 0.2),
          heatStrip: heatWeek(t.length * 3 + 1),
          bars: [0.48, 0.58, 0.52, 0.65, 0.55, 0.5, 0.6],
        },
      };
    }
  }

  if (question.type === 'time' && question.id === 'q30_checkin' && value && typeof value === 'object' && 'hour' in value) {
    const hour = (value as { hour: number }).hour;
    const norm = hour / 24;
    return {
      headline: 'Check-in orbit',
      fact: 'We cluster reminders around this orbit without nagging you overnight.',
      viz: {
        ring: { fraction: 0.35 + norm * 0.55, caption: 'Daily rhythm' },
        sparkline: Array.from({ length: 12 }, (_, i) => 0.3 + 0.45 * Math.sin((i / 11) * Math.PI + norm * 2)),
        heatStrip: heatWeek(hour * 7),
        bars: [0.4, 0.45, 0.5, 0.55 + norm * 0.2, 0.5, 0.48, 0.52],
      },
    };
  }

  return null;
}

export interface MilestoneDelight {
  facts: string[];
  viz: DelightVizSpec;
}

export function getMilestoneDelight(section: MilestoneAfterSection, answers: AnswerMap): MilestoneDelight | null {
  const facts: string[] = [];
  const baseBars = [0.48, 0.58, 0.52, 0.66, 0.55, 0.5, 0.6];

  if (section === 'A') {
    const g = answers.q1_gender as Gender | undefined;
    const age = answers.q2_age as number | undefined;
    if (typeof age === 'number' && Number.isFinite(age)) {
      facts.push(`Age ${age} anchors population curves.`);
    }
    if (g === 'man' || g === 'woman') facts.push('Scoring references lean on the library you picked.');
    else if (g === 'non_binary' || g === 'prefer_not_to_say') facts.push('Neutral path is locked for comparisons.');
    if (answers.q4_skin_type) facts.push('Sun response profile is saved for tone readouts.');
    facts.push('Next up is what you want to watch on your skin.');
    return {
      facts: facts.slice(0, 5),
      viz: {
        ring: { fraction: 0.62, caption: 'Profile depth' },
        sparkline: sparkLoft(31, 0.16),
        heatStrip: heatWeek(42),
        bars: [0.55, 0.68, 0.52, 0.72, 0.6, 0.58, 0.64],
      },
    };
  }

  if (section === 'B') {
    const goals = answers.q10_appearance_goals as string[] | undefined;
    if (goals?.length) facts.push(`${goals.length} goals are now in your orbit.`);
    if (answers.q11_primary_goal) facts.push('Primary goal leads when space is tight.');
    facts.push('Routine recommendations will respect time and budget soon.');
    return {
      facts: facts.slice(0, 5),
      viz: {
        ring: { fraction: 0.7, caption: 'Intent load' },
        sparkline: sparkLoft(88, 0.2),
        heatStrip: heatWeek(17),
        bars: baseBars.map((b) => Math.min(1, b + 0.08)),
      },
    };
  }

  if (section === 'D') {
    if (answers.q23_sleep) facts.push('Sleep band logged for under-eye context.');
    if (answers.q24_stress) facts.push('Stress band logged for volatile weeks.');
    facts.push('Lifestyle stays on-device until you sync.');
    return {
      facts: facts.slice(0, 5),
      viz: {
        ring: { fraction: 0.58, caption: 'Life rhythm' },
        sparkline: sparkLoft(203, 0.18),
        heatStrip: heatWeek(9),
        bars: [0.46, 0.62, 0.55, 0.68, 0.52, 0.6, 0.54],
      },
    };
  }

  if (section === 'E') {
    const regions = answers.q28_focus_regions as string[] | undefined;
    if (regions?.length) facts.push(`${regions.length} focus zones will glow brighter in recaps.`);
    facts.push('Baseline scan is the next real checkpoint.');
    return {
      facts: facts.slice(0, 5),
      viz: {
        ring: { fraction: 0.82, caption: 'Journey' },
        sparkline: sparkLoft(404, 0.14),
        heatStrip: [0.35, 0.48, 0.55, 0.62, 0.7, 0.78, 0.85],
        bars: [0.52, 0.58, 0.64, 0.7, 0.66, 0.72, 0.68],
      },
    };
  }

  return null;
}
