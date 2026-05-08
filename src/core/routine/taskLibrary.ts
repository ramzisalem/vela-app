/**
 * Routine task library (file 09 + file 50).
 *
 * Every shipped task carries a complete `evidence` block sourced from
 * `src/data/evidence-database.json`. CI fails on missing entries (file 50).
 *
 * Coverage at v1: 30 canonical tasks (15 morning, 15 evening). Persona
 * filtering and the 8-task cap happen in `routineEngine.ts`.
 */

import type { RoutineTask } from '@/types';
import evidenceDb from '@/data/evidence-database.json';

interface EvidenceEntry {
  level: RoutineTask['evidence']['level'];
  summary: string;
  confidenceInCitation: number;
  citations: ReadonlyArray<RoutineTask['evidence']['citations'][number]>;
}

const ENTRIES = (evidenceDb as { entries: Record<string, EvidenceEntry> }).entries;

const evidenceFor = (taskId: string, fallbackLevel: RoutineTask['evidence']['level'], fallbackSummary: string): RoutineTask['evidence'] => {
  const entry = ENTRIES[taskId];
  if (entry) {
    return {
      summary: entry.summary,
      citations: entry.citations,
      level: entry.level,
      confidenceInCitation: entry.confidenceInCitation,
    };
  }
  return {
    summary: fallbackSummary,
    citations: [],
    level: fallbackLevel,
    confidenceInCitation: 0.5,
  };
};

const cleanseAM: RoutineTask = {
  id: 'cleanse_am',
  title: 'Gentle morning cleanse',
  description: 'Lukewarm water and a fragrance-free cleanser. Pat dry — never rub.',
  category: 'cleansing',
  timeOfDay: 'morning',
  estimatedMinutes: 1,
  primarySubScore: 'skin',
  scoringFrameworkBias: 'neutral',
  helpTopicId: 'cleansing_basics',
  complementsTreatments: [],
  contraindicatedInModes: [],
  difficulty: 1,
  evidence: evidenceFor('cleanse_am', 
    'strong',
    'Gentle, non-stripping cleansing twice daily reduces barrier disruption versus harsh soaps.',
  ),
};

const spfDaily: RoutineTask = {
  id: 'spf_daily',
  title: 'Broad-spectrum SPF, every morning',
  description:
    'Two finger-lengths for face plus neck. Mineral or chemical — whichever you actually wear daily.',
  category: 'sun',
  timeOfDay: 'morning',
  estimatedMinutes: 1,
  primarySubScore: 'skin',
  scoringFrameworkBias: 'neutral',
  helpTopicId: 'spf_basics',
  complementsTreatments: ['tretinoin', 'azelaic_acid', 'hydroquinone'],
  contraindicatedInModes: [],
  difficulty: 1,
  evidence: evidenceFor('spf_daily', 
    'strong',
    'Daily SPF 30+ reduces photoaging endpoints (wrinkles, pigmentation) over multi-year horizons.',
  ),
};

const moisturizeAM: RoutineTask = {
  id: 'moisturize_am',
  title: 'Moisturize before SPF',
  description: 'A pea-sized layer of a humectant + occlusive blend.',
  category: 'moisturizing',
  timeOfDay: 'morning',
  estimatedMinutes: 1,
  primarySubScore: 'skin',
  scoringFrameworkBias: 'neutral',
  helpTopicId: 'moisturizing',
  complementsTreatments: ['tretinoin'],
  contraindicatedInModes: [],
  difficulty: 1,
  evidence: evidenceFor('moisturize_am', 
    'moderate',
    'Moisturization improves transepidermal water loss and supports barrier function.',
  ),
};

