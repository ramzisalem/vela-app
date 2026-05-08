# 13 — Share Cards

## Overview
Generate beautifully designed shareable cards from scan data. Three primary card types: score reveal, perceived age, and weekly comparison. Cards render off-screen via `react-native-view-shot` and export as PNG for sharing or saving.

---

## Design tokens — share-card-specific palette

Share cards intentionally use a separate color palette from the in-app design system (file 15) because they appear in social feeds where Vela's cream-and-espresso looks washed out. Cards use a darker, saturated palette optimized for thumbnails. To prevent the literal `rgba(...)` values from drifting, file 15 exports a `shareCardTheme` object that this file consumes:

```typescript
// imported from @/theme/shareCardTheme (defined in file 15)
export const shareCardTheme = {
  background: { dark: '#16110D', cream: '#F5EFE5' },
  text:       { primary: '#F5EFE5', secondary: 'rgba(245, 239, 229, 0.6)', watermark: 'rgba(245, 239, 229, 0.5)' },
  accent:     { gradient: ['#F5B0B0', '#C9A6CF', '#9BB7D6'] }, // VelaPrimary, locked
  rule:       'rgba(245, 239, 229, 0.15)',
};
```

Every share-card component MUST import `shareCardTheme`; raw `rgba(...)` values outside this token table are caught by the same lint rule that prevents `Palette` imports outside `colors.ts` (file 01). Watermark contrast meets WCAG AA on the dark background; verified at design review.

---

## Share Card Service

```typescript
// src/services/shareCardService.ts
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

export type ShareableFormat = 'vertical' | 'square' | 'horizontal';

export class ShareCardService {
  /**
   * Capture a view as PNG and share via system share sheet.
   */
  static async generateAndShare(viewRef: any, filename: string = 'vela-card'): Promise<string | null> {
    try {
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        fileName: filename,
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your Vela',
        });
      }
      
      return uri;
    } catch (error) {
      console.error('Failed to generate share card:', error);
      return null;
    }
  }
  
  /**
   * Save card to camera roll.
   *
   * Returns one of:
   *   'saved'              — saved successfully
   *   'permission_denied'  — caller should show Settings recovery UI
   *   'error'              — unexpected failure (network, file system, etc.)
   *
   * We DO NOT request photo library permission during onboarding — only here,
   * lazily, the first time the user asks to save a card. iOS treats the first
   * deny as final-ish (you can't re-prompt programmatically), so we only ever
   * ask when there's clear user intent. After deny, callers should render an
   * "Open Settings" button that calls `Linking.openSettings()`.
   *
   * Note: file size is capped to ~5 MB before save (Instagram / TikTok upload
   * ceiling). If `result: 'tmpfile'` produces a larger PNG, recompress to JPEG
   * at quality 0.9 first (PNG -> JPEG is lossless enough for share cards and
   * cuts size by 70-80%). See `compressIfNeeded` below.
   */
  static async saveToCameraRoll(
    viewRef: any,
    filename: string = 'vela-card',
  ): Promise<'saved' | 'permission_denied' | 'error'> {
    try {
      // Photo Library permission is asked LAZILY here — the first time a user
      // taps "Save to camera roll" — not during onboarding (file 07). Caller
      // (the share screen) MUST show inline help BEFORE this call:
      //   "Saves to your Photos. iOS will ask permission once."
      // This prevents the iOS modal from feeling like an ambush.
      const current = await MediaLibrary.getPermissionsAsync();
      const { status, canAskAgain } = current.granted
        ? current
        : await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        // canAskAgain === false means user picked "Don't allow" previously —
        // they have to enable from Settings. Caller uses file 22's canonical
        // permission-recovery banner pattern (Photo Library copy).
        return 'permission_denied';
      }

      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        fileName: filename,
      });

      const finalUri = await compressIfNeeded(uri, /* maxBytes */ 5_000_000);
      await MediaLibrary.saveToLibraryAsync(finalUri);
      return 'saved';
    } catch (error) {
      console.error('Failed to save share card:', error);
      return 'error';
    }
  }
  
  /**
   * Get appropriate dimensions for format.
   */
  static getDimensions(format: ShareableFormat): { width: number; height: number } {
    switch (format) {
      case 'vertical': return { width: 1080, height: 1920 }; // Stories, Reels
      case 'square': return { width: 1080, height: 1080 };   // Instagram feed
      case 'horizontal': return { width: 1920, height: 1080 }; // Twitter
    }
  }
}
```

---

## Score Reveal Card

