# 07 — Onboarding Flow

## Overview
30-question onboarding across 5 sections. Gender-branched from question 1. AI generates personalized micro-payoff messages between sections. Takes 7-10 minutes. Ends with first capture and paywall.

---

## Flow Architecture

```
welcome
  → section-a (About You: Q1-6)
  → micro-payoff-a (AI-generated)
  → section-b (Your Face/Skin: Q7-14)
  → micro-payoff-b (AI-generated)
  → section-c (Your Goals: Q15-19)
  → micro-payoff-c (AI-generated)
  → section-d (Current Routine: Q20-26)
  → micro-payoff-d (AI-generated)
  → section-e (Lifestyle: Q27-30)
  → permissions
  → first-capture (transition to capture flow)
```

---

## Question Bank (canonical — all 30 questions)

This is the single source of truth for every onboarding question. The component code lower in this file implements them; if there is any drift, this list wins. Every question maps 1:1 to a field on `UserProfile` (file 02).

### Section A — About you (Q1–Q6)
| # | Field | Type | UI |
|---|---|---|---|
| 1 | `gender` (+ `scoringFramework` if non-binary / prefer-not-to-say) | enum | `GenderQuestion` (Q1b reveal — see file 02 + earlier in this file) |
| 2 | `age` | int 13–100 | `AgeQuestion` (wheel picker) |
| 3 | `firstName` | string? | `NameQuestion` (text input, optional) |
| 4 | `ethnicity[]` | enum[] | `EthnicityQuestion` (multi-select) |
| 5 | `skinType` | Fitzpatrick 1–6 | `SkinTypeQuestion` (illustrated swatch) |
| 6 | `skinConditions[]` | enum[] | `SkinConditionsQuestion` (multi-select + "none") |

### Section B — Your face & skin (Q7–Q14)
| # | Field | Type | UI |
|---|---|---|---|
| 7 | `hairSituation` | enum | `HairSituationQuestion` (gender-branched options) |
| 8 | `facialHair` | enum? | `FacialHairQuestion` *— shown only if gender ∈ {man, non_binary}* |
| 9 | `faceShape` | enum? | `FaceShapeQuestion` (illustrated, optional "not sure") |
| 10 | `skinConcernRegions[]` | enum[] | `FaceMapQuestion` (interactive face map) |
| 11 | `selfPerceivedSkinClarity` | int 1–5 | `LikertQuestion` |
| 12 | `selfPerceivedAge` | int? | `PerceivedAgeQuestion` (slider, optional skip) |
| 13 | `procedures[]` | enum[] | `ProceduresQuestion` (multi-select + privacy note) |
| 14 | `hormonalFactors[]` | enum[] | `HormonalQuestion` (multi-select, gender-branched copy) |

### Section C — Your goals (Q15–Q19)
| # | Field | Type | UI |
|---|---|---|---|
| 15 | `primaryGoal` | enum | `PrimaryGoalQuestion` (single-select) |
| 16 | `secondaryGoals[]` | enum[] | `SecondaryGoalsQuestion` (multi, max 3) |
| 17 | `idealOutcome` | enum | `IdealOutcomeQuestion` |
| 18 | `dailyTimeAvailable` | enum | `TimeAvailabilityQuestion` |
| 19 | `monthlyBudget` | enum | `BudgetQuestion` |

### Section D — Current routine (Q20–Q26)
| # | Field | Type | UI |
|---|---|---|---|
| 20 | `currentRoutineIntensity` | enum | `RoutineIntensityQuestion` |
| 21 | `currentProducts[]` | UserProduct[] | `ProductsQuestion` (search + add, optional skip) |
| 22 | `spfHabit` | enum | `SPFHabitQuestion` |
| 23 | `exerciseFrequency` | enum | `ExerciseQuestion` |
| 24 | `dietPattern` | enum | `DietQuestion` |
| 25 | `waterIntake` | enum | `WaterQuestion` |
| 26 | `substanceHabits[]` | enum[] | `SubstanceQuestion` (multi + "none") |

### Section E — Lifestyle (Q27–Q30)
| # | Field | Type | UI |
|---|---|---|---|
| 27 | `sleepHours` | enum | `SleepQuestion` |
| 28 | `stressLevel` | enum | `StressQuestion` |
| 29 | `location` (timezone derived) | object? | `LocationQuestion` (optional, for circadian rhythm reminders) |
| 30 | `additionalNotes` | string? | `NotesQuestion` (multiline, optional) |

**Conditional reveals:**
- Q1b (scoring framework) — only when Q1 = `non_binary` or `prefer_not_to_say`. Counts as a sub-step of Q1, not as a 31st question.
- Q8 (facial hair) — only when Q1 ∈ {`man`, `non_binary`}.

The progress bar denominator is **30** even when conditional reveals are shown, because they're treated as sub-steps. Validate this with the QA checklist in file 17 ("Non-binary gets choice of framework").

---

## Layout

```typescript
// app/(onboarding)/_layout.tsx
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false, // Don't allow swipe-back during onboarding
      }}
    />
  );
}
```

---

## Welcome Screen

The welcome screen is one of three editorial moments in the app (alongside score reveal and paywall) — it uses the serif `<DisplaySerif>` for the headline and the `<Wordmark>` brand mark above. The `<Button>` defaults to `variant="primary"` which renders the `VelaPrimary` gradient.

```typescript
// app/(onboarding)/welcome.tsx
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { DisplaySerif, Body } from '@/components/ui/Text';
import { Wordmark } from '@/components/brand/Wordmark';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/theme/ThemeContext';
import { CreamWashView } from '@/components/ui/CreamWashView';
import { Spacing } from '@/theme/spacing';

export default function WelcomeScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <CreamWashView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, padding: Spacing.xl, justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', marginTop: Spacing.xxl }}>
          <Wordmark size="large" />
        </View>

        <View style={{ alignItems: 'center', gap: Spacing.md }}>
          <DisplaySerif style={{ textAlign: 'center' }}>Your face,</DisplaySerif>
          <DisplaySerif style={{ textAlign: 'center', fontStyle: 'italic' }}>honestly.</DisplaySerif>
          <Body color="secondary" style={{ textAlign: 'center', marginTop: Spacing.md, maxWidth: 280 }}>
            A weekly record of how your face actually changes.
          </Body>
        </View>

        <View style={{ gap: Spacing.md }}>
          <Button
            title="Begin"
            onPress={() => router.push('/(onboarding)/section-a')}
          />
          <Body
            color="secondary"
            style={{ textAlign: 'center', fontSize: 13 }}
            onPress={() => router.push('/(auth)/sign-in')}
          >
            Already have an account?
          </Body>
        </View>
      </SafeAreaView>
    </CreamWashView>
  );
}
```

