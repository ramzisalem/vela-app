# 09 — Daily Routine

## Overview
Template-based routine generation. AI selects tasks from a curated library based on user profile and current scores. Adapts weekly. 4-8 tasks per day, organized by time of day.

**Cadence model (read first):**
- **Scans run weekly.** Server enforces a 6-day cooldown (see `03_BACKEND_SUPABASE.md` and `00_INDEX.md`).
- **Routine check-offs run daily.** `completedDates` is keyed by `YYYY-MM-DD`. Daily completion is independent of the scan cooldown — never gate task check-offs on scan availability.
- **Routine *adaptation* (regeneration of the task list) runs weekly**, triggered after a successful scan (see `adaptRoutine` below).

**UI styling (locked):**
- **Section markers ("Morning", "Evening")** use `Typography.sectionMarker` (serif italic).
- **Streak chip** is a cream pill (`background.secondary`) with a 1px `VelaPrimary` gradient border via `<GradientBorderPill>`. The number inside uses `Typography.headlineSerif`.
- **Task "done" state** fills the checkbox with the `VelaPrimary` gradient. Pending state is a 1px `border.strong` ring on cream. The task title goes to `text.tertiary` and gets `textDecorationLine: 'line-through'` once done.
- **Daily progress bar** fills with the `VelaPrimary` gradient over a `cream200` track.

---

## Routine Engine