```typescript
// src/components/share/ScoreShareCard.tsx
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import type { ScanScores, ScanSession } from '@/types/scan';
import { Colors } from '@/theme/colors';

interface Props {
  scores: ScanScores;
  session?: ScanSession;
  format?: 'vertical' | 'square';
}

export function ScoreShareCard({ scores, session, format = 'vertical' }: Props) {
  const dimensions = format === 'vertical' 
    ? { width: 390, height: 690 }
    : { width: 390, height: 390 };
  
  const overallDelta = scores.previousOverall ? scores.overall - scores.previousOverall : null;
  
  return (
    <View style={[styles.container, dimensions]}>
      {/*
        Share cards use the dark espresso variant of the cream theme:
        deep warm background that holds against any social feed. Big cream
        score number, gradient-lockup wordmark.
      */}
      <LinearGradient
        colors={['#16110D', '#241F1A', '#3D352B']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          {/* Gradient wordmark — the only place outside the app where it appears */}
          <Wordmark size="medium" variant="gradient" />
          {session && (
            <Text style={styles.weekBadge}>Week {session.weekNumber}</Text>
          )}
        </View>
        
        {/* Main score */}
        <View style={styles.scoreSection}>
          <Text style={styles.scoreLabel}>This week</Text>
          <Text style={styles.scoreNumber}>{scores.overall}</Text>
          
          {overallDelta !== null && overallDelta !== 0 && (
            <View style={[styles.deltaBadge, overallDelta > 0 ? styles.deltaPositive : styles.deltaNegative]}>
              <Text style={styles.deltaText}>
                {overallDelta > 0 ? '+' : ''}{overallDelta} this week
              </Text>
            </View>
          )}
        </View>
        
        {/* Sub-scores grid */}
        <View style={styles.subScores}>
          <SubScoreItem label="Skin" value={scores.skin} />
          <SubScoreItem label="Symmetry" value={scores.symmetry} />
          <SubScoreItem label="Definition" value={scores.definition} />
          <SubScoreItem label="Vitality" value={scores.vitality} />
          <SubScoreItem label="Grooming" value={scores.grooming} />
        </View>
        
        {/* Watermark */}
        <View style={styles.watermark}>
          <Text style={styles.watermarkBrand}>vela</Text>
          <Text style={styles.watermarkText}>Available on the App Store</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function SubScoreItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.subScoreItem}>
      <Text style={styles.subScoreValue}>{value}</Text>
      <Text style={styles.subScoreLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 24, overflow: 'hidden' },
  gradient: { flex: 1, padding: 32, justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '300', letterSpacing: 2 },
  weekBadge: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  
  scoreSection: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  scoreLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 8 },
  scoreNumber: { color: 'white', fontSize: 120, fontWeight: '700', lineHeight: 130 },
  
  deltaBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, marginTop: 8 },
  deltaPositive: { backgroundColor: 'rgba(78, 205, 196, 0.2)' },
  deltaNegative: { backgroundColor: 'rgba(232, 165, 152, 0.2)' },
  deltaText: { color: 'white', fontSize: 14, fontWeight: '600' },
  
  subScores: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 16 },
  subScoreItem: { alignItems: 'center', flex: 1 },
  subScoreValue: { color: 'white', fontSize: 22, fontWeight: '600' },
  subScoreLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 },
  
  watermark: { alignItems: 'center', gap: 4 },
  watermarkBrand: { color: 'rgba(255,255,255,0.3)', fontSize: 18, fontWeight: '300', letterSpacing: 3 },
  watermarkText: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
});
```

---

## Perceived Age Card

```typescript
// src/components/share/PerceivedAgeShareCard.tsx
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  actualAge: number;
  perceivedAge: number;
}

export function PerceivedAgeShareCard({ actualAge, perceivedAge }: Props) {
  const yearsYounger = actualAge - perceivedAge;
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F1729', '#1A2540']}
        style={styles.gradient}
      >
        <Text style={styles.label}>You look</Text>
        
        <View style={styles.ageRow}>
          <Text style={styles.ageNumber}>{perceivedAge}</Text>
          <Text style={styles.ageUnit}>years old</Text>
        </View>
        
        {yearsYounger > 0 && (
          <Text style={styles.delta}>
            {yearsYounger} {yearsYounger === 1 ? 'year' : 'years'} younger than your actual age
          </Text>
        )}
        
        {yearsYounger === 0 && (
          <Text style={styles.delta}>Right at your actual age</Text>
        )}
        
        <View style={styles.divider} />
        
        <Text style={styles.actualAge}>Actually {actualAge}</Text>
        
        <View style={styles.watermark}>
          <Text style={styles.watermarkBrand}>vela</Text>
          <Text style={styles.watermarkText}>Available on the App Store</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 390, height: 390, borderRadius: 24, overflow: 'hidden' },
  gradient: { flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center' },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: 16, marginBottom: 16 },
  ageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  ageNumber: { color: 'white', fontSize: 96, fontWeight: '700', lineHeight: 100 },
  ageUnit: { color: 'rgba(255,255,255,0.7)', fontSize: 18, marginBottom: 16 },
  delta: { color: '#4ECDC4', fontSize: 14, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  divider: { width: 40, height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 24 },
  actualAge: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  watermark: { position: 'absolute', bottom: 24, alignItems: 'center', gap: 2 },
  watermarkBrand: { color: 'rgba(255,255,255,0.3)', fontSize: 16, fontWeight: '300', letterSpacing: 2 },
  watermarkText: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
});

// Note: All styles use literal rgba colors (gradient overlays, watermarks).
// These are appropriate—no design token equivalent for gradient text overlays.
```

