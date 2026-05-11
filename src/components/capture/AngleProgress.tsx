/**
 * AngleProgress (file 05 — redesigned).
 *
 * Horizontal connected-step indicator for the three scan angles.
 *
 *   ●───────○───────○
 *  Front   Left   Right
 *
 * States:
 *  • Done    — solid copper fill + white checkmark
 *  • Current — solid white fill + dark step number
 *  • Upcoming— translucent dark + white border + dim step number
 *
 * Connecting lines fill with copper once the left node is captured.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Caption } from '@/components/ui/Text';
import { useColors } from '@/theme/ThemeContext';
import { Spacing } from '@/theme/spacing';

const ORDER = ['front', 'left_turn', 'right_turn'] as const;
type Angle = (typeof ORDER)[number];

const SHORT_LABELS: Record<Angle, string> = {
  front:      'Front',
  left_turn:  'Left',
  right_turn: 'Right',
};

const NODE = 30; // circle diameter

export interface AngleProgressProps {
  current: Angle;
  captured: ReadonlyArray<Angle>;
}

interface NodeProps {
  index: number;
  angle: Angle;
  done: boolean;
  current: boolean;
}

function StepNode({ index, done, current }: NodeProps) {
  const colors = useColors();

  const bg = done
    ? colors.accent.default
    : current
    ? '#FFFFFF'
    : 'rgba(0,0,0,0.30)';

  const borderColor = done
    ? colors.accent.default
    : current
    ? '#FFFFFF'
    : 'rgba(255,255,255,0.35)';

  const numColor = done
    ? '#FFFFFF'
    : current
    ? '#0F0F12'
    : 'rgba(255,255,255,0.45)';

  return (
    <View
      style={[
        styles.node,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: done ? 0 : 1.5,
        },
      ]}
      accessibilityLabel={`Step ${index + 1}: ${done ? 'captured' : current ? 'active' : 'upcoming'}`}
    >
      {done ? (
        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
      ) : (
        <Caption style={{ color: numColor, fontWeight: '700', fontSize: 11, lineHeight: 14 }}>
          {index + 1}
        </Caption>
      )}
    </View>
  );
}

export function AngleProgress({ current, captured }: AngleProgressProps) {
  const colors = useColors();

  return (
    <View style={styles.wrapper}>
      {/* ── Circle row ─────────────────────────────────────────── */}
      <View style={styles.circleRow}>
        {ORDER.map((angle, i) => {
          const done = captured.includes(angle);
          const isCurrent = angle === current;

          return (
            <React.Fragment key={angle}>
              <StepNode
                index={i}
                angle={angle}
                done={done}
                current={isCurrent}
              />
              {i < ORDER.length - 1 && (
                <View style={styles.connectorTrack}>
                  <View
                    style={[
                      styles.connectorFill,
                      {
                        backgroundColor: done
                          ? colors.accent.default
                          : 'rgba(255,255,255,0.22)',
                        width: '100%',
                      },
                    ]}
                  />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* ── Label row ──────────────────────────────────────────── */}
      <View style={styles.labelRow}>
        {ORDER.map((angle) => {
          const isCurrent = angle === current;
          const isDone = captured.includes(angle);
          return (
            <Caption
              key={angle}
              style={[
                styles.label,
                {
                  color: isDone || isCurrent
                    ? 'rgba(255,255,255,0.90)'
                    : 'rgba(255,255,255,0.38)',
                  fontWeight: isCurrent ? '600' : '400',
                },
              ]}
            >
              {SHORT_LABELS[angle]}
            </Caption>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    minWidth: 220,
  },
  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorTrack: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  connectorFill: {
    height: '100%',
    borderRadius: 1,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs + 2,
    paddingHorizontal: 2,
  },
  label: {
    width: NODE,
    textAlign: 'center',
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