```typescript
// src/core/routine/routineEngine.ts
import { v4 as uuidv4 } from 'uuid';
import { AIService } from '@/services/ai';
import { RoutineContentLibrary } from './contentLibrary';
import type { UserProfile } from '@/types/profile';
import type { ScanScores } from '@/types/scan';
import type { DailyRoutine, RoutineTask } from '@/types/routine';

export class RoutineEngine {
  static async generateRoutine(
    profile: UserProfile,
    scores: ScanScores,
    weekNumber: number,
    userId: string,
    previousRoutine?: DailyRoutine,
    previousScores?: ScanScores
  ): Promise<DailyRoutine> {
    // Get all tasks the user is eligible for (filtering for contraindications)
    const allTasks = RoutineContentLibrary.getAllTasks();
    const eligibleTasks = this.filterEligibleTasks(allTasks, profile);
    const availableTaskIds = eligibleTasks.map((t) => t.id);
    
    let selectedTasks: RoutineTask[];
    let personalizationNote: string | undefined;
    
    try {
      // AI-driven selection
      const aiResult = await AIService.generateRoutine(
        profile,
        scores,
        availableTaskIds,
        !!previousRoutine,
        previousScores
      );
      
      selectedTasks = aiResult.task_ids
        .map((id: string) => eligibleTasks.find((t) => t.id === id))
        .filter((t: any): t is RoutineTask => !!t);
      
      personalizationNote = aiResult.personalization_note;
      
      // Safety: if AI returned 0 tasks, fall back
      if (selectedTasks.length === 0) {
        selectedTasks = this.generateFallbackRoutine(profile, scores, eligibleTasks);
      }
    } catch (error) {
      console.error('AI routine generation failed:', error);
      selectedTasks = this.generateFallbackRoutine(profile, scores, eligibleTasks);
    }
    
    return {
      id: uuidv4(),
      userId,
      generatedAt: new Date().toISOString(),
      weekNumber,
      tasks: selectedTasks,
      completedDates: previousRoutine?.completedDates || {},
      currentStreak: previousRoutine?.currentStreak || 0,
      lastCompletedDate: previousRoutine?.lastCompletedDate,
      personalizationNote,
    };
  }
  
  static filterEligibleTasks(tasks: RoutineTask[], profile: UserProfile): RoutineTask[] {
    return tasks.filter((task) => {
      // Gender-specific filter
      if (task.genderSpecific && task.genderSpecific !== profile.gender) return false;
      
      // Contraindication filter
      if (this.hasContraindication(task, profile)) return false;
      
      return true;
    });
  }
  
  static hasContraindication(task: RoutineTask, profile: UserProfile): boolean {
    const taskTitleLower = task.title.toLowerCase();
    
    // Pregnant users: no retinoids, salicylic acid above 2%, or hydroquinone
    if (profile.hormonalFactors.includes('pregnant')) {
      if (taskTitleLower.includes('retinol') || taskTitleLower.includes('retinoid') || taskTitleLower.includes('tretinoin')) return true;
      if (taskTitleLower.includes('salicylic')) return true;
      if (taskTitleLower.includes('hydroquinone')) return true;
    }
    
    // Rosacea: no harsh actives
    if (profile.skinConditions.includes('rosacea')) {
      if (taskTitleLower.includes('retinol') || taskTitleLower.includes('retinoid')) return true;
      if (taskTitleLower.includes('aha') || taskTitleLower.includes('bha')) return true;
      if (taskTitleLower.includes('vitamin c')) return true;
    }
    
    // Sensitive skin: no harsh exfoliants
    if (profile.skinConditions.includes('sensitive_skin')) {
      if (taskTitleLower.includes('strong exfoliant')) return true;
    }
    
    return false;
  }
  
  static generateFallbackRoutine(
    profile: UserProfile,
    scores: ScanScores,
    eligibleTasks: RoutineTask[]
  ): RoutineTask[] {
    const tasks: RoutineTask[] = [];
    
    // Always: SPF if not daily
    if (profile.spfHabit !== 'daily') {
      const spf = eligibleTasks.find((t) => t.id === 'spf-daily');
      if (spf) tasks.push(spf);
    }
    
    // Always: Cleanser
    const cleanserAM = eligibleTasks.find((t) => t.id === 'cleanser-am');
    if (cleanserAM) tasks.push(cleanserAM);
    
    const cleanserPM = eligibleTasks.find((t) => t.id === 'cleanser-pm');
    if (cleanserPM) tasks.push(cleanserPM);
    
    // Moisturizer
    const moisturizer = eligibleTasks.find((t) => t.id === 'moisturizer-am');
    if (moisturizer) tasks.push(moisturizer);
    
    // Targeted by weakest score
    const weakest = this.getWeakestSubScore(scores);
    
    if (weakest === 'vitality') {
      const sleep = eligibleTasks.find((t) => t.id === 'sleep-schedule');
      const water = eligibleTasks.find((t) => t.id === 'hydration-2l');
      if (sleep) tasks.push(sleep);
      if (water) tasks.push(water);
    }
    
    if (weakest === 'skin') {
      const niacinamide = eligibleTasks.find((t) => t.id === 'niacinamide-pm');
      if (niacinamide) tasks.push(niacinamide);
    }
    
    if (weakest === 'grooming' && profile.gender === 'man') {
      const beard = eligibleTasks.find((t) => t.id === 'beard-care');
      if (beard) tasks.push(beard);
    }
    
    return tasks;
  }
  
  static getWeakestSubScore(scores: ScanScores): string {
    const subs = [
      { name: 'skin', value: scores.skin },
      { name: 'symmetry', value: scores.symmetry },
      { name: 'definition', value: scores.definition },
      { name: 'vitality', value: scores.vitality },
      { name: 'grooming', value: scores.grooming },
    ];
    return subs.sort((a, b) => a.value - b.value)[0].name;
  }
}
```

---

## Content Library

The library contains ~80 carefully curated tasks. Below is the structure and key examples. The full library should be expanded based on dermatological research.

### Required task fields (full canonical schema)

Every task in the library MUST carry these fields beyond the base task type. These are the fields downstream features (file 18 personas, file 36 aging callouts, file 48 modes, file 50 evidence) read from. Cursor cannot ship a task without them.

```typescript
// extend RoutineTask (file 02) with these fields
interface RoutineTask {
  // ... existing fields ...

  // For file 18 / 09 persona-aware filtering. Resolves Marcus-churn risk.
  scoringFrameworkBias: 'masculine' | 'feminine' | 'neutral';

  // For file 36 "What helps?" callout filtering. Allows the aging-band callout
  // to deep-link only the tasks relevant to a specific metric.
  helpTopicId: 'overall' | 'redness' | 'clarity' | 'eyeArea'
             | 'cheekVolume' | 'jawDefinition' | 'symmetry'
             | 'hairlineDensity' | 'crownDensity'
             | 'lifestyle' | null;

  // For file 34 treatment integration. Tasks tagged complementary to a treatment
  // are added when that treatment is enabled.
  complementsTreatments: TreatmentId[];

  // For file 48 mode integration. Tasks contraindicated in a mode are
  // hard-blocked (pregnancy/postpartum) or warned (cancer-recovery, menopause).
  contraindicatedInModes: LifeStageModeId[];

  // For file 50 evidence layer.
  evidence: RoutineTaskEvidence; // see file 50 schema
}
```

