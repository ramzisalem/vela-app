/**
 * Push aggregated hair densities to Supabase (file 35). Photos never leave
 * the device; this row is numeric only.
 */
import { supabase } from '@/services/supabase';
import type { HairScan } from '@/types/hair';

export async function syncHairScanToSupabase(scan: HairScan): Promise<void> {
  const { error } = await supabase.from('hair_scans').insert({
    id: scan.id,
    user_id: scan.userId,
    captured_at: scan.capturedAt,
    density_overall: scan.densityScores.overall,
    density_crown: scan.densityScores.crown,
    density_hairline: scan.densityScores.hairline,
    density_temple_left: scan.densityScores.templeLeft,
    density_temple_right: scan.densityScores.templeRight,
  });
  if (error) throw error;
}

export interface HairScanRow {
  id: string;
  user_id: string;
  captured_at: string;
  density_overall: number;
  density_crown: number;
  density_hairline: number;
  density_temple_left: number;
  density_temple_right: number;
}

export function rowToHairScan(row: HairScanRow): HairScan {
  return {
    id: row.id,
    userId: row.user_id,
    capturedAt: row.captured_at,
    photoPaths: [],
    densityScores: {
      overall: row.density_overall,
      crown: row.density_crown,
      hairline: row.density_hairline,
      templeLeft: row.density_temple_left,
      templeRight: row.density_temple_right,
    },
  };
}

export async function fetchHairScansForUser(userId: string): Promise<HairScan[]> {
  const { data, error } = await supabase
    .from('hair_scans')
    .select('*')
    .eq('user_id', userId)
    .order('captured_at', { ascending: true });
  if (error || !data) return [];
  return (data as HairScanRow[]).map(rowToHairScan);
}
