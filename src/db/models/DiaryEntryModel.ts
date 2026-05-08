/**
 * WatermelonDB model for diary_entries (file 37).
 *
 * Diary is local-first by spec. The body is stored in plaintext on the
 * device's encrypted-at-rest filesystem; we never encrypt it client-side
 * because the user needs full-text search.
 */
import { Model } from '@nozbe/watermelondb';
import { date, field } from '@nozbe/watermelondb/decorators';

export class DiaryEntryModel extends Model {
  static override table = 'diary_entries';

  @field('remote_id') remoteId!: string;
  @field('user_id') userId!: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('body') body!: string;
  @field('user_tags_json') userTagsJson!: string;
  @field('inferred_tags_json') inferredTagsJson!: string;
  @field('attached_kind') attachedKind!: string;
  @field('attached_id') attachedId!: string | null;
  @field('attached_date') attachedDate!: string | null;
  @field('exclude_from_analysis') excludeFromAnalysis!: boolean;
  @field('source') source!: string;
}
