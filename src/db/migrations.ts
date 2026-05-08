/**
 * WatermelonDB migrations (file 01).
 *
 * MIGRATION POLICY (doc-locked, file 01): never edit past migrations. Each
 * schema change adds a new entry to this array. The current `SCHEMA_VERSION`
 * lives in `schema.ts` and must equal the highest `toVersion` here.
 */
import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    // v0 → v1: initial schema. No migration steps; tables are created from
    // the `appSchema` at first launch.
  ],
});
