# 11 — Comparison View

## Overview
The comparison tab. Shows side-by-side, slider, and difference views of any two captured sessions. This is the visceral "wow" moment of the product — users see actual aligned before/after photos.

---

## Compare Screen

```typescript
// app/(main)/compare.tsx
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SessionPicker } from '@/components/compare/SessionPicker';
import { SideBySideView } from '@/components/compare/SideBySideView';
import { SliderCompareView } from '@/components/compare/SliderCompareView';
import { DifferenceView } from '@/components/compare/DifferenceView';
import { ScoreDeltaRow } from '@/components/compare/ScoreDeltaRow';
import { ShareButton } from '@/components/compare/ShareButton';
import { useScanStore } from '@/stores/scanStore';
import { useColors } from '@/theme/ThemeContext';
import { Spacing } from '@/theme/spacing';
import { Typography } from '@/theme/typography';

type CompareMode = 'side' | 'slider' | 'diff';

export default function CompareScreen() {
  const colors = useColors();
  const { sessions } = useScanStore();
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [mode, setMode] = useState<CompareMode>('slider');
  
  // Auto-select default sessions: oldest and newest
  useEffect(() => {
    if (sessions.length >= 2 && (!fromId || !toId)) {
      const sorted = [...sessions].sort((a, b) => 
        new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
      );
      setFromId(sorted[0].id);
      setToId(sorted[sorted.length - 1].id);
    }
  }, [sessions]);
  
  const fromSession = sessions.find((s) => s.id === fromId);
  const toSession = sessions.find((s) => s.id === toId);
  
  if (sessions.length < 2) {
    return <EmptyState />;
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Compare</Text>
          {fromSession && toSession && (
            <ShareButton fromSession={fromSession} toSession={toSession} />
          )}
        </View>
        
        <SessionPicker
          sessions={sessions}
          fromId={fromId}
          toId={toId}
          onChange={(from, to) => {
            setFromId(from);
            setToId(to);
          }}
        />
        
        <SegmentedControl
          options={[
            { label: 'Side by Side', value: 'side' },
            { label: 'Slider', value: 'slider' },
            { label: 'Difference', value: 'diff' },
          ]}
          value={mode}
          onChange={(value) => setMode(value as CompareMode)}
        />
        
        {fromSession && toSession && (
          <>
            <View style={styles.viewerContainer}>
              {mode === 'side' && <SideBySideView from={fromSession} to={toSession} />}
              {mode === 'slider' && <SliderCompareView from={fromSession} to={toSession} />}
              {mode === 'diff' && <DifferenceView from={fromSession} to={toSession} />}
            </View>
            
            <ScoreDeltaRow from={fromSession.scores} to={toSession.scores} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyState() {
  // Per file 20 empty-state philosophy (Pattern B): warm copy, future-positive,
  // no apology. Replaces the original "No comparisons yet" passive phrasing.
  return (
    <SafeAreaView style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>One more scan to compare</Text>
      <Text style={styles.emptyText}>
        Next week, you'll see your actual changes side by side.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...Typography.title },
  viewerContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxxl },
  emptyTitle: { ...Typography.headline, marginBottom: Spacing.sm },
  emptyText: { ...Typography.body, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 },
});
```

---

## Session Picker

