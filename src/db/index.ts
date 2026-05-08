/**
 * WatermelonDB database singleton (file 01).
 *
 * Lazy-initialised so test environments without a native adapter don't
 * crash. The actual SQLite adapter is loaded only at runtime (Expo dev
 * client / TestFlight / Production builds). Unit tests using ts-jest must
 * not import this module directly; mock at the call site instead.
 */
import { Database } from '@nozbe/watermelondb';
import { schema } from './schema';
import { migrations } from './migrations';
import { DailyRoutineModel } from './models/DailyRoutineModel';
import { DiaryEntryModel } from './models/DiaryEntryModel';
import { HealthSnapshotModel } from './models/HealthSnapshotModel';
import { ScanSessionModel } from './models/ScanSessionModel';
import { UserProductModel } from './models/UserProductModel';

let cached: Database | null = null;

function buildAdapter() {
  // Defer the import so Jest doesn't try to resolve the native adapter
  // at module load.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const SQLiteAdapter = require('@nozbe/watermelondb/adapters/sqlite').default;
  return new SQLiteAdapter({
    schema,
    migrations,
    jsi: true,
    onSetUpError: (error: unknown) => {
      // eslint-disable-next-line no-console
      console.warn('WatermelonDB setup failed', error);
    },
  });
}

export function getDatabase(): Database {
  if (!cached) {
    cached = new Database({
      adapter: buildAdapter(),
      modelClasses: [
        ScanSessionModel,
        DailyRoutineModel,
        UserProductModel,
        DiaryEntryModel,
        HealthSnapshotModel,
      ],
    });
  }
  return cached;
}

export type {
  ScanSessionModel,
  DailyRoutineModel,
  UserProductModel,
  DiaryEntryModel,
  HealthSnapshotModel,
};