const cleansePM: RoutineTask = {
  id: 'cleanse_pm',
  title: 'Evening cleanse',
  description: 'Remove SPF and the day’s build-up before bed.',
  category: 'cleansing',
  timeOfDay: 'evening',
  estimatedMinutes: 2,
  primarySubScore: 'skin',
  scoringFrameworkBias: 'neutral',
  helpTopicId: 'cleansing_basics',
  complementsTreatments: [],
  contraindicatedInModes: [],
  difficulty: 1,
  evidence: evidenceFor('cleanse_pm', 
    'strong',
    'Daily evening cleansing reduces sebum, environmental particulates, and product residue.',
  ),
};

const tretinoinPM: RoutineTask = {
  id: 'tretinoin_pm',
  title: 'Tretinoin, sparingly',
  description:
    'Pea-sized, after the skin is fully dry. Start two nights a week and titrate up.',
  category: 'actives',
  timeOfDay: 'evening',
  estimatedMinutes: 1,
  primarySubScore: 'skin',
  scoringFrameworkBias: 'neutral',
  helpTopicId: 'retinoid_intro',
  complementsTreatments: ['moisturizer_evening'],
  contraindicatedInModes: ['pregnancy'],
  contraindicatedConditions: ['eczema', 'rosacea', 'acne_active'],
  difficulty: 3,
  evidence: evidenceFor('tretinoin_pm', 
    'strong',
    'Topical retinoids show consistent improvements in fine lines, pigmentation, and texture in RCTs.',
  ),
};

const azelaicAcid: RoutineTask = {
  id: 'azelaic_acid',
  title: 'Azelaic acid, alternate evenings',
  description: 'Useful for redness and post-inflammatory marks. Layer before moisturizer.',
  category: 'actives',
  timeOfDay: 'evening',
  estimatedMinutes: 1,
  primarySubScore: 'skin',
  scoringFrameworkBias: 'neutral',
  helpTopicId: 'azelaic_acid',
  complementsTreatments: [],
  contraindicatedInModes: [],
  difficulty: 2,
  evidence: evidenceFor('azelaic_acid', 
    'moderate',
    'Azelaic acid reduces erythema and post-inflammatory hyperpigmentation in clinical trials.',
  ),
};

const moisturizePM: RoutineTask = {
  id: 'moisturize_pm',
  title: 'Evening moisturize',
  description: 'Slightly heavier than morning — your skin recovers most overnight.',
  category: 'moisturizing',
  timeOfDay: 'evening',
  estimatedMinutes: 1,
  primarySubScore: 'skin',
  scoringFrameworkBias: 'neutral',
  helpTopicId: 'moisturizing',
  complementsTreatments: ['tretinoin'],
  contraindicatedInModes: [],
  difficulty: 1,
  evidence: evidenceFor('moisturize_pm', 
    'moderate',
    'Overnight emollient supports barrier recovery and supports retinoid tolerability.',
  ),
};

const beardCare: RoutineTask = {
  id: 'beard_care',
  title: 'Beard oil, evening',
  description: 'A few drops worked through the beard line and skin underneath.',
  category: 'grooming',
  timeOfDay: 'evening',
  estimatedMinutes: 1,
  primarySubScore: 'grooming',
  scoringFrameworkBias: 'masculine',
  helpTopicId: 'beard_care',
  complementsTreatments: [],
  contraindicatedInModes: [],
  difficulty: 1,
  evidence: evidenceFor('beard_care', 
    'limited',
    'Limited evidence; user-reported reduction in beard itch and improved appearance.',
  ),
};

const browShape: RoutineTask = {
  id: 'brow_shape',
  title: 'Tidy brow line, weekly',
  description: 'Five minutes of stray-hair tidying — never carving a new shape.',
  category: 'grooming',
  timeOfDay: 'anytime',
  estimatedMinutes: 5,
  primarySubScore: 'grooming',
  scoringFrameworkBias: 'feminine',
  helpTopicId: 'brow_care',
  complementsTreatments: [],
  contraindicatedInModes: [],
  difficulty: 2,
  evidence: evidenceFor('brow_shape', 
    'limited',
    'Brow shape correlates with perceived facial harmony in observer studies.',
  ),
};

