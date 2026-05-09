/**
 * Age selection for onboarding Q2.
 * Uses `@react-native-picker/picker` when the native module is linked (rebuild dev client after install).
 * Falls back to an in-app list if `RNCPicker` is not in the binary (avoids crash until you run `expo run:ios` / `expo run:android`).
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList, Platform, Pressable, UIManager, View, type ListRenderItem } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Haptics from 'expo-haptics';
import { Body } from '@/components/ui/Text';
import { useColors, useThemeMode } from '@/theme/ThemeContext';
import { getShadow } from '@/theme/shadows';
import { Layout, Radii, Spacing } from '@/theme/spacing';

export interface AgeScrollListProps {
  min: number;
  max: number;
  value: number | undefined;
  onChange: (age: number) => void;
  bottomContentInset?: number;
  headerBottomFade?: number;
}

const NATIVE_PICKER_AVAILABLE = UIManager.getViewManagerConfig('RNCPicker') != null;

const IOS_WHEEL_HEIGHT = 216;
const ROW_HEIGHT = 64;
const ROW_GAP = Spacing.md;
const ROW_EXTENT = ROW_HEIGHT + ROW_GAP;

function AgePickerNative({
  min,
  max,
  value,
  onChange,
  bottomContentInset,
  headerBottomFade = 0,
}: AgeScrollListProps) {
  const colors = useColors();

  const items = useMemo(() => {
    const out: { label: string; value: string }[] = [];
    for (let a = min; a <= max; a++) {
      out.push({ label: `${a} years`, value: String(a) });
    }
    return out;
  }, [min, max]);

  const fallback = 30;
  const coerced =
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(max, Math.max(min, Math.round(value)))
      : fallback;
  const selectedValue = String(coerced);

  return (
    <View
      style={{
        flex: 1,
        marginTop: headerBottomFade ? -headerBottomFade : 0,
        paddingTop: Spacing.md + headerBottomFade,
        paddingBottom: bottomContentInset ?? Spacing.xxl,
        justifyContent: Platform.OS === 'ios' ? 'center' : 'flex-start',
      }}
    >
      <Picker
        accessibilityLabel="Age in years"
        selectedValue={selectedValue}
        onValueChange={(v) => {
          const n = Number.parseInt(String(v), 10);
          if (Number.isFinite(n)) onChange(n);
        }}
        mode={Platform.OS === 'android' ? 'dropdown' : undefined}
        dropdownIconColor={colors.text.secondary}
        prompt="Age"
        style={
          Platform.OS === 'ios'
            ? { width: '100%', height: IOS_WHEEL_HEIGHT }
            : { width: '100%', color: colors.text.primary }
        }
        itemStyle={
          Platform.OS === 'ios'
            ? {
                fontSize: 22,
                color: colors.text.primary,
              }
            : undefined
        }
        selectionColor={Platform.OS === 'ios' ? colors.border.accent : undefined}
      >
        {items.map((it) => (
          <Picker.Item
            key={it.value}
            label={it.label}
            value={it.value}
            color={Platform.OS === 'android' ? colors.text.primary : undefined}
          />
        ))}
      </Picker>
    </View>
  );
}

function AgeScrollListFallback({
  min,
  max,
  value,
  onChange,
  bottomContentInset,
  headerBottomFade = 0,
}: AgeScrollListProps) {
  const listRef = useRef<FlatList<number>>(null);
  const didInitialScroll = useRef(false);
  const colors = useColors();
  const mode = useThemeMode();

  const ages = useMemo(() => {
    const out: number[] = [];
    for (let a = min; a <= max; a++) out.push(a);
    return out;
  }, [min, max]);

  const scrollToAge = useCallback(
    (age: number, animated: boolean) => {
      const index = Math.min(Math.max(age - min, 0), ages.length - 1);
      listRef.current?.scrollToIndex({ index, animated, viewPosition: 0.32 });
    },
    [ages.length, min],
  );

  useEffect(() => {
    if (didInitialScroll.current) return;
    didInitialScroll.current = true;
    const anchor = value ?? 30;
    const id = requestAnimationFrame(() => {
      scrollToAge(anchor, false);
    });
    return () => cancelAnimationFrame(id);
  }, [scrollToAge, value]);

  const getItemLayout = useCallback(
    (_: ArrayLike<number> | null | undefined, index: number) => ({
      length: ROW_EXTENT,
      offset: ROW_EXTENT * index,
      index,
    }),
    [],
  );

  const renderItem: ListRenderItem<number> = useCallback(
    ({ item }) => {
      const selected = value === item;
      return (
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(item);
            scrollToAge(item, true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${item} years old`}
          accessibilityState={{ selected }}
          style={{ marginBottom: ROW_GAP }}
        >
          <View
            style={{
              height: ROW_HEIGHT,
              paddingHorizontal: Spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.md,
              borderRadius: Radii.lg,
              borderWidth: selected ? 1 : Layout.hairline,
              borderColor: selected ? colors.border.accent : colors.border.subtle,
              backgroundColor: selected ? colors.accent.background : colors.background.tertiary,
              ...(selected ? getShadow('soft', mode) : getShadow('none', mode)),
            }}
          >
            <Body tone={selected ? 'accent' : 'primary'} variant="bodyEmphasis" style={{ fontSize: 22, flex: 1 }}>
              {`${item} years`}
            </Body>
          </View>
        </Pressable>
      );
    },
    [colors, mode, onChange, scrollToAge, value],
  );

  return (
    <FlatList
      ref={listRef}
      style={{ flex: 1, marginTop: headerBottomFade ? -headerBottomFade : 0 }}
      data={ages}
      keyExtractor={(a) => String(a)}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: Spacing.md + headerBottomFade,
        paddingBottom: bottomContentInset ?? Spacing.xxl,
      }}
      onScrollToIndexFailed={(info) => {
        setTimeout(() => {
          listRef.current?.scrollToIndex({
            index: info.index,
            animated: true,
            viewPosition: 0.32,
          });
        }, 100);
      }}
    />
  );
}

export function AgeScrollList(props: AgeScrollListProps) {
  if (NATIVE_PICKER_AVAILABLE) {
    return <AgePickerNative {...props} />;
  }
  return <AgeScrollListFallback {...props} />;
}