### Persona-aware task filtering (resolves SPEC_REVIEW_3 file 18 HIGH)

The routine engine filters tasks by `scoringFrameworkBias`:

```typescript
function filterByFramework(tasks: RoutineTask[], userFramework: ScoringFramework): RoutineTask[] {
  if (userFramework === 'neutral') {
    // Non-binary / prefer-not-to-say users see all tasks.
    return tasks;
  }
  // Masculine / feminine: drop tasks biased the OTHER way; keep neutral and same-bias.
  const opposite: 'masculine' | 'feminine' = userFramework === 'masculine' ? 'feminine' : 'masculine';
  return tasks.filter(t => t.scoringFrameworkBias !== opposite);
}
```

A user can override by going to Settings → Daily routine → Edit routine and explicitly enabling a filtered task. We honor user agency over framework defaults.

Marcus-churn-risk examples (tasks tagged `feminine` so they're hidden by default for masculine framework users):
- `'toner-evening'`, `'essence-am'`, `'lash-serum-pm'`, `'collagen-supplement'`

Marcus-positive examples (tagged `masculine` or `neutral`):
- `'cleanser-am'`, `'spf-daily'`, `'shave-care-evening'`, `'beard-oil-am'`

### Evidence requirements (file 50)

**Every task in the library must carry a populated `evidence` field** per the schema in `50_EVIDENCE_VOICE.md`. The existing `evidenceLevel: 'well_established' | 'emerging' | 'experimental'` enum is replaced (or wrapped) by the richer `RoutineTaskEvidence` structure:

```typescript
evidence: {
  level: 'strong' | 'moderate' | 'limited' | 'traditional',
  claim: string,                    // ≤80 chars
  summary: string,                  // ≤200 words plain-language summary
  references: EvidenceReference[],  // ≥1 citation
  furtherReadingUrl?: string,       // optional link to a Vela Journal essay
  lastReviewedAt: string,
  lastReviewedBy: string,           // internal; not surfaced
}
```

The library must not ship with any task that does not have a populated `evidence` field. CI lints this. The medical-advisor + research-lead two-person review process from file 50 is required for every entry before launch and quarterly thereafter.

The "About this" sheet (tap the ⓘ next to a routine task) renders this data per file 50's UX spec. The doctor-friendly PDF (file 34) includes evidence appendices for active treatments and routine tasks alike.

```typescript
// src/core/routine/contentLibrary.ts
import type { RoutineTask } from '@/types/routine';

export class RoutineContentLibrary {
  static readonly TASKS: RoutineTask[] = [
    // ============ SKINCARE - MORNING ============
    {
      id: 'spf-daily',
      title: 'Apply SPF 30+ before going outside',
      description: 'Use a broad-spectrum SPF 30 or higher every morning, even on cloudy days.',
      category: 'skin_am',
      timeOfDay: 'morning',
      durationMinutes: 2,
      evidenceLevel: 'well_established',
      whyItMatters: 'UV exposure is the #1 cause of premature skin aging and uneven tone. Daily SPF is the single highest-ROI skincare step.',
      productRecommendation: {
        name: 'La Roche-Posay Anthelios',
        brand: 'La Roche-Posay',
        category: 'spf',
        priceRange: '30_to_100',
        reasonForRecommendation: 'Widely recommended by dermatologists. Works for all skin types.',
      },
      targetSubScore: 'skin',
      isCompleted: false,
    },
    {
      id: 'cleanser-am',
      title: 'Cleanse with a gentle face wash',
      description: 'Wash your face every morning with a gentle, pH-balanced cleanser.',
      category: 'skin_am',
      timeOfDay: 'morning',
      durationMinutes: 2,
      evidenceLevel: 'well_established',
      whyItMatters: 'Removes oil, pollutants, and dead skin cells that accumulated overnight.',
      productRecommendation: {
        name: 'CeraVe Foaming Cleanser',
        brand: 'CeraVe',
        category: 'cleanser',
        priceRange: 'under_30',
        reasonForRecommendation: 'Gentle, fragrance-free, works for most skin types.',
      },
      targetSubScore: 'skin',
      isCompleted: false,
    },
    {
      id: 'moisturizer-am',
      title: 'Apply morning moisturizer',
      description: 'Use a lightweight, non-comedogenic moisturizer suited to your skin type.',
      category: 'skin_am',
      timeOfDay: 'morning',
      durationMinutes: 1,
      evidenceLevel: 'well_established',
      whyItMatters: 'Well-hydrated skin appears more even, plump, and shows fewer fine lines.',
      targetSubScore: 'skin',
      isCompleted: false,
    },
    {
      id: 'vitamin-c-am',
      title: 'Apply Vitamin C serum',
      description: 'Apply a stable Vitamin C serum (10-20%) before SPF in the morning.',
      category: 'skin_am',
      timeOfDay: 'morning',
      durationMinutes: 1,
      evidenceLevel: 'well_established',
      whyItMatters: 'Vitamin C provides antioxidant protection, brightens skin, and boosts SPF effectiveness.',
      targetSubScore: 'skin',
      isCompleted: false,
    },
    
    // ============ SKINCARE - EVENING ============
    {
      id: 'cleanser-pm',
      title: 'Double cleanse in the evening',
      description: 'First an oil-based cleanser to remove SPF and pollutants, then a gentle water-based cleanser.',
      category: 'skin_pm',
      timeOfDay: 'evening',
      durationMinutes: 4,
      evidenceLevel: 'moderate',
      whyItMatters: 'SPF and environmental pollutants need oil-based cleansing to fully remove. Critical for clear skin.',
      targetSubScore: 'skin',
      isCompleted: false,
    },
    {
      id: 'retinol-pm',
      title: 'Apply retinol 2-3 nights per week',
      description: 'Start with 0.25%, apply at night after cleansing, follow with moisturizer. Skip if pregnant or breastfeeding.',
      category: 'skin_pm',
      timeOfDay: 'evening',
      durationMinutes: 1,
      evidenceLevel: 'well_established',
      whyItMatters: 'Retinol is the gold standard ingredient for reducing fine lines, improving texture, and evening tone over time.',
      productRecommendation: {
        name: 'The Ordinary Retinol 0.5% in Squalane',
        brand: 'The Ordinary',
        category: 'retinoid',
        priceRange: 'under_30',
        reasonForRecommendation: 'Affordable starter retinol for most skin types.',
      },
      targetSubScore: 'skin',
      isCompleted: false,
    },
    {
      id: 'niacinamide-pm',
      title: 'Apply niacinamide serum',
      description: 'Apply 5-10% niacinamide serum after cleansing.',
      category: 'skin_pm',
      timeOfDay: 'evening',
      durationMinutes: 1,
      evidenceLevel: 'well_established',
      whyItMatters: 'Niacinamide reduces redness, evens tone, regulates oil, and is well-tolerated by all skin types.',
      targetSubScore: 'skin',
      isCompleted: false,
    },
    {
      id: 'eye-cream',
      title: 'Apply eye cream',
      description: 'Gently pat eye cream around the orbital bone (not too close to lash line) morning and evening.',
      category: 'skin_pm',
      timeOfDay: 'anytime',
      durationMinutes: 1,
      evidenceLevel: 'moderate',
      whyItMatters: 'Eye area skin is thinnest and shows fatigue first. Targeted hydration helps reduce visible darkness and puffiness.',
      targetSubScore: 'vitality',
      isCompleted: false,
    },
    
    // ============ GROOMING ============
    {
      id: 'beard-care',
      title: 'Beard care routine',
      description: 'Wash beard with beard wash 2-3x/week, apply beard oil daily, trim shape weekly.',
      category: 'grooming',
      timeOfDay: 'morning',
      durationMinutes: 5,
      evidenceLevel: 'anecdotal',
      whyItMatters: 'Well-maintained facial hair significantly improves perceived grooming quality.',
      targetSubScore: 'grooming',
      genderSpecific: 'man',
      isCompleted: false,
    },
    {
      id: 'eyebrow-grooming',
      title: 'Trim and shape eyebrows weekly',
      description: 'Use a brow brush and small scissors to trim long hairs. Tweeze stragglers.',
      category: 'grooming',
      timeOfDay: 'anytime',
      durationMinutes: 5,
      evidenceLevel: 'anecdotal',
      whyItMatters: 'Eyebrow shape has a major impact on overall facial presentation.',
      targetSubScore: 'grooming',
      isCompleted: false,
    },
    {
      id: 'hair-washing',
      title: 'Wash hair appropriately for your type',
      description: 'Most people benefit from washing 2-4 times per week with sulfate-free shampoo.',
      category: 'grooming',
      timeOfDay: 'anytime',
      durationMinutes: 8,
      evidenceLevel: 'moderate',
      whyItMatters: 'Over-washing strips natural oils; under-washing creates buildup. Find your rhythm.',
      targetSubScore: 'grooming',
      isCompleted: false,
    },
    
    // ============ SLEEP ============
    {
      id: 'sleep-schedule',
      title: 'Sleep 7-8 hours, consistent schedule',
      description: 'Same bedtime and wake time every day, even weekends. Most adults need 7-8 hours.',
      category: 'sleep',
      timeOfDay: 'evening',
      durationMinutes: 1,
      evidenceLevel: 'well_established',
      whyItMatters: 'Sleep deprivation increases cortisol, worsening inflammation, under-eye darkness, and puffiness — all visible in your scans.',
      targetSubScore: 'vitality',
      isCompleted: false,
    },
    {
      id: 'screen-cutoff',
      title: 'No screens 1 hour before bed',
      description: 'Put devices away an hour before sleep. Replace with reading, stretching, or quiet time.',
      category: 'sleep',
      timeOfDay: 'evening',
      durationMinutes: 1,
      evidenceLevel: 'moderate',
      whyItMatters: 'Blue light suppresses melatonin and delays sleep onset, fragmenting recovery.',
      targetSubScore: 'vitality',
      isCompleted: false,
    },
    {
      id: 'silk-pillowcase',
      title: 'Sleep on a silk or satin pillowcase',
      description: 'Replace cotton pillowcases with silk or satin. Wash weekly.',
      category: 'sleep',
      timeOfDay: 'evening',
      durationMinutes: 1,
      evidenceLevel: 'anecdotal',
      whyItMatters: 'Reduces friction on skin and hair while sleeping, can help with mild lines and breakage.',
      targetSubScore: 'skin',
      isCompleted: false,
    },
    
    // ============ HYDRATION ============
    {
      id: 'hydration-2l',
      title: 'Drink 2+ liters of water today',
      description: 'Keep a reusable water bottle visible. Refill throughout the day.',
      category: 'hydration',
      timeOfDay: 'anytime',
      durationMinutes: 1,
      evidenceLevel: 'moderate',
      whyItMatters: 'Adequate hydration supports skin elasticity and reduces facial puffiness visible in scans.',
      targetSubScore: 'vitality',
      isCompleted: false,
    },
    
    // ============ NUTRITION ============
    {
      id: 'reduce-sugar',
      title: 'Limit added sugar to under 25g/day',
      description: 'Cut sugary drinks, candy, and processed snacks. Read labels.',
      category: 'nutrition',
      timeOfDay: 'anytime',
      durationMinutes: 1,
      evidenceLevel: 'moderate',
      whyItMatters: 'High sugar intake correlates with skin glycation, contributing to dullness and accelerated aging.',
      targetSubScore: 'skin',
      isCompleted: false,
    },
    {
      id: 'omega-3-foods',
      title: 'Eat omega-3 rich food today',
      description: 'Include fatty fish (salmon, sardines), walnuts, chia, or flax seeds.',
      category: 'nutrition',
      timeOfDay: 'anytime',
      durationMinutes: 1,
      evidenceLevel: 'moderate',
      whyItMatters: 'Omega-3s reduce inflammation and support skin barrier function.',
      targetSubScore: 'skin',
      isCompleted: false,
    },
    
    // ============ FITNESS / DEFINITION ============
    {
      id: 'cardio-30min',
      title: '30 minutes of cardio',
      description: 'Walk briskly, jog, cycle, or any sustained moderate-intensity activity.',
      category: 'fitness',
      timeOfDay: 'anytime',
      durationMinutes: 30,
      evidenceLevel: 'well_established',
      whyItMatters: 'Cardio improves circulation, reduces stress, supports body composition — all reflected in facial scans over time.',
      targetSubScore: 'definition',
      isCompleted: false,
    },
    {
      id: 'reduce-sodium',
      title: 'Keep sodium under 2300mg today',
      description: 'Limit processed foods. Cook with herbs and spices instead of salt.',
      category: 'nutrition',
      timeOfDay: 'anytime',
      durationMinutes: 1,
      evidenceLevel: 'moderate',
      whyItMatters: 'High sodium causes facial puffiness and obscures jawline definition. Effects visible within 24-48 hours.',
      targetSubScore: 'definition',
      isCompleted: false,
    },
    
    // Additional ~60 tasks would follow same pattern covering:
    // - Specific actives (AHA, BHA, peptides, ceramides)
    // - Hair-specific (scalp care, growth supplements, styling)
    // - Hormonal-specific (low-androgen routines, hair regrowth)
    // - Posture and face exercises (only well-supported)
    // - Stress management (meditation, breathwork)
    // - Specific conditions (acne-targeted, rosacea-targeted, etc.)
  ];
  
  static getAllTasks(): RoutineTask[] {
    return this.TASKS;
  }
  
  static getTask(id: string): RoutineTask | undefined {
    return this.TASKS.find((t) => t.id === id);
  }
}
```

---

## Routine UI Components

### TaskCard

```typescript
// src/components/dashboard/TaskCard.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { RoutineTask } from '@/types/routine';
import { Colors } from '@/theme/colors';
import { useState } from 'react';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface Props {
  task: RoutineTask;
  isCompleted: boolean;
  onToggle: () => void;
}

export function TaskCard({ task, isCompleted, onToggle }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  
  function handleToggle() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  }
  
  return (
    <View style={[styles.card, isCompleted && styles.cardCompleted]}>
      <Pressable onPress={handleToggle} style={styles.checkButton}>
        <Ionicons
          name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
          size={28}
          color={isCompleted ? Colors.success : Colors.textSecondary}
        />
      </Pressable>
      
      <Pressable style={styles.content} onPress={() => setShowDetails(!showDetails)}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, isCompleted && styles.titleCompleted]}>
            {task.title}
          </Text>
          <Text style={styles.duration}>{task.durationMinutes}m</Text>
        </View>
        
        {!showDetails && (
          <Text style={styles.description} numberOfLines={1}>
            {task.description}
          </Text>
        )}
        
        {showDetails && (
          <View style={styles.details}>
            <Text style={styles.description}>{task.description}</Text>
            
            <View style={styles.evidenceBadge}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.accent} />
              <Text style={styles.evidenceText}>{getEvidenceLabel(task.evidenceLevel)}</Text>
            </View>
            
            <Text style={styles.whyTitle}>Why it matters</Text>
            <Text style={styles.whyText}>{task.whyItMatters}</Text>
            
            {task.productRecommendation && (
              <View style={styles.productCard}>
                <Text style={styles.productLabel}>Suggested product</Text>
                <Text style={styles.productName}>
                  {task.productRecommendation.brand} — {task.productRecommendation.name}
                </Text>
                <Text style={styles.productReason}>
                  {task.productRecommendation.reasonForRecommendation}
                </Text>
              </View>
            )}
          </View>
        )}
      </Pressable>
    </View>
  );
}

function getEvidenceLabel(level: string): string {
  switch (level) {
    case 'well_established': return 'Evidence-backed';
    case 'moderate': return 'Generally supported';
    case 'anecdotal': return 'Community-supported';
    default: return '';
  }
}

// Bug fix: TaskCard uses Colors outside component — need useColors hook
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  cardCompleted: { opacity: 0.7 },
  checkButton: { paddingTop: 2 },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 15, fontWeight: '600', flex: 1 },
  titleCompleted: { textDecorationLine: 'line-through' },
  duration: { fontSize: 12, marginLeft: 8 },
  description: { fontSize: 13, marginTop: 4 },
  details: { marginTop: 12, gap: 12 },
  evidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(91, 141, 184, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  evidenceText: { fontSize: 11, fontWeight: '600' },
  whyTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  whyText: { fontSize: 13, lineHeight: 18 },
  productCard: {
    backgroundColor: '#F5F5F3',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  productLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  productName: { fontSize: 14, fontWeight: '600' },
  productReason: { fontSize: 12 },
});
```

### Routine Section (used on dashboard)

The routine card on the dashboard MUST surface a small "generated <weekday>" date stamp next to the section header, so users understand the cadence model (file 09 line 6: routine adapts weekly after each scan; daily check-offs are independent). Without this affordance, users mistakenly think the routine is updating real-time.

Date-stamp copy template:
- Day-of-generation: `"This week's routine"`
- 1-3 days after: `"This week's routine (since Monday)"`
- 4-6 days after: `"Monday's routine — refreshes after your next scan"`

```typescript
// src/components/dashboard/RoutineSection.tsx
import { View, Text, StyleSheet } from 'react-native';
import { useRoutineStore } from '@/stores/routineStore';
import { TaskCard } from './TaskCard';
import { Colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';

export function RoutineSection() {
  const { currentRoutine, toggleTask, getCompletedToday, getStreakInfo } = useRoutineStore();
  
  if (!currentRoutine) return null;
  
  const morningTasks = currentRoutine.tasks.filter((t) => t.timeOfDay === 'morning');
  const eveningTasks = currentRoutine.tasks.filter((t) => t.timeOfDay === 'evening');
  const anytimeTasks = currentRoutine.tasks.filter((t) => t.timeOfDay === 'anytime');
  
  const completedToday = getCompletedToday();
  const streak = getStreakInfo();
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Today's Routine</Text>
          <Text style={styles.subtitle}>
            {completedToday.length}/{currentRoutine.tasks.length} completed
          </Text>
        </View>
        
        {streak.current > 0 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={14} color="#FF6B6B" />
            <Text style={styles.streakText}>{streak.current} day streak</Text>
          </View>
        )}
      </View>
      
      {currentRoutine.personalizationNote && (
        <View style={styles.noteContainer}>
          <Ionicons name="sparkles" size={12} color={Colors.accent} />
          <Text style={styles.note}>{currentRoutine.personalizationNote}</Text>
        </View>
      )}
      
      {morningTasks.length > 0 && (
        <TaskGroup title="Morning" tasks={morningTasks} completed={completedToday} onToggle={toggleTask} />
      )}
      {eveningTasks.length > 0 && (
        <TaskGroup title="Evening" tasks={eveningTasks} completed={completedToday} onToggle={toggleTask} />
      )}
      {anytimeTasks.length > 0 && (
        <TaskGroup title="Anytime" tasks={anytimeTasks} completed={completedToday} onToggle={toggleTask} />
      )}
    </View>
  );
}

function TaskGroup({ title, tasks, completed, onToggle }: any) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.taskList}>
        {tasks.map((task: any) => (
          <TaskCard
            key={task.id}
            task={task}
            isCompleted={completed.includes(task.id)}
            onToggle={() => onToggle(task.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF4F4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  streakText: { fontSize: 12, fontWeight: '600', color: '#FF6B6B' },
  noteContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(91, 141, 184, 0.08)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  note: { fontSize: 13, fontStyle: 'italic', flex: 1, lineHeight: 18 },
  group: { gap: 8 },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  taskList: { gap: 8 },
});
```

---

## Routine Adaptation Logic

When a new weekly scan completes, the routine should adapt based on score changes.

```typescript
// In src/core/scoring/scoringEngine.ts — after processing capture
import { RoutineEngine } from '@/core/routine/routineEngine';
import { useRoutineStore } from '@/stores/routineStore';

// After saving the new scan session:
async function adaptRoutineAfterScan(
  newSession: ScanSession,
  previousSession: ScanSession | null,
  profile: UserProfile,
  userId: string
) {
  const previousRoutine = useRoutineStore.getState().currentRoutine;
  
  const newRoutine = await RoutineEngine.generateRoutine(
    profile,
    newSession.scores,
    newSession.weekNumber,
    userId,
    previousRoutine || undefined,
    previousSession?.scores
  );
  
  useRoutineStore.getState().setRoutine(newRoutine);
  
  // Persist to database
  await persistRoutine(newRoutine);
}
```