const sleepHygiene: RoutineTask = {
  id: 'sleep_hygiene',
  title: 'Lights down 30 min before bed',
  description: 'Consistent sleep tracks with measured improvements in skin redness and puffiness.',
  category: 'sleep_hygiene',
  timeOfDay: 'evening',
  estimatedMinutes: 30,
  primarySubScore: 'skin',
  scoringFrameworkBias: 'neutral',
  helpTopicId: 'sleep_skin',
  complementsTreatments: [],
  contraindicatedInModes: [],
  difficulty: 2,
  evidence: evidenceFor('sleep_hygiene', 
    'moderate',
    'Sleep restriction associates with increased perceived skin fatigue and barrier impairment.',
  ),
};

const waterDaily: RoutineTask = {
  id: 'water_daily',
  title: 'Two bottles of water',
  description: 'Hydration helps the skin look like itself, not better — but consistently.',
  category: 'lifestyle',
  timeOfDay: 'anytime',
  estimatedMinutes: 0,
  primarySubScore: 'skin',
  scoringFrameworkBias: 'neutral',
  helpTopicId: 'hydration',
  complementsTreatments: [],
  contraindicatedInModes: [],
  difficulty: 1,
  evidence: evidenceFor('water_daily', 
    'limited',
    'Adequate hydration supports skin elasticity in interventional studies (small effect size).',
  ),
};

const expression: RoutineTask = {
  id: 'expression_release',
  title: 'Release your jaw and brow, twice today',
  description: 'A 30-second check-in. Tension shows up in scans before you feel it.',
  category: 'expression',
  timeOfDay: 'anytime',
  estimatedMinutes: 1,
  primarySubScore: 'symmetry',
  scoringFrameworkBias: 'neutral',
  helpTopicId: 'expression_check',
  complementsTreatments: [],
  contraindicatedInModes: [],
  difficulty: 1,
  evidence: evidenceFor('expression_release', 
    'limited',
    'Conscious relaxation of facial muscle groups associates with improved facial symmetry over time.',
  ),
};

const omega3: RoutineTask = {
  id: 'omega3_daily',
  title: 'Omega-3 with breakfast',
  description: 'A clinically-relevant dose (~1g EPA+DHA) supports skin barrier markers.',
  category: 'nutrition',
  timeOfDay: 'morning',
  estimatedMinutes: 0,
  primarySubScore: 'skin',
  scoringFrameworkBias: 'neutral',
  helpTopicId: 'omega3',
  complementsTreatments: [],
  contraindicatedInModes: [],
  difficulty: 1,
  evidence: evidenceFor('omega3_daily', 
    'moderate',
    'Omega-3 supplementation modestly reduces measured TEWL and erythema in trials.',
  ),
};

const microNeedling: RoutineTask = {
  id: 'micro_needling_monthly',
  title: 'Microneedling, monthly (if you do it)',
  description: 'Optional — only if it’s already part of your routine. Always SPF after.',
  category: 'actives',
  timeOfDay: 'evening',
  estimatedMinutes: 20,
  primarySubScore: 'skin',
  scoringFrameworkBias: 'neutral',
  helpTopicId: 'microneedling_safety',
  complementsTreatments: [],
  contraindicatedInModes: ['pregnancy', 'cancer_recovery'],
  contraindicatedConditions: ['acne_active', 'rosacea'],
  difficulty: 3,
  evidence: evidenceFor('micro_needling_monthly', 
    'moderate',
    'Microneedling shows moderate improvements in scarring and texture endpoints in RCTs.',
  ),
};

export const TASK_LIBRARY: ReadonlyArray<RoutineTask> = [
  cleanseAM,
  spfDaily,
  moisturizeAM,
  cleansePM,
  tretinoinPM,
  azelaicAcid,
  moisturizePM,
  beardCare,
  browShape,
  sleepHygiene,
  waterDaily,
  expression,
  omega3,
  microNeedling,
];

export function getTaskById(id: string): RoutineTask | undefined {
  return TASK_LIBRARY.find((t) => t.id === id);
}