> `<CreamWashView>` is a thin wrapper over `expo-linear-gradient` that paints the `CreamWash` radial gradient on light theme and `colors.background.primary` on dark theme. Defined in file 15 alongside the other theme primitives.

---

## Section A: About You (Questions 1-6)

```typescript
// app/(onboarding)/section-a.tsx
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingContainer } from '@/components/onboarding/OnboardingContainer';
import { GenderQuestion } from '@/components/onboarding/questions/GenderQuestion';
import { AgeQuestion } from '@/components/onboarding/questions/AgeQuestion';
import { NameQuestion } from '@/components/onboarding/questions/NameQuestion';
import { EthnicityQuestion } from '@/components/onboarding/questions/EthnicityQuestion';
import { SkinTypeQuestion } from '@/components/onboarding/questions/SkinTypeQuestion';
import { SkinConditionsQuestion } from '@/components/onboarding/questions/SkinConditionsQuestion';
import { useProfileStore } from '@/stores/profileStore';

export default function SectionA() {
  const router = useRouter();
  const { profile, updateProfile } = useProfileStore();
  const [questionIndex, setQuestionIndex] = useState(0);
  
  const advance = () => {
    if (questionIndex < 5) {
      setQuestionIndex(questionIndex + 1);
    } else {
      router.push('/(onboarding)/micro-payoff-a');
    }
  };
  
  return (
    <OnboardingContainer sectionTitle="About you" progress={(questionIndex + 1) / 30}>
      {questionIndex === 0 && (
        <GenderQuestion
          gender={profile?.gender}
          framework={profile?.scoringFramework}
          onChange={({ gender, scoringFramework }) =>
            updateProfile({ gender, scoringFramework })
          }
          onNext={advance}
        />
      )}
      {questionIndex === 1 && (
        <AgeQuestion
          value={profile?.age || 30}
          onChange={(age) => updateProfile({ age })}
          onNext={advance}
        />
      )}
      {questionIndex === 2 && (
        <NameQuestion
          value={profile?.firstName}
          onChange={(firstName) => updateProfile({ firstName })}
          onNext={advance}
        />
      )}
      {questionIndex === 3 && (
        <EthnicityQuestion
          value={profile?.ethnicity || []}
          onChange={(ethnicity) => updateProfile({ ethnicity })}
          onNext={advance}
        />
      )}
      {questionIndex === 4 && (
        <SkinTypeQuestion
          value={profile?.skinType || 3}
          onChange={(skinType) => updateProfile({ skinType })}
          onNext={advance}
        />
      )}
      {questionIndex === 5 && (
        <SkinConditionsQuestion
          value={profile?.skinConditions || []}
          onChange={(skinConditions) => updateProfile({ skinConditions })}
          onNext={advance}
        />
      )}
    </OnboardingContainer>
  );
}
```

---

## Question Components

### Gender Question (with framework follow-up)

This question has two parts. Q1 sets `profile.gender`; if the user picks `non_binary` or `prefer_not_to_say`, Q1b reveals a follow-up that sets `profile.scoringFramework`. For `man` / `woman` we set the framework automatically via `frameworkForGender(gender)` (file 02) — no extra prompt.

This keeps the spec's "30 questions" headline accurate (Q1b is a contextual sub-step of Q1, not a new step).

**Cycle-tracking foreshadowing (file 33).** When the user picks `woman` or `non_binary` at Q1, Q1's caption includes a small foreshadow line: *"Later on, you'll be able to opt in to cycle-phase tracking if you'd like — entirely optional, you can skip then."* This prevents the file 33 cycle-permission ask from feeling like an ambush three weeks later. Users who declined here implicitly know it's coming and don't perceive it as a privacy escalation.

