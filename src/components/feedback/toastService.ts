/**
 * Toast service (file 22).
 *
 * Canonical rules:
 *   - Max 1 toast at a time. If a new toast comes in, the current one
 *     animates OUT (150ms), then the new one animates IN (150ms) — no queue.
 *   - Auto-dismiss after 5 seconds.
 *   - Reduce Motion (file 28) replaces in/out with instant.
 *   - Live region politeness varies by variant.
 */
import { create } from 'zustand';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  /** ISO duration in ms. */
  durationMs: number;
  liveRegion: 'polite' | 'assertive';
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastStore {
  current: Toast | null;
  show: (toast: Omit<Toast, 'id' | 'durationMs' | 'liveRegion'> & Partial<Toast>) => void;
  dismiss: () => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  current: null,
  show: (toast) => {
    const id = Math.random().toString(36).slice(2);
    const durationMs = toast.durationMs ?? 5000;
    const liveRegion: 'polite' | 'assertive' =
      toast.variant === 'error' ? 'assertive' : 'polite';
    set({
      current: {
        id,
        message: toast.message,
        variant: toast.variant ?? 'info',
        durationMs,
        liveRegion,
        actionLabel: toast.actionLabel,
        onAction: toast.onAction,
      },
    });
    setTimeout(() => {
      if (get().current?.id === id) get().dismiss();
    }, durationMs);
  },
  dismiss: () => set({ current: null }),
}));

export const toast = {
  info: (message: string, opts: Partial<Toast> = {}) =>
    useToastStore.getState().show({ message, variant: 'info', ...opts }),
  success: (message: string, opts: Partial<Toast> = {}) =>
    useToastStore.getState().show({ message, variant: 'success', ...opts }),
  warning: (message: string, opts: Partial<Toast> = {}) =>
    useToastStore.getState().show({ message, variant: 'warning', ...opts }),
  error: (message: string, opts: Partial<Toast> = {}) =>
    useToastStore.getState().show({ message, variant: 'error', ...opts }),
};
