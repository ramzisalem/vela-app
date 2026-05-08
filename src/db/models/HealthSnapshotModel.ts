/**
 * WatermelonDB model for health_snapshots (file 33).
 *
 * IMPORTANT: snapshots NEVER leave the device — they are persisted only in
 * this local table and consumed by the on-device correlation engine.
 */
import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class HealthSnapshotModel extends Model {
  static override table = 'health_snapshots';

  @field('user_id') userId!: string;
  @field('date') date!: string;
  @field('payload_json') payloadJson!: string;
}
