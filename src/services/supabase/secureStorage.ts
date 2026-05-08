/**
 * SecureStorageAdapter (file 03).
 *
 * Auth tokens MUST go through expo-secure-store, never AsyncStorage. Tokens
 * are chunked at CHUNK_SIZE because SecureStore on iOS caps single-value
 * size — long JWTs + refresh tokens overflow without chunking.
 */
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;

interface ChunkMeta {
  v: 1;
  count: number;
  total: number;
}

const metaKey = (key: string) => `${key}.meta`;
const chunkKey = (key: string, i: number) => `${key}.chunk.${i}`;

async function readMeta(key: string): Promise<ChunkMeta | null> {
  const raw = await SecureStore.getItemAsync(metaKey(key));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ChunkMeta;
    if (parsed.v === 1) return parsed;
    return null;
  } catch {
    return null;
  }
}

export const SecureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    const meta = await readMeta(key);
    if (!meta) {
      // Backwards-compat: try a single-value read.
      return SecureStore.getItemAsync(key);
    }
    const parts: string[] = [];
    for (let i = 0; i < meta.count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    // Clear any stale chunks first.
    await SecureStorageAdapter.removeItem(key);
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    for (let i = 0; i < chunks.length; i++) {
      const part = chunks[i];
      if (part === undefined) continue;
      await SecureStore.setItemAsync(chunkKey(key, i), part);
    }
    const meta: ChunkMeta = { v: 1, count: chunks.length, total: value.length };
    await SecureStore.setItemAsync(metaKey(key), JSON.stringify(meta));
  },

  async removeItem(key: string): Promise<void> {
    const meta = await readMeta(key);
    if (meta) {
      for (let i = 0; i < meta.count; i++) {
        await SecureStore.deleteItemAsync(chunkKey(key, i));
      }
    }
    await SecureStore.deleteItemAsync(metaKey(key));
    await SecureStore.deleteItemAsync(key);
  },
};
