/**
 * WatermelonDB model for scan_sessions (file 01).
 *
 * Local cache only — the source of truth lives in Supabase `scan_results`.
 * The local copy lets the comparison and history surfaces render instantly
 * without a round-trip on cold start.
 */
import { Model } from '@nozbe/watermelondb';
import { date, field } from '@nozbe/watermelondb/decorators';

export class ScanSessionModel extends Model {
  static override table = 'scan_sessions';

  @field('remote_id') remoteId!: string;
  @field('user_id') userId!: string;
  @date('created_at') createdAt!: Date;
  @field('week_number') weekNumber!: number;
  @field('is_baseline') isBaseline!: boolean;
  @field('score_overall') scoreOverall!: number;
  @field('score_skin') scoreSkin!: number;
  @field('score_symmetry') scoreSymmetry!: number;
  @field('score_grooming') scoreGrooming!: number;
  @field('score_lighting') scoreLighting!: number;
  @field('score_contour') scoreContour!: number;
  @field('vela_sync_status') velaSyncStatus!: string;
  @field('photos_json') photosJson!: string;
  @field('context_json') contextJson!: string;
  @field('raw_metrics_json') rawMetricsJson!: string;
  @field('capture_3d_json') capture3dJson!: string | null;
}
