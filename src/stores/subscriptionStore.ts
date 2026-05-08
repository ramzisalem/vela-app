import { create } from 'zustand';
import type { SubscriptionStatus } from '@/types';

interface SubscriptionStore {
  status: SubscriptionStatus | null;
  setStatus: (status: SubscriptionStatus | null) => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  status: null,
  setStatus: (status) => set({ status }),
}));
