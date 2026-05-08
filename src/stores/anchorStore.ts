/**
 * Scan-anchor store (file 42).
 */
import { create } from 'zustand';
import type { ScanAnchor, ScanAnchorKind } from '@/types/anchor';

const initial: ScanAnchor = {
  kind: 'none',
  notificationsEnabled: true,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

interface Store {
  anchor: ScanAnchor;
  setAnchor: (anchor: ScanAnchor) => void;
  setKind: (kind: ScanAnchorKind, opts?: { customLabel?: string; dayOfWeek?: number; hour?: number; minute?: number }) => void;
}

const PROFANITY_RE = /\b(?:fuck|shit|bitch|cunt|asshole)\b/i;

export const useAnchorStore = create<Store>((set) => ({
  anchor: initial,
  setAnchor: (anchor) => set({ anchor }),
  setKind: (kind, opts) =>
    set((s) => {
      const customLabel = opts?.customLabel
        ? sanitizeCustomLabel(opts.customLabel)
        : undefined;
      return {
        anchor: {
          ...s.anchor,
          kind,
          customLabel,
          dayOfWeek: opts?.dayOfWeek ?? s.anchor.dayOfWeek,
          hour: opts?.hour ?? s.anchor.hour,
          minute: opts?.minute ?? s.anchor.minute,
          updatedAt: new Date().toISOString(),
        },
      };
    }),
}));

function sanitizeCustomLabel(input: string): string {
  return input.replace(PROFANITY_RE, '').slice(0, 32).trim();
}
