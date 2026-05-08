/**
 * Treatment library (file 34).
 *
 * Curated list of treatments Vela can track. Each entry is evidence-based
 * and copy-reviewed by Vela's medical advisor before launch. Updated via
 * remote config; the bundled list is the cold-start fallback.
 *
 * IMPORTANT: copy below is editorial — every change requires medical
 * advisor + brand-voice review.
 */
import type { TreatmentDefinition } from '@/types/treatment';

export const TREATMENT_LIBRARY: ReadonlyArray<TreatmentDefinition> = [
  {
    id: 'tretinoin',
    displayName: 'Tretinoin',
    category: 'topical',
    evidenceLevel: 'strong',
    expectedDurationWeeks: 24,
    primaryFaceMetrics: ['skinClarity', 'redness', 'eyeArea'],
    expectedProgression: [
      {
        weekNumber: 1,
        expected: 'Mild dryness or peeling. Stinging is common.',
        visualCue: 'getting-worse',
      },
      {
        weekNumber: 4,
        expected:
          'The retinization period — skin may break out or look rough. Stay the course.',
        visualCue: 'getting-worse',
      },
      {
        weekNumber: 8,
        expected: 'Texture starting to smooth. Redness easing.',
        visualCue: 'plateau',
      },
      {
        weekNumber: 12,
        expected: 'Most users see their first clear improvements around now.',
        visualCue: 'getting-better',
      },
      {
        weekNumber: 24,
        expected: 'Cumulative changes in fine lines and tone are visible.',
        visualCue: 'getting-better',
      },
    ],
    commonSideEffects: [
      { id: 'dryness', name: 'Dryness', severity: 'common' },
      { id: 'peeling', name: 'Peeling', severity: 'common' },
      { id: 'redness', name: 'Redness', severity: 'common' },
      { id: 'purging', name: 'Initial breakouts (purging)', severity: 'common' },
      {
        id: 'sun-sensitivity',
        name: 'Sun sensitivity',
        severity: 'common',
        whenToWorry:
          'Always pair with daily SPF \u2014 your skin is more vulnerable to UV.',
      },
    ],
    contraindications: ['pregnancy', 'breastfeeding'],
    educationCopy: {
      shortDescription: 'Topical retinoid. Strong evidence for texture and tone.',
      whatItIs:
        'Tretinoin is a prescription-strength vitamin A derivative used for acne, photo-aging, and skin texture. It works by speeding up cell turnover and prompting collagen production over time.',
      whatToExpect:
        'Worse before better. Most users see dryness and irritation in the first month, a possible flare-up around week four, and the first real improvements around week twelve. Cumulative results show up at six months.',
      consistencyNote:
        'Apply pea-sized amount at night. Always pair with morning SPF.',
    },
    requiresPrescription: true,
    genderRelevance: 'all',
  },
  {
    id: 'isotretinoin',
    displayName: 'Isotretinoin',
    category: 'oral',
    evidenceLevel: 'strong',
    expectedDurationWeeks: 24,
    primaryFaceMetrics: ['skinClarity', 'redness'],
    expectedProgression: [
      {
        weekNumber: 2,
        expected: 'Dry lips and skin start. Initial flare is possible.',
        visualCue: 'getting-worse',
      },
      {
        weekNumber: 8,
        expected: 'Active acne is reducing. Skin still feels dry.',
        visualCue: 'plateau',
      },
      {
        weekNumber: 16,
        expected: 'Most users see clear skin around this point.',
        visualCue: 'getting-better',
      },
      {
        weekNumber: 24,
        expected: 'Course typically completes around week 24. Skin is usually clear.',
        visualCue: 'getting-better',
      },
    ],
    commonSideEffects: [
      { id: 'dry-lips', name: 'Dry lips', severity: 'common' },
      { id: 'dry-skin', name: 'Dry skin', severity: 'common' },
      { id: 'mood', name: 'Mood changes', severity: 'occasional', whenToWorry: 'Tell your prescriber if your mood feels off.' },
      { id: 'liver', name: 'Liver enzyme changes', severity: 'occasional', whenToWorry: 'Routine bloodwork tracks this.' },
    ],
    contraindications: [
      'pregnancy',
      'breastfeeding',
      'liver-disease',
      'high-cholesterol',
    ],
    educationCopy: {
      shortDescription: 'Oral retinoid. Strong evidence for severe acne.',
      whatItIs:
        'Isotretinoin is a prescription oral medication used for severe or persistent acne. It works on multiple acne pathways and can produce long-term remission.',
      whatToExpect:
        'A 16\u201324 week course is typical. Expect dry lips, dry skin, and a possible early flare. Improvement compounds week over week. Bloodwork is required throughout.',
      consistencyNote:
        'Take with food at the prescribed dose. Use lip balm and moisturizer freely.',
    },
    requiresPrescription: true,
    genderRelevance: 'all',
  },
  {
    id: 'finasteride',
    displayName: 'Finasteride',
    category: 'oral',
    evidenceLevel: 'strong',
    expectedDurationWeeks: 52,
    primaryFaceMetrics: ['hairDensity'],
    expectedProgression: [
      { weekNumber: 8, expected: 'A short shed phase is normal as new hair cycles in.', visualCue: 'getting-worse' },
      { weekNumber: 16, expected: 'Shedding eases. Density holds steady.', visualCue: 'plateau' },
      { weekNumber: 32, expected: 'New growth visible at the hairline and crown.', visualCue: 'getting-better' },
      { weekNumber: 52, expected: 'A year in, density gains are usually visible.', visualCue: 'getting-better' },
    ],
    commonSideEffects: [
      { id: 'libido', name: 'Libido changes', severity: 'occasional' },
      { id: 'shed', name: 'Initial shedding', severity: 'common' },
    ],
    contraindications: ['pregnancy-partner-attempt'],
    educationCopy: {
      shortDescription: 'Oral 5-AR inhibitor. Strong evidence for hair density.',
      whatItIs:
        'Finasteride is a prescription medication that blocks DHT, a hormone tied to hair-cycle changes. It is used for slowing and partially reversing density loss in men.',
      whatToExpect:
        'A short shedding phase in the first two months is normal. Density gains compound over a year. Most users notice a difference by month eight.',
      consistencyNote: 'Daily, same time. Consistency over a full year.',
    },
    requiresPrescription: true,
    genderRelevance: 'men',
  },
  {
    id: 'minoxidil-topical',
    displayName: 'Minoxidil (topical)',
    category: 'topical',
    evidenceLevel: 'strong',
    expectedDurationWeeks: 24,
    primaryFaceMetrics: ['hairDensity'],
    expectedProgression: [
      { weekNumber: 4, expected: 'A brief shed phase is normal.', visualCue: 'getting-worse' },
      { weekNumber: 12, expected: 'Density holding. New growth starting at edges.', visualCue: 'plateau' },
      { weekNumber: 24, expected: 'Clear gains in density visible.', visualCue: 'getting-better' },
    ],
    commonSideEffects: [
      { id: 'scalp-dryness', name: 'Scalp dryness', severity: 'common' },
      { id: 'irritation', name: 'Mild irritation', severity: 'occasional' },
    ],
    contraindications: [],
    educationCopy: {
      shortDescription: 'Topical solution or foam. Strong evidence.',
      whatItIs:
        'Minoxidil applied to the scalp prolongs the growth phase of hair follicles. It is the most-studied over-the-counter option for density.',
      whatToExpect:
        'A short shed in the first month is normal. Density gains build through the first six months. Stopping reverses gains.',
      consistencyNote: 'Twice daily on dry scalp. Consistency over six months.',
    },
    requiresPrescription: false,
    genderRelevance: 'all',
  },
  {
    id: 'botox',
    displayName: 'Botulinum toxin',
    category: 'procedure',
    evidenceLevel: 'strong',
    expectedDurationWeeks: 12,
    primaryFaceMetrics: ['eyeArea', 'symmetry'],
    expectedProgression: [
      { weekNumber: 1, expected: 'Effect starts within 3\u20137 days.', visualCue: 'getting-better' },
      { weekNumber: 2, expected: 'Full effect visible. Smooth at rest.', visualCue: 'getting-better' },
      { weekNumber: 8, expected: 'Movement starting to return.', visualCue: 'plateau' },
      { weekNumber: 12, expected: 'Effect typically wears off; touch-up window.', visualCue: 'getting-worse' },
    ],
    commonSideEffects: [
      { id: 'bruising', name: 'Bruising at injection site', severity: 'common' },
      { id: 'asymmetry', name: 'Mild temporary asymmetry', severity: 'occasional' },
    ],
    contraindications: ['pregnancy', 'breastfeeding', 'neuromuscular-disorders'],
    educationCopy: {
      shortDescription: 'Injectable neuromodulator. Strong evidence for dynamic lines.',
      whatItIs:
        'Botulinum toxin temporarily relaxes specific facial muscles, smoothing dynamic lines that appear with expression. Effects last about three months.',
      whatToExpect:
        'Effect starts within a week, peaks at two weeks, and gradually fades by week twelve. Touch-ups every 3\u20134 months are typical.',
      consistencyNote:
        'Maintenance every 3\u20134 months. Track each session\u2019s before/after window.',
    },
    requiresPrescription: true,
    genderRelevance: 'all',
  },
  {
    id: 'other',
    displayName: 'Other',
    category: 'lifestyle',
    evidenceLevel: 'limited',
    expectedDurationWeeks: 12,
    primaryFaceMetrics: ['overall'],
    expectedProgression: [],
    commonSideEffects: [],
    contraindications: [],
    educationCopy: {
      shortDescription: 'A treatment not yet in our library.',
      whatItIs:
        'Use this option if your treatment is not listed. We\u2019ll track your scans and notes against the start date you provide.',
      whatToExpect:
        'No standardized progression curve is available. We will compare your scans against your own baseline.',
      consistencyNote: 'Log start date and key milestones in your notes.',
    },
    requiresPrescription: false,
    genderRelevance: 'all',
  },
];

export function getTreatmentDefinition(id: string): TreatmentDefinition | undefined {
  return TREATMENT_LIBRARY.find((t) => t.id === id);
}
