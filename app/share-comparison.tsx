import React from 'react';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ShareComparison() {
  return (
    <Screen>
      <EmptyState
        title="Share card."
        body="Score, perceived age, or comparison cards generated off-screen (Sprint 4)."
      />
    </Screen>
  );
}