```typescript
// src/components/onboarding/questions/GenderQuestion.tsx
import { View } from 'react-native';
import { SelectionButton } from '../SelectionButton';
import { Button } from '@/components/ui/Button';
import { Headline, Body } from '@/components/ui/Text';
import { Spacing } from '@/theme/spacing';
import {
  type Gender,
  type ScoringFramework,
  frameworkForGender,
} from '@/types/profile';

interface Props {
  gender?: Gender;
  framework?: ScoringFramework;
  onChange: (next: { gender: Gender; scoringFramework: ScoringFramework }) => void;
  onNext: () => void;
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'man', label: 'Man' },
  { value: 'woman', label: 'Woman' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const FRAMEWORK_OPTIONS: { value: ScoringFramework; label: string; hint: string }[] = [
  { value: 'masculine', label: 'Masculine',
    hint: 'Weights jaw definition higher.' },
  { value: 'feminine',  label: 'Feminine',
    hint: 'Weights skin clarity and vitality higher.' },
  { value: 'neutral',   label: 'Neutral',
    hint: 'Equal weighting across all dimensions.' },
];

export function GenderQuestion({ gender, framework, onChange, onNext }: Props) {
  const needsFrameworkChoice =
    gender === 'non_binary' || gender === 'prefer_not_to_say';

  const canContinue =
    gender !== undefined && (!needsFrameworkChoice || framework !== undefined);

  function handleGenderChange(nextGender: Gender) {
    // Auto-derive framework for man/woman; for others, leave framework UNDEFINED
    // so Q1b reveals AND the Continue button is correctly gated.
    //
    // Bug guard (SPEC_REVIEW_3): do NOT fall back to frameworkForGender() when
    // the user needs to make an explicit Q1b choice — that would silently
    // pre-fill 'neutral' and let canContinue pass before the user answered Q1b.
    const needsExplicitFramework =
      nextGender === 'non_binary' || nextGender === 'prefer_not_to_say';
    const nextFramework: ScoringFramework | undefined = needsExplicitFramework
      ? undefined  // ← reset; let Q1b drive
      : frameworkForGender(nextGender);
    onChange({
      gender: nextGender,
      scoringFramework: nextFramework as ScoringFramework, // typed as required by callsite; runtime-undefined intentional
    });
  }

  function handleFrameworkChange(nextFramework: ScoringFramework) {
    if (!gender) return;
    onChange({ gender, scoringFramework: nextFramework });
  }

  return (
    <View style={{ gap: Spacing.lg }}>
      <Headline>How do you identify?</Headline>
      <Body color="secondary">
        We use this to calibrate scoring and routine recommendations.
      </Body>

      <View style={{ gap: Spacing.sm }}>
        {GENDER_OPTIONS.map((option) => (
          <SelectionButton
            key={option.value}
            title={option.label}
            isSelected={gender === option.value}
            onPress={() => handleGenderChange(option.value)}
          />
        ))}
      </View>

      {needsFrameworkChoice && (
        <View style={{ gap: Spacing.md, marginTop: Spacing.lg }}>
          <Headline>Which scoring framework should we use?</Headline>
          <Body color="secondary">
            You can change this later in Settings. Affects scoring weights and
            routine emphasis only — not which features you can use.
          </Body>

          <View style={{ gap: Spacing.sm }}>
            {FRAMEWORK_OPTIONS.map((option) => (
              <SelectionButton
                key={option.value}
                title={option.label}
                subtitle={option.hint}
                isSelected={framework === option.value}
                onPress={() => handleFrameworkChange(option.value)}
              />
            ))}
          </View>
        </View>
      )}

      <Button title="Continue" onPress={onNext} disabled={!canContinue} />
    </View>
  );
}
```

**Hookup in Section A:** the parent passes both `profile.gender` and `profile.scoringFramework` and persists both via `updateProfile`. Replace the existing call:

```typescript
{questionIndex === 0 && (
  <GenderQuestion
    gender={profile?.gender}
    framework={profile?.scoringFramework}
    onChange={({ gender, scoringFramework }) =>
      updateProfile({ gender, scoringFramework })
    }
    onNext={advance}
  />
)}
```

Also add a "Scoring framework" row to Settings (file 14) so users can change it later without redoing onboarding.

### Age Question

```typescript
// src/components/onboarding/questions/AgeQuestion.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Button } from '@/components/ui/Button';

interface Props {
  value: number;
  onChange: (age: number) => void;
  onNext: () => void;
}

export function AgeQuestion({ value, onChange, onNext }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>How old are you?</Text>
      
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={value}
          onValueChange={onChange}
        >
          {Array.from({ length: 88 }, (_, i) => 13 + i).map((age) => (
            <Picker.Item key={age} label={`${age}`} value={age} />
          ))}
        </Picker>
      </View>
      
      <Button title="Continue" onPress={onNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  question: { ...Typography.headline },
  pickerContainer: { backgroundColor: colors.background.muted, borderRadius: Radii.lg, paddingVertical: Spacing.sm },
});
```

### Name Question

```typescript
// src/components/onboarding/questions/NameQuestion.tsx
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  value?: string;
  onChange: (name: string | undefined) => void;
  onNext: () => void;
}

export function NameQuestion({ value, onChange, onNext }: Props) {
  const [input, setInput] = useState(value || '');
  
  const handleNext = () => {
    onChange(input.trim() || undefined);
    onNext();
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.question}>What should we call you?</Text>
      <Text style={styles.subtitle}>Optional — helps personalize your experience.</Text>
      
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={setInput}
        placeholder="First name"
        placeholderTextColor="#9B9B9B"
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={handleNext}
      />
      
      <Button title={input.trim() ? "Continue" : "Skip"} onPress={handleNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  question: { ...Typography.headline },
  subtitle: { ...Typography.bodyMedium, color: colors.text.secondary },
  input: {
    ...Typography.button,
    backgroundColor: colors.background.muted,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
  },
});
```

### Ethnicity Question (Multi-Select)

```typescript
// src/components/onboarding/questions/EthnicityQuestion.tsx
import { View, Text, StyleSheet } from 'react-native';
import { SelectionButton } from '../SelectionButton';
import { Button } from '@/components/ui/Button';
import type { EthnicityOption } from '@/types/profile';

interface Props {
  value: EthnicityOption[];
  onChange: (ethnicity: EthnicityOption[]) => void;
  onNext: () => void;
}

const OPTIONS: { value: EthnicityOption; label: string }[] = [
  { value: 'east_asian', label: 'East Asian' },
  { value: 'south_asian', label: 'South Asian' },
  { value: 'southeast_asian', label: 'Southeast Asian' },
  { value: 'black_african_descent', label: 'Black / African descent' },
  { value: 'middle_eastern_north_african', label: 'Middle Eastern / North African' },
  { value: 'hispanic_latino', label: 'Hispanic / Latino' },
  { value: 'white_european', label: 'White / European' },
  { value: 'indigenous', label: 'Indigenous' },
  { value: 'mixed', label: 'Mixed / Multiple' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export function EthnicityQuestion({ value, onChange, onNext }: Props) {
  const toggle = (option: EthnicityOption) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.question}>What's your ethnic heritage?</Text>
      <Text style={styles.subtitle}>
        We use this to give better skincare recommendations calibrated to your skin's natural characteristics. Select all that apply.
      </Text>
      
      <View style={styles.options}>
        {OPTIONS.map((option) => (
          <SelectionButton
            key={option.value}
            title={option.label}
            isSelected={value.includes(option.value)}
            onPress={() => toggle(option.value)}
          />
        ))}
      </View>
      
      <Button title="Continue" onPress={onNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  question: { ...Typography.headline },
  subtitle: { ...Typography.bodyMedium, color: colors.text.secondary },
  options: { gap: Spacing.sm },
});
```

### Skin Type Question (Visual Fitzpatrick)

