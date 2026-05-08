/**
 * Tiny SVG-free sparkline. Uses absolute-positioned bars so we don't
 * need react-native-svg in the dashboard hot path. The chart stays
 * small (≤ 80px tall) and is purely informational — never the only
 * way to read a number.
 *
 * Bars are rendered at fixed widths with proportional heights mapped
 * from the value's distance from the series min. Empty series renders
 * a flat baseline placeholder so the layout doesn't jump.
 */
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useColors } from '@/theme';
import { Caption } from '@/components/ui/Text';
import { Spacing } from '@/theme/spacing';

export interface SparklineProps {
  values: ReadonlyArray<number>;
  height?: number;
  /** Optional axis labels; rendered below the bars. */
  startLabel?: string;
  endLabel?: string;
  /** Visually highlight the latest value. */
  highlightLast?: boolean;
  style?: ViewStyle;
}

export function Sparkline({
  values,
  height = 64,
  startLabel,
  endLabel,
  highlightLast = true,
  style,
}: SparklineProps) {
  const colors = useColors();
  const safe = values.length === 0 ? [0] : values;
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = Math.max(max - min, 1);

  return (
    <View style={style}>
      <View
        style={[
          styles.row,
          {
            height,
            borderColor: colors.border.subtle,
          },
        ]}
        accessibilityRole="image"
        accessibilityLabel={`Trend chart with ${safe.length} data points.`}
      >
        {safe.map((v, idx) => {
          const ratio = (v - min) / range;
          const barH = Math.max(2, Math.round(ratio * (height - 4)));
          const isLast = idx === safe.length - 1;
          return (
            <View
              key={`bar-${idx}`}
              style={[
                styles.bar,
                {
                  height: barH,
                  backgroundColor:
                    highlightLast && isLast ? colors.text.primary : colors.text.tertiary,
                },
              ]}
            />
          );
        })}
      </View>
      {(startLabel || endLabel) ? (
        <View style={styles.labels}>
          <Caption tone="tertiary">{startLabel ?? ''}</Caption>
          <Caption tone="tertiary">{endLabel ?? ''}</Caption>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    paddingVertical: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
    minWidth: 2,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
});
