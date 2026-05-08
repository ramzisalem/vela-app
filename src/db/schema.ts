/**
 * WatermelonDB schema (file 01 + file 09 + file 37).
 *
 * Migration policy: never edit a past schema entry. New columns or tables
 * land as a numbered migration in `migrations.ts`. The schema version below
 * is the cumulative current version after all migrations apply.
 */
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const SCHEMA_VERSION = 1;

export const schema = appSchema({
  version: SCHEMA_VERSION,
  tables: [
    tableSchema({
      name: 'scan_sessions',
      columns: [
        { name: 'remote_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'week_number', type: 'number' },
        { name: 'is_baseline', type: 'boolean' },
        { name: 'score_overall', type: 'number' },
        { name: 'score_skin', type: 'number' },
        { name: 'score_symmetry', type: 'number' },
        { name: 'score_grooming', type: 'number' },
        { name: 'score_lighting', type: 'number' },
        { name: 'score_contour', type: 'number' },
        { name: 'vela_sync_status', type: 'string' },
        { name: 'photos_json', type: 'string' },
        { name: 'context_json', type: 'string' },
        { name: 'raw_metrics_json', type: 'string' },
        { name: 'capture_3d_json', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'daily_routines',
      columns: [
        { name: 'remote_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'week_number', type: 'number', isIndexed: true },
        { name: 'generated_at', type: 'number' },
        { name: 'tasks_json', type: 'string' },
        { name: 'personalization_note', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'user_products',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'category', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'started_at', type: 'number' },
        { name: 'stopped_at', type: 'number', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'diary_entries',
      columns: [
        { name: 'remote_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number' },
        { name: 'body', type: 'string' },
        { name: 'user_tags_json', type: 'string' },
        { name: 'inferred_tags_json', type: 'string' },
        { name: 'attached_kind', type: 'string' },
        { name: 'attached_id', type: 'string', isOptional: true },
        { name: 'attached_date', type: 'string', isOptional: true },
        { name: 'exclude_from_analysis', type: 'boolean' },
        { name: 'source', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'health_snapshots',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'date', type: 'string', isIndexed: true },
        { name: 'payload_json', type: 'string' },
      ],
    }),
  ],
});
