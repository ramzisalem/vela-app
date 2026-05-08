# Scan sync: `SyncOrchestrator` vs `retryPendingSync`

Two paths push `scan_results` to Supabase after a session is created locally. They overlap on purpose but are **not** identical.

| | **`SyncOrchestrator.flushPending`** | **`useScanStore.retryPendingSync`** |
|--|--------------------------------------|-------------------------------------|
| **When** | Once on app cold start (`app/_layout.tsx`), and after **post-paywall signup** when the profile row finally exists | On **foreground** (`initializeServices` listener) and after **session hydrate** in `initializeServices` |
| **Rows** | Only `syncStatus === 'pending_sync'` | `pending_sync` **and** `failed` |
| **Mechanism** | `flushScansToRemote(..., 'pending_sync')` | `flushScansToRemote(..., 'pending_sync_or_failed')` — shared helper in `src/services/sync/flushScanSync.ts` |
| **Local DB (Watermelon)** | Persists `synced` via `persistScanSession` after each success | Persists `synced` after each success |
| **Failure** | `ProfileMissingError` → leave `pending_sync`; other errors → `failed` | Same |

**Rule of thumb:** `flushPending` is the **“profile just became available”** flush (narrow). `retryPendingSync` is the **retry loop** for anything still not on the server, including **failed** (broad).

Both call **`flushScansToRemote`** so success / `ProfileMissingError` / `failed` behavior stays in one place.