---

## Weekly Comparison Card

```typescript
// src/components/share/ComparisonShareCard.tsx
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import type { ScanSession } from '@/types/scan';
import { format } from 'date-fns';

interface Props {
  fromSession: ScanSession;
  toSession: ScanSession;
}

export function ComparisonShareCard({ fromSession, toSession }: Props) {
  const fromUri = `${FileSystem.documentDirectory}VelaPhotos/${fromSession.frontPhotoPath}`;
  const toUri = `${FileSystem.documentDirectory}VelaPhotos/${toSession.frontPhotoPath}`;
  
  const overallDelta = toSession.scores.overall - fromSession.scores.overall;
  const weeksBetween = toSession.weekNumber - fromSession.weekNumber;
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F1729', '#1A2540']}
        style={styles.gradient}
      >
        {/* Header */}
        <Text style={styles.title}>{weeksBetween} weeks of Vela</Text>
        
        {/* Photo comparison */}
        <View style={styles.photoRow}>
          <View style={styles.photoColumn}>
            <Image source={{ uri: fromUri }} style={styles.photo} resizeMode="cover" />
            <Text style={styles.photoLabel}>Week {fromSession.weekNumber}</Text>
            <Text style={styles.photoDate}>{format(new Date(fromSession.capturedAt), 'MMM d')}</Text>
          </View>
          
          <View style={styles.photoColumn}>
            <Image source={{ uri: toUri }} style={styles.photo} resizeMode="cover" />
            <Text style={styles.photoLabel}>Week {toSession.weekNumber}</Text>
            <Text style={styles.photoDate}>{format(new Date(toSession.capturedAt), 'MMM d')}</Text>
          </View>
        </View>
        
        {/* Score change */}
        {overallDelta !== 0 && (
          <View style={styles.deltaSection}>
            <Text style={styles.deltaLabel}>Overall score</Text>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreFrom}>{fromSession.scores.overall}</Text>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.scoreTo}>{toSession.scores.overall}</Text>
              <View style={[styles.deltaBadge, overallDelta > 0 ? styles.deltaPositive : styles.deltaNegative]}>
                <Text style={styles.deltaText}>
                  {overallDelta > 0 ? '+' : ''}{overallDelta}
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Watermark */}
        <View style={styles.watermark}>
          <Text style={styles.watermarkBrand}>vela</Text>
          <Text style={styles.watermarkText}>Download on the App Store</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 390, height: 690, borderRadius: 24, overflow: 'hidden' },
  gradient: { flex: 1, padding: 24, justifyContent: 'space-between' },
  title: { color: 'white', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  
  photoRow: { flexDirection: 'row', gap: 12, flex: 1 },
  photoColumn: { flex: 1, alignItems: 'center' },
  photo: { width: '100%', aspectRatio: 0.85, borderRadius: 12, backgroundColor: '#1A1A1A' },
  photoLabel: { color: 'white', fontSize: 14, fontWeight: '700', marginTop: 8 },
  photoDate: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  
  deltaSection: { alignItems: 'center', gap: 8, marginTop: 24 },
  deltaLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scoreFrom: { color: 'rgba(255,255,255,0.5)', fontSize: 32, fontWeight: '600' },
  arrow: { color: 'rgba(255,255,255,0.5)', fontSize: 20 },
  scoreTo: { color: 'white', fontSize: 36, fontWeight: '700' },
  deltaBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  deltaPositive: { backgroundColor: 'rgba(78, 205, 196, 0.2)' },
  deltaNegative: { backgroundColor: 'rgba(232, 165, 152, 0.2)' },
  deltaText: { color: 'white', fontSize: 14, fontWeight: '700' },
  
  watermark: { alignItems: 'center', gap: 2, marginTop: 16 },
  watermarkBrand: { color: 'rgba(255,255,255,0.3)', fontSize: 16, fontWeight: '300', letterSpacing: 2 },
  watermarkText: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
});
```

