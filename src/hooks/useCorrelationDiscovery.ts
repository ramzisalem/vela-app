/**
 * useCorrelationDiscovery (file 33).
 *
 * Triggers an on-device correlation pass when the user has both:
 *   - Granted HealthKit read permission
 *   - At least 21 days of scans + 21 days of HealthKit snapshots
 *
 * Raw HealthKit values never leave the device. Only `Correlation` entries
 * (rounded r, p-value, sample size, and the AI-generated insight copy) are
 * persisted. The AI proxy receives ONLY the aggregated stats — the
 * `generateHealthInsight` call passes `{ pearsonR, pValue, sampleSize,
 * faceMetric, healthSignal }`, never the underlying samples.
 */
import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { buildCorrelations } from '@/core/correlations/correlationEngine';
import { AIService } from '@/services/ai';
import { getHealthService } from '@/services/health';
import { useHealthStore } from '@/stores/healthStore';
import { useScanStore } from '@/stores/scanStore';
import type { Correlation } from '@/types/health';

interface DiscoveryResult {
  discovered: number;
  total: number;
}

export function useCorrelationDiscovery() {
  const [running, setRunning] = useState(false);
  const setCorrelations = useHealthStore((s) => s.setCorrelations);
  const snapshots = useHealthStore((s) => s.snapshots);
  const sessions = useScanStore((s) => s.sessions);

  const run = useCallback(async (): Promise<DiscoveryResult> => {
    setRunning(true);
    try {
      const candidates = buildCorrelations({
        scans: sessions,
        snapshots,
      });
      const enriched: Correlation[] = [];
      for (const c of candidates) {
        let insight = defaultInsightCopy(c);
        try {
          const ai = await AIService.generateHealthInsight({
            faceMetric: c.faceMetric,
            healthSignal: c.healthSignal,
            pearsonR: Number(c.pearsonR.toFixed(3)),
            pValue: Number(c.pValue.toFixed(4)),
            sampleSize: c.sampleSize,
          });
          if (ai && typeof ai === 'object' && 'insight' in ai) {
            insight = String((ai as { insight: unknown }).insight ?? insight);
          }
        } catch {
          // Fall back to default copy.
        }
        enriched.push({
          id: uuidv4(),
          faceMetric: c.faceMetric,
          healthSignal: c.healthSignal,
          pearsonR: c.pearsonR,
          pValue: c.pValue,
          sampleSize: c.sampleSize,
          insight,
          generatedAt: new Date().toISOString(),
        });
      }
      setCorrelations(enriched);
      return { discovered: enriched.length, total: candidates.length };
    } finally {
      setRunning(false);
    }
  }, [sessions, snapshots, setCorrelations]);

  const isEligible = useCallback(() => {
    const oldest = sessions[0]?.createdAt ?? null;
    return getHealthService().isEligibleForHealthAsk(sessions.length, oldest);
  }, [sessions]);

  return { run, running, isEligible };
}

function defaultInsightCopy(c: {
  faceMetric: string;
  healthSignal: string;
}): string {
  return `A pattern showed up between ${c.healthSignal} and ${c.faceMetric}. Worth watching.`;
}
