/**
 * useSingularPostBaselineInit (file 31).
 *
 * Hook that requests ATT + initializes Singular ONCE — after the user
 * sees their baseline reveal but before the paywall is presented. Idempotent.
 */
import { useEffect, useRef } from 'react';
import { SingularAttribution } from '@/services/attribution/singular';

export function useSingularPostBaselineInit() {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void SingularAttribution.requestATTAndInit();
  }, []);
}