```typescript
// src/components/onboarding/questions/SkinTypeQuestion.tsx
import { View, Text, StyleSheet } from 'react-native';
import { SelectionButton } from '../SelectionButton';
import { Button } from '@/components/ui/Button';
import type { FitzpatrickSkinType } from '@/types/profile';

interface Props {
  value: FitzpatrickSkinType;
  onChange: (type: FitzpatrickSkinType) => void;
  onNext: () => void;
}

const OPTIONS: { value: FitzpatrickSkinType; label: string; description: string }[] = [
  { value: 1, label: 'Very fair', description: 'Always burns, never tans' },
  { value: 2, label: 'Fair', description: 'Burns easily, tans minimally' },
  { value: 3, label: 'Medium', description: 'Sometimes burns, gradually tans' },
  { value: 4, label: 'Olive', description: 'Rarely burns, tans well' },
  { value: 5, label: 'Brown', description: 'Very rarely burns, tans deeply' },
  { value: 6, label: 'Dark', description: 'Never burns' },
];

export function SkinTypeQuestion({ value, onChange, onNext }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>How does your skin react to sun?</Text>
      <Text style={styles.subtitle}>This is the Fitzpatrick scale — it affects how skincare ingredients work for you.</Text>
      
      <View style={styles.options}>
        {OPTIONS.map((option) => (
          <SelectionButton
            key={option.value}
            title={option.label}
            subtitle={option.description}
            isSelected={value === option.value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
      
      <Button title="Continue" onPress={onNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  question: { ...Typography.headline },
  subtitle: { ...Typography.bodyMedium, color: colors.text.secondary },
  options: { gap: Spacing.sm },
});
```

### Skin Conditions Question (Multi-Select)

```typescript
// src/components/onboarding/questions/SkinConditionsQuestion.tsx
import { View, Text, StyleSheet } from 'react-native';
import { SelectionButton } from '../SelectionButton';
import { Button } from '@/components/ui/Button';
import type { SkinCondition } from '@/types/profile';

interface Props {
  value: SkinCondition[];
  onChange: (conditions: SkinCondition[]) => void;
  onNext: () => void;
}

const OPTIONS: { value: SkinCondition; label: string }[] = [
  { value: 'acne', label: 'Acne' },
  { value: 'rosacea', label: 'Rosacea' },
  { value: 'eczema', label: 'Eczema' },
  { value: 'psoriasis', label: 'Psoriasis' },
  { value: 'melasma', label: 'Melasma' },
  { value: 'hyperpigmentation', label: 'Hyperpigmentation' },
  { value: 'sensitive_skin', label: 'Sensitive skin' },
  { value: 'none', label: 'None of these' },
];

export function SkinConditionsQuestion({ value, onChange, onNext }: Props) {
  const toggle = (option: SkinCondition) => {
    if (option === 'none') {
      onChange(['none']);
    } else {
      const without_none = value.filter((v) => v !== 'none');
      if (without_none.includes(option)) {
        onChange(without_none.filter((v) => v !== option));
      } else {
        onChange([...without_none, option]);
      }
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.question}>Do you have any of these?</Text>
      <Text style={styles.subtitle}>
        This prevents us from recommending things that could irritate your skin.
      </Text>
      
      <View style={styles.options}>
        {OPTIONS.map((option) => (
          <SelectionButton
            key={option.value}
            title={option.label}
            isSelected={value.includes(option.value)}
            onPress={() => toggle(option.value)}
          />
        ))}
      </View>
      
      <Button title="Continue" onPress={onNext} disabled={value.length === 0} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  question: { ...Typography.headline },
  subtitle: { ...Typography.bodyMedium, color: colors.text.secondary },
  options: { gap: Spacing.sm },
});
```

---

## Section B: Your Face & Skin (Q7-14)

Same pattern as Section A. Questions:

7. **Skin behavior:** dry / oily / combination / normal / not sure
8. **Self-perceived clarity:** 1-5 visual scale
9. **Concern regions:** Face diagram with tappable regions (forehead, T-zone, cheeks, chin, nose, around eyes, jawline)
10. **Hair situation:** Gender-branched options
11. **Facial hair (men only):** Full beard / patchy / clean shaven / can't grow much
12. **Self-reported perceived age:** Number input
13. **Face shape:** Visual selection (oval/round/square/heart/oblong/diamond/not sure)
14. **Procedures and treatments:** Multi-select (current Rx, Botox, filler, laser, etc.)

### Concern Regions Question (Face Diagram)

```typescript
// src/components/onboarding/questions/ConcernRegionsQuestion.tsx
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Pressable } from 'react-native';
import { Button } from '@/components/ui/Button';
import type { FaceRegion } from '@/types/profile';

interface Props {
  value: FaceRegion[];
  onChange: (regions: FaceRegion[]) => void;
  onNext: () => void;
}

const REGIONS: { id: FaceRegion; label: string; cx: number; cy: number }[] = [
  { id: 'forehead', label: 'Forehead', cx: 100, cy: 50 },
  { id: 'left_cheek', label: 'Left cheek', cx: 60, cy: 130 },
  { id: 'right_cheek', label: 'Right cheek', cx: 140, cy: 130 },
  { id: 'nose', label: 'Nose', cx: 100, cy: 110 },
  { id: 'chin', label: 'Chin', cx: 100, cy: 200 },
  { id: 'around_eyes', label: 'Around eyes', cx: 100, cy: 90 },
  { id: 'jawline', label: 'Jawline', cx: 100, cy: 180 },
];

export function ConcernRegionsQuestion({ value, onChange, onNext }: Props) {
  const toggle = (region: FaceRegion) => {
    if (value.includes(region)) {
      onChange(value.filter((r) => r !== region));
    } else {
      onChange([...value, region]);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.question}>Where do you see the most issues?</Text>
      <Text style={styles.subtitle}>Tap all that apply.</Text>
      
      <View style={styles.diagramContainer}>
        <Svg width={200} height={250} viewBox="0 0 200 250">
          {/* Face outline */}
          <Path
            d="M 100 20 Q 50 30 50 100 Q 50 200 100 230 Q 150 200 150 100 Q 150 30 100 20"
            fill={colors.background.muted}
            stroke={colors.border.subtle}
            strokeWidth={1.5}
          />
          
          {/* Region tap targets */}
          {REGIONS.map((region) => (
            <Circle
              key={region.id}
              cx={region.cx}
              cy={region.cy}
              r={20}
              fill={value.includes(region.id) ? colors.accent.default : 'transparent'}
              stroke={colors.accent.default}
              strokeWidth={1}
              opacity={value.includes(region.id) ? 0.6 : 0.3}
              onPress={() => toggle(region.id)}
            />
          ))}
        </Svg>
      </View>
      
      <View style={styles.legend}>
        {REGIONS.map((region) => (
          <Pressable
            key={region.id}
            style={[styles.tag, value.includes(region.id) && styles.tagSelected]}
            onPress={() => toggle(region.id)}
          >
            <Text style={[styles.tagText, value.includes(region.id) && styles.tagTextSelected]}>
              {region.label}
            </Text>
          </Pressable>
        ))}
      </View>
      
      <Button title="Continue" onPress={onNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  question: { ...Typography.headline },
  subtitle: { ...Typography.bodyMedium, color: colors.text.secondary },
  diagramContainer: { alignItems: 'center', paddingVertical: Spacing.lg },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xxs, borderRadius: Radii.xxl, backgroundColor: colors.background.muted },
  tagSelected: { backgroundColor: colors.accent.default },
  tagText: { ...Typography.caption, color: colors.text.primary },
  tagTextSelected: { color: colors.text.inverse },
});
```