```typescript
// src/components/compare/SessionPicker.tsx
import { View, Text, Pressable, StyleSheet, ScrollView, Modal } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { ScanSession } from '@/types/scan';
import { useColors } from '@/theme/ThemeContext';

interface Props {
  sessions: ScanSession[];
  fromId: string | null;
  toId: string | null;
  onChange: (fromId: string, toId: string) => void;
}

export function SessionPicker({ sessions, fromId, toId, onChange }: Props) {
  const colors = useColors();
  const [modalState, setModalState] = useState<'from' | 'to' | null>(null);
  
  const fromSession = sessions.find((s) => s.id === fromId);
  const toSession = sessions.find((s) => s.id === toId);
  
  function handleSelect(sessionId: string) {
    // Confirmation pattern: briefly highlight the selected row before dismiss
    // so users on slow devices see their tap took. Per SPEC_REVIEW_3 finding.
    setSelectedConfirmation(sessionId);
    setTimeout(() => {
      if (modalState === 'from') {
        onChange(sessionId, toId!);
      } else if (modalState === 'to') {
        onChange(fromId!, sessionId);
      }
      setModalState(null);
      setSelectedConfirmation(null);
    }, 200); // 200ms is the minimum perceivable confirmation; longer feels laggy
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <SessionButton
          label="From"
          session={fromSession}
          onPress={() => setModalState('from')}
        />
        
        <Ionicons name="arrow-forward" size={20} color={colors.text.secondary} />
        
        <SessionButton
          label="To"
          session={toSession}
          onPress={() => setModalState('to')}
        />
      </View>
      
      <Modal visible={!!modalState} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Select {modalState === 'from' ? 'starting' : 'ending'} session
            </Text>
            
            <ScrollView style={styles.sessionList}>
              {sessions.map((session) => (
                <Pressable
                  key={session.id}
                  style={styles.sessionRow}
                  onPress={() => handleSelect(session.id)}
                >
                  <View>
                    <Text style={styles.sessionWeek}>Week {session.weekNumber}</Text>
                    <Text style={styles.sessionDate}>
                      {format(new Date(session.capturedAt), 'MMM d, yyyy')}
                    </Text>
                  </View>
                  <Text style={styles.sessionScore}>{session.scores.overall}</Text>
                </Pressable>
              ))}
            </ScrollView>
            
            <Pressable style={styles.closeButton} onPress={() => setModalState(null)}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SessionButton({ label, session, onPress }: { label: string; session?: ScanSession; onPress: () => void }) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.buttonLabel}>{label}</Text>
      {session ? (
        <>
          <Text style={styles.buttonWeek}>Week {session.weekNumber}</Text>
          <Text style={styles.buttonDate}>{format(new Date(session.capturedAt), 'MMM d')}</Text>
        </>
      ) : (
        <Text style={styles.buttonPlaceholder}>Select</Text>
      )}
    </Pressable>
  );
}

// Bug fix: SessionPicker styles ref Colors outside StyleSheet.create
// Use inline styles or replace with proper token refs
// Replace Colors.textSecondary → colors.text.secondary (via useColors hook)
// Replace Colors.accent → colors.accent.default
const styles = StyleSheet.create({
  container: { backgroundColor: 'white', borderRadius: 12, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  button: { flex: 1, padding: 12, backgroundColor: '#F5F5F3', borderRadius: 8, alignItems: 'center' },
  buttonLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  buttonWeek: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  buttonDate: { fontSize: 12, marginTop: 2 },
  buttonPlaceholder: { fontSize: 14, marginTop: 4 },
  
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  sessionList: { maxHeight: 400 },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sessionWeek: { fontSize: 15, fontWeight: '600' },
  sessionDate: { fontSize: 13, marginTop: 2 },
  sessionScore: { fontSize: 22, fontWeight: '700' },
  closeButton: {
    marginTop: 16,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#F5F5F3',
    borderRadius: 12,
  },
  closeButtonText: { fontWeight: '600' },
});
```

---

## Side-by-Side View

```typescript
// src/components/compare/SideBySideView.tsx
import { View, Image, Text, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { format } from 'date-fns';
import type { ScanSession } from '@/types/scan';
import { Colors } from '@/theme/colors';

interface Props {
  from: ScanSession;
  to: ScanSession;
}

export function SideBySideView({ from, to }: Props) {
  const fromUri = `${FileSystem.documentDirectory}VelaPhotos/${from.frontPhotoPath}`;
  const toUri = `${FileSystem.documentDirectory}VelaPhotos/${to.frontPhotoPath}`;
  
  return (
    <View style={styles.container}>
      <View style={styles.column}>
        <Image source={{ uri: fromUri }} style={styles.image} resizeMode="cover" />
        <View style={styles.label}>
          <Text style={styles.weekText}>Week {from.weekNumber}</Text>
          <Text style={styles.dateText}>{format(new Date(from.capturedAt), 'MMM d')}</Text>
          <Text style={styles.scoreText}>{from.scores.overall}</Text>
        </View>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.column}>
        <Image source={{ uri: toUri }} style={styles.image} resizeMode="cover" />
        <View style={styles.label}>
          <Text style={styles.weekText}>Week {to.weekNumber}</Text>
          <Text style={styles.dateText}>{format(new Date(to.capturedAt), 'MMM d')}</Text>
          <Text style={styles.scoreText}>{to.scores.overall}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', aspectRatio: 1.4 },
  column: { flex: 1, position: 'relative' },
  image: { width: '100%', height: '100%', backgroundColor: '#1A1A1A' },
  divider: { width: 2, backgroundColor: 'white' },
  label: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  weekText: { color: 'white', fontWeight: '700', fontSize: 14, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4 },
  dateText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, position: 'absolute', bottom: -16, left: 0 },
  scoreText: { color: 'white', fontWeight: '700', fontSize: 24, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4 },
});
```

---

## Slider Compare View

