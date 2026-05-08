/**
 * Scan anchor (file 42).
 *
 * The user binds their weekly scan to a recurring life moment in onboarding.
 * The anchor drives reminder copy and the next-scan countdown shown on
 * widgets and the lock screen.
 */
export type ScanAnchorKind =
  | 'sunday-coffee'
  | 'sunday-bed'
  | 'friday-wind-down'
  | 'monday-fresh'
  | 'custom'
  | 'none';

export interface ScanAnchor {
  kind: ScanAnchorKind;
  /** Free-text label (≤32 chars, sanitized) when kind === 'custom'. */
  customLabel?: string;
  /** 0=Sun..6=Sat, JS Date semantics. Required when kind !== 'none'. */
  dayOfWeek?: number;
  /** 0..23 in user's local timezone. */
  hour?: number;
  /** 0..59. */
  minute?: number;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnchorOption {
  kind: ScanAnchorKind;
  label: string;
  /** Soft glyph; the file-21 emoji exception applies to this single screen. */
  glyph: string;
  defaultDayOfWeek?: number;
  defaultHour?: number;
}

export const ANCHOR_PRESETS: ReadonlyArray<AnchorOption> = [
  { kind: 'sunday-coffee', label: 'Sunday coffee', glyph: '☕', defaultDayOfWeek: 0, defaultHour: 9 },
  { kind: 'sunday-bed', label: 'Sunday before bed', glyph: '🌙', defaultDayOfWeek: 0, defaultHour: 22 },
  {
    kind: 'friday-wind-down',
    label: 'Friday wind-down',
    glyph: '🧖',
    defaultDayOfWeek: 5,
    defaultHour: 21,
  },
  {
    kind: 'monday-fresh',
    label: 'Monday morning fresh start',
    glyph: '🌅',
    defaultDayOfWeek: 1,
    defaultHour: 7,
  },
  { kind: 'custom', label: 'Custom', glyph: '✿' },
  { kind: 'none', label: 'No anchor — just remind me', glyph: ' ' },
];

/** Anchor-aware reminder copy (no exclamation marks). */
export function copyForAnchor(anchor: ScanAnchor | null | undefined): string {
  if (!anchor || anchor.kind === 'none') return 'Time for your weekly scan.';
  switch (anchor.kind) {
    case 'sunday-coffee':
      return 'Sunday coffee scan — when you’re ready.';
    case 'sunday-bed':
      return 'Tonight, before bed. We’ll be here.';
    case 'friday-wind-down':
      return 'Friday night, no rush.';
    case 'monday-fresh':
      return 'Monday morning fresh start — your scan window is open.';
    case 'custom':
      return anchor.customLabel
        ? `${anchor.customLabel} scan, when you have a sec.`
        : 'Your scan window is open.';
  }
}