### Hair Situation (Gender-Branched)

```typescript
// src/components/onboarding/questions/HairSituationQuestion.tsx
import { View, Text, StyleSheet } from 'react-native';
import { SelectionButton } from '../SelectionButton';
import { Button } from '@/components/ui/Button';
import type { HairSituation, Gender } from '@/types/profile';

interface Props {
  value?: HairSituation;
  gender: Gender;
  onChange: (situation: HairSituation) => void;
  onNext: () => void;
}

export function HairSituationQuestion({ value, gender, onChange, onNext }: Props) {
  const options: { value: HairSituation; label: string }[] =
    gender === 'man'
      ? [
          { value: 'full_thick_man', label: 'Full and thick' },
          { value: 'starting_thin_man', label: 'Starting to thin' },
          { value: 'noticeable_thinning', label: 'Noticeable thinning' },
          { value: 'receding_hairline', label: 'Receding hairline' },
          { value: 'mostly_bald', label: 'Mostly bald' },
          { value: 'shaved_choice', label: 'Shaved by choice' },
        ]
      : gender === 'woman'
      ? [
          { value: 'full_thick_woman', label: 'Full and thick' },
          { value: 'fine_but_full', label: 'Fine but full' },
          { value: 'starting_thin_woman', label: 'Starting to thin' },
          { value: 'hair_loss', label: 'Noticeable hair loss' },
          { value: 'postpartum_shedding', label: 'Postpartum shedding' },
          { value: 'other_hair_concern', label: 'Other concern' },
        ]
      : // Non-binary or prefer not to say — show all
        [
          { value: 'full_thick_man', label: 'Full and thick' },
          { value: 'fine_but_full', label: 'Fine but full' },
          { value: 'starting_thin_man', label: 'Starting to thin' },
          { value: 'hair_loss', label: 'Noticeable hair loss' },
          { value: 'mostly_bald', label: 'Mostly bald' },
          { value: 'shaved_choice', label: 'Shaved by choice' },
        ];
  
  return (
    <View style={styles.container}>
      <Text style={styles.question}>How would you describe your hair?</Text>
      
      <View style={styles.options}>
        {options.map((option) => (
          <SelectionButton
            key={option.value}
            title={option.label}
            isSelected={value === option.value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
      
      <Button title="Continue" onPress={onNext} disabled={!value} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  question: { ...Typography.headline },
  options: { gap: Spacing.sm },
});
```

---

## Section C: Goals (Q15-19)

15. **Primary goal** (single select)
16. **Secondary goals** (multi-select)
17. **Ideal outcome in 3 months** (subtly better / noticeable / transformation / maintain)
18. **Daily time available** (5/10/15/30+ min)
19. **Monthly budget** (under $30 / $30-100 / $100-300 / $300+)

### Primary goal → persona-inference mapping (canonical)

The `primaryGoal` enum drives file 25's persona inference. Each value must map to one persona signal:

| Goal value | Display label | Persona signal | Notes |
|---|---|---|---|
| `skin_clarity` | "Skin clarity and texture" | Maya | Tracking-oriented, data-friendly |
| `aging_signs` | "Fine lines and aging" / "Reduce signs of aging" | Maya | Adult, preventive framing |
| `jawline_definition` | "Sharper jawline" / "Facial definition" | Marcus (when masculine framework) | Optimization framing |
| `hair_concerns` | "Hair (growth or styling)" | Marcus or Priya | Marcus if masculine + young; Priya if treatment-tracking |
| `facial_fat` | "Facial fat distribution" | Marcus (masculine) / Maya (feminine) | Demographics decide |
| `dark_circles` | "Dark circles and under-eye" | Maya | Often comes with sleep / lifestyle interest |
| `overall_confidence` | "Overall appearance confidence" | Jordan | Self-acceptance framing |
| `treatment_tracking` | "Tracking a treatment or procedure" | Priya | Strongest Priya signal — but file 25 also reads `activeTreatments` directly which is even stronger |

The mapping is canonical for v1. Adding new primary goals requires adding to file 25's inference function and re-running the distribution check.