```typescript
// src/components/compare/SliderCompareView.tsx
import { View, Image, StyleSheet, Dimensions, Text } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system';
import { format } from 'date-fns';
import type { ScanSession } from '@/types/scan';
import { Colors } from '@/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  from: ScanSession;
  to: ScanSession;
}

export function SliderCompareView({ from, to }: Props) {
  const containerWidth = SCREEN_WIDTH - 32; // Account for padding
  const sliderX = useSharedValue(containerWidth / 2);
  
  const fromUri = `${FileSystem.documentDirectory}VelaPhotos/${from.frontPhotoPath}`;
  const toUri = `${FileSystem.documentDirectory}VelaPhotos/${to.frontPhotoPath}`;
  
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      const x = sliderX.value + e.translationX;
      sliderX.value = Math.max(20, Math.min(containerWidth - 20, x));
    })
    .onEnd(() => {
      // Allow slider to settle naturally
    });
  
  const fromImageStyle = useAnimatedStyle(() => ({
    width: sliderX.value,
  }));
  
  const sliderLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value - 1 }],
  }));
  
  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value - 16 }],
  }));
  
  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        {/* "To" image (latest, on the right) */}
        <Image source={{ uri: toUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        
        {/* "From" image clipped to slider position (on the left) */}
        <Animated.View style={[StyleSheet.absoluteFill, fromImageStyle, { overflow: 'hidden' }]}>
          <Image
            source={{ uri: fromUri }}
            style={[StyleSheet.absoluteFill, { width: containerWidth }]}
            resizeMode="cover"
          />
        </Animated.View>
        
        {/* Labels */}
        <View style={styles.fromLabel}>
          <Text style={styles.labelText}>Week {from.weekNumber}</Text>
          <Text style={styles.labelDate}>{format(new Date(from.capturedAt), 'MMM d')}</Text>
        </View>
        <View style={styles.toLabel}>
          <Text style={styles.labelText}>Week {to.weekNumber}</Text>
          <Text style={styles.labelDate}>{format(new Date(to.capturedAt), 'MMM d')}</Text>
        </View>
        
        {/* Slider line */}
        <Animated.View style={[styles.sliderLine, sliderLineStyle]} />
        
        {/* Drag handle */}
        <Animated.View style={[styles.handle, handleStyle]}>
          <View style={styles.handleInner}>
            <Text style={styles.handleArrow}>‹›</Text>
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { aspectRatio: 0.85, backgroundColor: '#1A1A1A' },
  sliderLine: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: 'white' },
  handle: {
    position: 'absolute',
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleInner: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  handleArrow: { color: 'white', fontSize: 14, fontWeight: '700' },
  fromLabel: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toLabel: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  labelText: { color: 'white', fontWeight: '700', fontSize: 12 },
  labelDate: { color: 'rgba(255,255,255,0.85)', fontSize: 10, marginTop: 1 },
});
```

---

## Difference View (Visualizes changes)

```typescript
// src/components/compare/DifferenceView.tsx
import { View, Image, Text, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';
import type { ScanSession } from '@/types/scan';
import { Colors } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  from: ScanSession;
  to: ScanSession;
}

export function DifferenceView({ from, to }: Props) {
  const toUri = `${FileSystem.documentDirectory}VelaPhotos/${to.frontPhotoPath}`;
  
  // Compute changed areas based on score deltas
  const changes = computeChanges(from.scores, to.scores);
  
  return (
    <View style={styles.container}>
      <Image source={{ uri: toUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      
      {/* Overlay change highlights */}
      <View style={styles.overlay}>
        {changes.map((change, i) => (
          <View key={i} style={[styles.changeMarker, change.position]}>
            <View style={[styles.changeDot, change.delta > 0 ? styles.changeDotPositive : styles.changeDotNegative]} />
            <View style={styles.changeBadge}>
              <Ionicons
                name={change.delta > 0 ? 'arrow-up' : 'arrow-down'}
                size={10}
                color={change.delta > 0 ? Colors.success : '#E8A598'}
              />
              <Text style={styles.changeText}>{Math.abs(change.delta)} {change.label}</Text>
            </View>
          </View>
        ))}
      </View>
      
      {changes.length === 0 && (
        <View style={styles.noChangeOverlay}>
          <Text style={styles.noChangeText}>Scores stable across this period</Text>
        </View>
      )}
    </View>
  );
}

function computeChanges(from: any, to: any) {
  const changes: { position: any; delta: number; label: string }[] = [];
  
  // Skin change → cheek area
  const skinDelta = to.skin - from.skin;
  if (Math.abs(skinDelta) >= 3) {
    changes.push({
      position: { top: '40%', left: '20%' },
      delta: skinDelta,
      label: 'Skin',
    });
  }
  
  // Vitality change → under-eye area
  const vitalityDelta = to.vitality - from.vitality;
  if (Math.abs(vitalityDelta) >= 3) {
    changes.push({
      position: { top: '30%', right: '25%' },
      delta: vitalityDelta,
      label: 'Vitality',
    });
  }
  
  // Definition change → jaw area
  const definitionDelta = to.definition - from.definition;
  if (Math.abs(definitionDelta) >= 3) {
    changes.push({
      position: { bottom: '25%', left: '30%' },
      delta: definitionDelta,
      label: 'Definition',
    });
  }
  
  return changes;
}

const styles = StyleSheet.create({
  container: { aspectRatio: 0.85, backgroundColor: '#1A1A1A' },
  overlay: { ...StyleSheet.absoluteFillObject },
  changeMarker: { position: 'absolute', alignItems: 'center' },
  changeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  changeDotPositive: { backgroundColor: Colors.success },
  changeDotNegative: { backgroundColor: '#E8A598' },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'white',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  changeText: { fontSize: 10, fontWeight: '600' },
  noChangeOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  noChangeText: {
    color: 'white',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
});
```

