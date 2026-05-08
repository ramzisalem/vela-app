/**
 * Sensitivity-review release gate (file 48 + Sprint 6).
 *
 * HRT and cancer-recovery modes ship after the sensitivity review (oncology-
 * aware copy review for cancer recovery, trans-inclusive copy review for HRT).
 * Until both reviews are signed off, the modes are framework-supported but
 * hidden from the Settings → Health & lifestyle picker.
 *
 * Toggle by setting EXPO_PUBLIC_RELEASE_HRT_MODES=true and
 * EXPO_PUBLIC_RELEASE_CANCER_RECOVERY=true in the relevant EAS profile after
 * the review completes. The flag is read at boot.
 */
import type { LifeStageModeId } from '@/types/lifeStage';

const env = (k: string) => process.env[k];

export const releaseFlags = {
  hrt: env('EXPO_PUBLIC_RELEASE_HRT_MODES') === 'true',
  cancerRecovery: env('EXPO_PUBLIC_RELEASE_CANCER_RECOVERY') === 'true',
};

/**
 * Returns the modes the user is allowed to enable from the picker. The
 * underlying types and AI prompt blocks are always present — the gate is a
 * UI-only suppression so that an enabled mode (post-review) keeps working
 * even if a user updates from a build where the gate flag was off.
 */
export function visibleModesForPicker(): ReadonlyArray<LifeStageModeId> {
  const all: LifeStageModeId[] = [
    'pregnancy',
    'postpartum',
    'menopause',
    'hrt_estrogen',
    'hrt_testosterone',
    'cancer_recovery',
  ];
  return all.filter((id) => {
    if (id === 'hrt_estrogen' || id === 'hrt_testosterone') return releaseFlags.hrt;
    if (id === 'cancer_recovery') return releaseFlags.cancerRecovery;
    return true;
  });
}