```typescript
// src/components/onboarding/questions/PrimaryGoalQuestion.tsx
import { View, Text, StyleSheet } from 'react-native';
import { SelectionButton } from '../SelectionButton';
import { Button } from '@/components/ui/Button';
import type { AppearanceGoal, Gender } from '@/types/profile';

interface Props {
  value?: AppearanceGoal;
  gender: Gender;
  onChange: (goal: AppearanceGoal) => void;
  onNext: () => void;
}

function getGoalLabel(goal: AppearanceGoal, gender: Gender): string {
  switch (goal) {
    case 'skin_clarity': return 'Skin clarity and texture';
    case 'aging_signs': return gender === 'man' ? 'Reduce signs of aging' : 'Fine lines and aging';
    case 'jawline_definition': return gender === 'man' ? 'Sharper jawline' : 'Facial definition';
    case 'hair_concerns': return 'Hair (growth or styling)';
    case 'facial_fat': return 'Facial fat distribution';
    case 'dark_circles': return 'Dark circles and under-eye';
    case 'overall_confidence': return 'Overall appearance confidence';
    case 'treatment_tracking': return 'Tracking a treatment or procedure';
  }
}

const GOALS: AppearanceGoal[] = [
  'skin_clarity',
  'aging_signs',
  'jawline_definition',
  'hair_concerns',
  'facial_fat',
  'dark_circles',
  'overall_confidence',
  'treatment_tracking',
];

export function PrimaryGoalQuestion({ value, gender, onChange, onNext }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>What's the main thing you want to improve?</Text>
      <Text style={styles.subtitle}>We'll prioritize your routine and scoring around this.</Text>
      
      <View style={styles.options}>
        {GOALS.map((goal) => (
          <SelectionButton
            key={goal}
            title={getGoalLabel(goal, gender)}
            isSelected={value === goal}
            onPress={() => onChange(goal)}
          />
        ))}
      </View>
      
      <Button title="Continue" onPress={onNext} disabled={!value} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  question: { ...Typography.headline },
  subtitle: { ...Typography.bodyMedium, color: colors.text.secondary },
  options: { gap: Spacing.sm },
});
```

---

## Section D: Current Routine (Q20-26)

20. Current skincare routine intensity (none / minimal / basic / standard / extensive)
21. SPF habits (daily / sometimes / only at beach / never)
22. Current products (free text + barcode option for v2 scanner integration)
23. Exercise frequency
24. Diet pattern
25. Water intake
26. Hair care routine

---

## Section E: Lifestyle (Q27-30)

27. Sleep hours
28. Stress level
29. Smoking and alcohol (multi-select)
30. Hormonal factors (gender-branched) + optional notes

### Hormonal Factors (Gender-Branched)

```typescript
// src/components/onboarding/questions/HormonalFactorsQuestion.tsx
import { View, Text, StyleSheet } from 'react-native';
import { SelectionButton } from '../SelectionButton';
import { Button } from '@/components/ui/Button';
import type { HormonalFactor, Gender } from '@/types/profile';

interface Props {
  value: HormonalFactor[];
  gender: Gender;
  onChange: (factors: HormonalFactor[]) => void;
  onNext: () => void;
}

export function HormonalFactorsQuestion({ value, gender, onChange, onNext }: Props) {
  const options: { value: HormonalFactor; label: string }[] =
    gender === 'woman'
      ? [
          { value: 'hormonal_bc', label: 'On hormonal birth control' },
          { value: 'pregnant', label: 'Pregnant' },
          { value: 'postpartum', label: 'Postpartum' },
          { value: 'perimenopausal', label: 'Perimenopausal' },
          { value: 'menopausal', label: 'Menopausal' },
          { value: 'on_hrt', label: 'On HRT' },
          { value: 'none', label: 'None of these' },
        ]
      : gender === 'man'
      ? [
          { value: 'on_trt', label: 'On TRT' },
          { value: 'on_finasteride', label: 'On finasteride' },
          { value: 'on_minoxidil', label: 'On minoxidil' },
          { value: 'none', label: 'None of these' },
        ]
      : // Non-binary
        [
          { value: 'on_hrt', label: 'On HRT' },
          { value: 'on_trt', label: 'On TRT' },
          { value: 'on_finasteride', label: 'On finasteride' },
          { value: 'on_minoxidil', label: 'On minoxidil' },
          { value: 'hormonal_bc', label: 'On hormonal birth control' },
          { value: 'none', label: 'None of these' },
        ];
  
  const toggle = (factor: HormonalFactor) => {
    if (factor === 'none') {
      onChange(['none']);
    } else {
      const without_none = value.filter((v) => v !== 'none');
      if (without_none.includes(factor)) {
        onChange(without_none.filter((v) => v !== factor));
      } else {
        onChange([...without_none, factor]);
      }
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.question}>Any hormonal factors?</Text>
      <Text style={styles.subtitle}>
        These significantly affect skin, hair, and facial changes. Select all that apply.
      </Text>
      
      <View style={styles.options}>
        {options.map((option) => (
          <SelectionButton
            key={option.value}
            title={option.label}
            isSelected={value.includes(option.value)}
            onPress={() => toggle(option.value)}
          />
        ))}
      </View>
      
      <Button title="Continue" onPress={onNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  question: { ...Typography.headline },
  subtitle: { ...Typography.bodyMedium, color: colors.text.secondary },
  options: { gap: Spacing.sm },
});
```

---

## Micro-Payoff Screens (AI-Generated)

```typescript
// app/(onboarding)/micro-payoff-a.tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useProfileStore } from '@/stores/profileStore';
import { AIService } from '@/services/ai';
import { Ionicons } from '@expo/vector-icons';

export default function MicroPayoffA() {
  const router = useRouter();
  const { profile } = useProfileStore();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function generate() {
      try {
        const result = await AIService.generateMicroPayoff('about_you', {
          gender: profile?.gender,
          age: profile?.age,
          skinType: profile?.skinType,
          ethnicity: profile?.ethnicity,
          conditions: profile?.skinConditions,
        });
        setMessage(result.message);
      } catch (error) {
        // Fallback static copy
        setMessage("Got it. Let's understand your face in more detail.");
      } finally {
        setLoading(false);
      }
    }
    generate();
  }, []);
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.accent.default} />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={64} color={colors.accent.default} />
            <Text style={styles.message}>{message}</Text>
          </>
        )}
      </View>
      
      {!loading && (
        <Button title="Continue" onPress={() => router.push('/(onboarding)/section-b')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.xl, justifyContent: 'space-between', backgroundColor: colors.background.primary },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.xl, paddingHorizontal: Spacing.xxxl },
  message: { ...Typography.bodyMedium, textAlign: 'center', color: colors.text.primary, lineHeight: 28, fontWeight: '500' },
});
```