---

## Score Delta Row

```typescript
// src/components/compare/ScoreDeltaRow.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ScanScores } from '@/types/scan';
import { Colors } from '@/theme/colors';

interface Props {
  from: ScanScores;
  to: ScanScores;
}

export function ScoreDeltaRow({ from, to }: Props) {
  // Note: Colors hardcoded here. Should use colors from useColors hook to get subScore colors
  const metrics: { key: keyof ScanScores; label: string; color: string }[] = [
    { key: 'overall', label: 'Overall', color: '#5B8DB8' },
    { key: 'skin', label: 'Skin', color: 'TODO_SKIN_COLOR' },
    { key: 'symmetry', label: 'Symmetry', color: 'TODO_SYMMETRY_COLOR' },
    { key: 'definition', label: 'Definition', color: 'TODO_DEFINITION_COLOR' },
    { key: 'vitality', label: 'Vitality', color: 'TODO_VITALITY_COLOR' },
    { key: 'grooming', label: 'Grooming', color: 'TODO_GROOMING_COLOR' },
  ];
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Score changes</Text>
      
      <View style={styles.list}>
        {metrics.map((metric) => {
          const fromValue = from[metric.key] as number;
          const toValue = to[metric.key] as number;
          const delta = toValue - fromValue;
          
          return (
            <View key={metric.key} style={styles.row}>
              <View style={[styles.colorBar, { backgroundColor: metric.color }]} />
              <Text style={styles.label}>{metric.label}</Text>
              <Text style={styles.fromValue}>{fromValue}</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.textSecondary} />
              <Text style={styles.toValue}>{toValue}</Text>
              <View style={[
                styles.deltaBadge,
                delta > 0 ? styles.deltaPositive : delta < 0 ? styles.deltaNegative : styles.deltaNeutral,
              ]}>
                <Text style={[
                  styles.deltaText,
                  { color: delta > 0 ? Colors.success : delta < 0 ? '#E8A598' : Colors.textSecondary },
                ]}>
                  {delta > 0 ? '+' : ''}{delta}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: 'white', borderRadius: 16, padding: 16, gap: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorBar: { width: 4, height: 24, borderRadius: 2 },
  label: { fontSize: 14, fontWeight: '500', flex: 1 },
  fromValue: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  toValue: { fontSize: 16, fontWeight: '700' },
  deltaBadge: {
    minWidth: 36,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
  },
  deltaPositive: { backgroundColor: 'rgba(78, 205, 196, 0.15)' },
  deltaNegative: { backgroundColor: 'rgba(232, 165, 152, 0.15)' },
  deltaNeutral: { backgroundColor: '#F5F5F3' },
  deltaText: { fontSize: 12, fontWeight: '700' },
});
```

---

## Share Button

```typescript
// src/components/compare/ShareButton.tsx
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ScanSession } from '@/types/scan';
import { Colors } from '@/theme/colors';

interface Props {
  fromSession: ScanSession;
  toSession: ScanSession;
}

export function ShareButton({ fromSession, toSession }: Props) {
  const router = useRouter();
  
  function handleShare() {
    // Navigate to share card preview screen or open share sheet
    router.push({
      pathname: '/share-comparison',
      params: { fromId: fromSession.id, toId: toSession.id },
    });
  }
  
  return (
    <Pressable style={styles.button} onPress={handleShare}>
      <Ionicons name="share-outline" size={20} color={Colors.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

---

## Segmented Control

```typescript
// src/components/ui/SegmentedControl.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';

interface Option<T extends string> {
  label: string;
  value: T;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={[styles.option, value === option.value && styles.optionActive]}
          onPress={() => onChange(option.value)}
        >
          <Text style={[styles.label, value === option.value && styles.labelActive]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: '#F5F5F3', borderRadius: 10, padding: 3 },
  option: { flex: 1, padding: 8, borderRadius: 8, alignItems: 'center' },
  optionActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  labelActive: { color: Colors.textPrimary },
});
```
