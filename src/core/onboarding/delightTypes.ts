/**
 * Shared types for onboarding delight visualizations (core layer).
 */
export interface DelightVizSpec {
  bars?: number[];
  barLabels?: string[];
  sparkline?: number[];
  ring?: { fraction: number; caption?: string };
  heatStrip?: number[];
}