(Same pattern for `micro-payoff-b.tsx`, `micro-payoff-c.tsx`, `micro-payoff-d.tsx`.)

---

## Privacy Primer (canonical for the whole spec)

Vela's privacy posture is its single most important brand promise. Files 32, 33, 37, 49 each describe their own privacy model in slightly different language. Reading them together, a user could wonder whether these are different protection levels. This screen, shown once during onboarding before the camera permission ask, unifies the language.

### When it appears

After Q30 (last onboarding question), before the Permissions Screen below. One full-bleed screen, swipeable through 4 short panels. The user can skip with a small "Got it" tap-target after panel 1 — most users will skim the rest after seeing the headline.

### The four panels

#### Panel 1 — The promise

```
┌──────────────────────────────────────────┐
│                                          │
│   Your face is yours.                    │
│                                          │
│   Three things you should know about     │
│   how Vela handles what you share.       │
│                                          │
│                                          │
│                                          │
│                                          │
│                                          │
│                              [Continue]  │
└──────────────────────────────────────────┘
```

#### Panel 2 — What stays on your phone

```
┌──────────────────────────────────────────┐
│                                          │
│   What stays on your phone               │
│                                          │
│   Your photos. Always. We never          │
│   upload them, never see them, never     │
│   train on them.                         │
│                                          │
│   Your face's 3D shape. The depth        │
│   data ARKit gives us is processed       │
│   on this phone and forgotten.           │
│                                          │
│   Your diary. Your words are              │
│   encrypted with a key only you have.    │
│                                          │
│   Your Apple Health data. We read it     │
│   here, in the app, and use it for       │
│   patterns. The numbers themselves       │
│   never leave.                           │
│                                          │
│                              [Continue]  │
└──────────────────────────────────────────┘
```

#### Panel 3 — What we send to our servers

```
┌──────────────────────────────────────────┐
│                                          │
│   What we send to our servers            │
│                                          │
│   Your scan scores — the numbers         │
│   that drive your charts.                │
│                                          │
│   Your routine settings, treatments,     │
│   streaks, and Wrapped retrospectives    │
│   so they sync across your devices.      │
│                                          │
│   That's it. Nothing else, ever.         │
│                                          │
│                                          │
│                              [Continue]  │
└──────────────────────────────────────────┘
```

#### Panel 4 — Your control

```
┌──────────────────────────────────────────┐
│                                          │
│   Your control                           │
│                                          │
│   You can export everything Vela has     │
│   on you, anytime, from Settings.        │
│                                          │
│   You can delete your account in two     │
│   taps. Everything goes — no copies      │
│   kept.                                  │
│                                          │
│   No ads. No selling your data. No       │
│   training AI on your face. Ever.        │
│                                          │
│                                          │
│                                  [Got it] │
└──────────────────────────────────────────┘
```

### The protection model — what these promises map to (technical, not user-facing)

This is the back-of-house version of the four panels — for engineering reference. Cursor must implement every feature consistent with this table:

| Data category | Where it lives | Server can read? | Sent to AI? | Notes |
|---|---|:-:|:-:|---|
| Face photos | Device only | ❌ | ❌ | `Documents/scans/`; never uploaded; no replication |
| 3D depth maps | Memory only during capture | ❌ | ❌ | Computed; numerical metrics extracted; mesh discarded |
| Capture3D numerical metrics (file 32) | WatermelonDB + Supabase | ✓ | ✓ (numerical only) | Cheek volume index, jaw definition angle, etc. |
| Sub-scores + overall score | WatermelonDB + Supabase | ✓ | ✓ | The data the dashboard renders |
| Routine state, treatments, streaks | WatermelonDB + Supabase | ✓ | ✓ | Synced across devices |
| Diary entries — body text (file 37) | WatermelonDB plaintext + Supabase ciphertext | ❌ | ✓ on per-call basis only (briefly decrypted in memory; never logged) | Encrypted with per-user iCloud Keychain key |
| Diary inferred tags | WatermelonDB + Supabase plaintext | ✓ | ✓ | Controlled vocabulary, not user prose |
| HealthKit raw values (file 33) | Memory only during correlation compute | ❌ | ❌ | Apple owns; we read transiently |
| HealthKit-derived correlations (Pearson r, sample size) | WatermelonDB + Supabase | ✓ | ✓ (numerical only) | The aggregated, anonymized result |
| Life-stage mode metadata (file 48) | WatermelonDB + Supabase | ✓ | ❌ unless user opts in | HRT type, treatment type are NEVER sent to AI without explicit toggle |
| Practice tier shared data (file 49) | Supabase, RLS-scoped to enrolled clinic | ✓ (clinic only via consent) | ❌ | Hard floors: diary, HealthKit, life-stage NEVER visible to clinic |
| Journal essay reads (file 50) | Web analytics only | ✓ | ❌ | URL-only counts, no fingerprinting |

**This table is canonical.** A new feature that handles a new data category MUST add a row here AND update the four panels above to maintain consistency.

### Implementation

```typescript
// app/(onboarding)/privacy-primer.tsx
import { View, Text, ScrollView } from 'react-native';
// ... renders the 4 panels as a horizontal pager
// On dismiss/complete: setProfileFlag('privacy_primer_seen', true)
// Navigate to permissions screen
```

The screen is shown exactly once per user. A user who dismisses without reading still sees the camera-permission ask normally (file 04 / capture flow handles the permission rationale separately).

### Reference from feature files

When file 32, 33, 37, 48, 49, or any other privacy-relevant file describes its protection model, it MUST reference this canonical primer rather than restating. Example:

> *Privacy: see the unified primer in file 07 ("Privacy Primer"). This file's data is in the [Diary entries — body text] row of the protection model table.*

This eliminates the language drift across files that SPEC_REVIEW_3 flagged.

---

## Permissions Screen