---

## Share Sheet Screen

A dedicated screen for previewing and sharing cards.

```typescript
// app/share-comparison.tsx
import { useRef, useState } from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScoreShareCard } from '@/components/share/ScoreShareCard';
import { ComparisonShareCard } from '@/components/share/ComparisonShareCard';
import { PerceivedAgeShareCard } from '@/components/share/PerceivedAgeShareCard';
import { ShareCardService } from '@/services/shareCardService';
import { useScanStore } from '@/stores/scanStore';
import { useProfileStore } from '@/stores/profileStore';
import { Colors } from '@/theme/colors';

type CardType = 'score' | 'comparison' | 'age';

export default function ShareComparisonScreen() {
  const router = useRouter();
  const { fromId, toId } = useLocalSearchParams<{ fromId: string; toId: string }>();
  const { sessions } = useScanStore();
  const { profile } = useProfileStore();
  
  const [selectedCard, setSelectedCard] = useState<CardType>('score');
  const [isExporting, setIsExporting] = useState(false);
  
  const fromSession = sessions.find((s) => s.id === fromId);
  const toSession = sessions.find((s) => s.id === toId);
  
  const cardRef = useRef<View>(null);
  
  if (!toSession) {
    return null;
  }
  
  async function handleShare() {
    if (!cardRef.current) return;
    
    setIsExporting(true);
    await ShareCardService.generateAndShare(cardRef.current, `vela-${selectedCard}-${Date.now()}`);
    setIsExporting(false);
  }
  
  async function handleSave() {
    if (!cardRef.current) return;
    
    setIsExporting(true);
    const saved = await ShareCardService.saveToCameraRoll(cardRef.current, `vela-${selectedCard}-${Date.now()}`);
    setIsExporting(false);
    
    if (saved) {
      // Show success toast
    }
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Share</Text>
        <View style={{ width: 28 }} />
      </View>
      
      {/* Card type selector */}
      <View style={styles.cardSelector}>
        <CardTypeButton
          icon="trending-up"
          label="Score"
          isSelected={selectedCard === 'score'}
          onPress={() => setSelectedCard('score')}
        />
        {fromSession && (
          <CardTypeButton
            icon="git-compare"
            label="Comparison"
            isSelected={selectedCard === 'comparison'}
            onPress={() => setSelectedCard('comparison')}
          />
        )}
        {toSession.scores.perceivedAge && profile?.age && (
          <CardTypeButton
            icon="time"
            label="Age"
            isSelected={selectedCard === 'age'}
            onPress={() => setSelectedCard('age')}
          />
        )}
      </View>
      
      {/* Card preview */}
      <ScrollView contentContainerStyle={styles.preview}>
        <View ref={cardRef} collapsable={false}>
          {selectedCard === 'score' && (
            <ScoreShareCard scores={toSession.scores} session={toSession} />
          )}
          {selectedCard === 'comparison' && fromSession && (
            <ComparisonShareCard fromSession={fromSession} toSession={toSession} />
          )}
          {selectedCard === 'age' && toSession.scores.perceivedAge && profile?.age && (
            <PerceivedAgeShareCard actualAge={profile.age} perceivedAge={toSession.scores.perceivedAge} />
          )}
        </View>
      </ScrollView>
      
      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={[styles.actionButton, styles.saveButton]} onPress={handleSave} disabled={isExporting}>
          <Ionicons name="download" size={20} color={Colors.textPrimary} />
          <Text style={styles.actionLabel}>Save</Text>
        </Pressable>
        
        <Pressable style={[styles.actionButton, styles.shareButton]} onPress={handleShare} disabled={isExporting}>
          {isExporting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="share" size={20} color="white" />
              <Text style={[styles.actionLabel, styles.shareLabel]}>Share</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CardTypeButton({ icon, label, isSelected, onPress }: any) {
  return (
    <Pressable
      style={[styles.cardTypeButton, isSelected && styles.cardTypeButtonSelected]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color={isSelected ? 'white' : Colors.textSecondary} />
      <Text style={[styles.cardTypeLabel, isSelected && styles.cardTypeLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: { fontSize: 17, fontWeight: '600' },
  cardSelector: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  cardTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F5F5F3',
  },
  cardTypeButtonSelected: { backgroundColor: Colors.accent },
  cardTypeLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  cardTypeLabelSelected: { color: 'white' },
  preview: { padding: 16, alignItems: 'center' },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveButton: { backgroundColor: '#F5F5F3' },
  shareButton: { backgroundColor: Colors.accent },
  actionLabel: { fontSize: 16, fontWeight: '600' },
  shareLabel: { color: 'white' },
});
```