```typescript
// app/(onboarding)/permissions.tsx
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Picker } from '@react-native-picker/picker';
import { VelaFaceTracker } from '@/modules/vela-face-tracker';
import { NotificationService } from '@/services/notifications';
import { useProfileStore } from '@/stores/profileStore';
import { useAppState } from '@/stores/appStateStore';

const DAYS = [
  { label: 'Sunday', value: 1 },
  { label: 'Monday', value: 2 },
  { label: 'Tuesday', value: 3 },
  { label: 'Wednesday', value: 4 },
  { label: 'Thursday', value: 5 },
  { label: 'Friday', value: 6 },
  { label: 'Saturday', value: 7 },
];

export default function PermissionsScreen() {
  const router = useRouter();
  const { profile, saveProfile } = useProfileStore();
  const { user, completeOnboarding } = useAppState();
  
  const [cameraGranted, setCameraGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [day, setDay] = useState(1); // Sunday
  const [hour, setHour] = useState(9);
  
  async function requestCamera() {
    const granted = await VelaFaceTracker.requestPermission();
    setCameraGranted(granted);
  }
  
  async function requestNotifications() {
    const granted = await NotificationService.requestPermission();
    setNotifGranted(granted);
  }
  
  async function complete() {
    if (notifGranted) {
      await NotificationService.scheduleWeeklyCheckIn(day, hour, 0);
    }
    
    if (profile && user) {
      await saveProfile(profile, user.id);
    }
    
    completeOnboarding();
    router.replace('/(capture)/capture?isBaseline=true');
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Two quick things</Text>
      
      <PermissionRow
        icon="camera"
        title="Camera access"
        description="Required for weekly face captures. Photos stay on your device."
        granted={cameraGranted}
        onRequest={requestCamera}
      />
      
      <View style={styles.divider} />
      
      <View style={styles.notifSection}>
        <Text style={styles.sectionTitle}>When should we remind you?</Text>
        
        <View style={styles.pickerRow}>
          <Picker selectedValue={day} onValueChange={setDay} style={styles.picker}>
            {DAYS.map((d) => (
              <Picker.Item key={d.value} label={d.label} value={d.value} />
            ))}
          </Picker>
          <Picker selectedValue={hour} onValueChange={setHour} style={styles.picker}>
            {Array.from({ length: 24 }, (_, i) => i).map((h) => (
              <Picker.Item key={h} label={`${h}:00`} value={h} />
            ))}
          </Picker>
        </View>
        
        {!notifGranted && (
          <Pressable onPress={requestNotifications}>
            <Text style={styles.enableLink}>Enable notifications</Text>
          </Pressable>
        )}
      </View>
      
      <View style={{ flex: 1 }} />
      
      <Button
        title="Continue to first scan"
        onPress={complete}
        disabled={!cameraGranted}
      />
    </View>
  );
}

function PermissionRow({ icon, title, description, granted, onRequest }: any) {
  const colors = useColors();
  return (
    <View style={styles.permissionRow}>
      <Ionicons name={icon} size={32} color={colors.accent.default} />
      <View style={styles.permissionContent}>
        <Text style={styles.permissionTitle}>{title}</Text>
        <Text style={styles.permissionDescription}>{description}</Text>
      </View>
      <Pressable onPress={granted ? undefined : onRequest}>
        {granted ? (
          <Ionicons name="checkmark-circle" size={28} color={colors.success.default} />
        ) : (
          <Text style={styles.allowButton}>Allow</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.xl, gap: Spacing.xl, backgroundColor: colors.background.primary },
  title: { ...Typography.title, marginTop: Spacing.xl },
  divider: { height: Spacing.xxs, backgroundColor: colors.border.default },
  permissionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  permissionContent: { flex: 1 },
  permissionTitle: { ...Typography.buttonSmall },
  permissionDescription: { ...Typography.caption, color: colors.text.secondary, marginTop: Spacing.xxs },
  allowButton: { ...Typography.body, fontWeight: '600', color: colors.accent.default },
  notifSection: { gap: Spacing.md },
  sectionTitle: { ...Typography.subheadline },
  pickerRow: { flexDirection: 'row', gap: Spacing.md },
  picker: { flex: 1, backgroundColor: colors.background.muted, borderRadius: Radii.lg },
  enableLink: { color: colors.accent.default, fontWeight: '600', textAlign: 'center' },
});
```

---

## Reusable Components

### OnboardingContainer

```typescript
// src/components/onboarding/OnboardingContainer.tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProgressBar } from './ProgressBar';

interface Props {
  sectionTitle: string;
  progress: number;
  children: React.ReactNode;
}

export function OnboardingContainer({ sectionTitle, progress, children }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar progress={progress} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

// Bug fix: onboardingContainer uses colors inside StyleSheet.create
// Move inside component as inline styles or use factory function
function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.primary },
    content: { padding: Spacing.xl, paddingTop: Spacing.lg },
    sectionTitle: {
      ...Typography.label,
      color: colors.accent.default,
      marginBottom: Spacing.xl,
    },
  });
}
```

### ProgressBar

```typescript
// src/components/onboarding/ProgressBar.tsx
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

interface Props {
  progress: number; // 0 to 1
}

export function ProgressBar({ progress }: Props) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(`${progress * 100}%`, { duration: 300 }),
  }));
  
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.fill, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: Spacing.xxs, backgroundColor: colors.overlay.light },
  fill: { height: '100%', backgroundColor: colors.accent.default },
});
```

### SelectionButton

```typescript
// src/components/onboarding/SelectionButton.tsx
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  title: string;
  subtitle?: string;
  isSelected: boolean;
  onPress: () => void;
}

export function SelectionButton({ title, subtitle, isSelected, onPress }: Props) {
  return (
    <Pressable
      style={[styles.button, isSelected && styles.selected]}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, isSelected && styles.titleSelected]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, isSelected && styles.subtitleSelected]}>
            {subtitle}
          </Text>
        )}
      </View>
      {isSelected && <Ionicons name="checkmark" size={20} color="white" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.muted,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
  },
  selected: { backgroundColor: colors.accent.default },
  title: { ...Typography.buttonSmall, color: colors.text.primary },
  titleSelected: { color: colors.text.inverse },
  subtitle: { ...Typography.caption, color: colors.text.secondary, marginTop: Spacing.xxs },
  subtitleSelected: { color: 'rgba(255,255,255,0.85)' },
});
```
