/**
 * Journal service (file 50, Part B).
 *
 * Reads published essays from Supabase. Anonymous-readable; no Vela auth
 * required for read. Subscriptions use the `journal-subscribe` Edge Function
 * (RLS blocks direct client writes to `journal_subscribers`).
 */
import { supabase } from '@/services/supabase';
import type { JournalEssay } from '@/types/journal';

export interface JournalService {
  listPublished(): Promise<JournalEssay[]>;
  getBySlug(slug: string): Promise<JournalEssay | null>;
  subscribe(input: {
    email: string;
    source: 'in-app' | 'web' | 'cancel-flow' | 'external';
  }): Promise<void>;
}

class SupabaseJournalService implements JournalService {
  async listPublished(): Promise<JournalEssay[]> {
    const { data, error } = await supabase
      .from('journal_essays')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []).map(rowToEssay);
  }

  async getBySlug(slug: string): Promise<JournalEssay | null> {
    const { data, error } = await supabase
      .from('journal_essays')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();
    if (error) throw error;
    return data ? rowToEssay(data) : null;
  }

  async subscribe(input: {
    email: string;
    source: 'in-app' | 'web' | 'cancel-flow' | 'external';
  }): Promise<void> {
    const { data, error } = await supabase.functions.invoke('journal-subscribe', {
      body: { email: input.email.trim().toLowerCase(), source: input.source },
    });
    if (error) throw error;
    const parsed = data as { error?: string } | null;
    if (parsed && typeof parsed === 'object' && 'error' in parsed && parsed.error) {
      throw new Error(String(parsed.error));
    }
  }
}

function rowToEssay(row: Record<string, unknown>): JournalEssay {
  return {
    slug: String(row['slug']),
    title: String(row['title']),
    subtitle: optionalString(row['subtitle']),
    publishedAt: String(row['published_at']),
    authorName: String(row['author_name']),
    authorBio: optionalString(row['author_bio']),
    estimatedReadMinutes: Number(row['estimated_read_minutes']) || 5,
    body: String(row['body']),
    references: (row['references'] as JournalEssay['references']) ?? undefined,
    category: row['category'] as JournalEssay['category'],
    ogImageUrl: optionalString(row['og_image_url']),
    excerpt: String(row['excerpt']),
    reviewedAt: String(row['reviewed_at']),
    reviewedBy: Array.isArray(row['reviewed_by']) ? (row['reviewed_by'] as string[]) : [],
    status: row['status'] as JournalEssay['status'],
  };
}

function optionalString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

let instance: JournalService | null = null;

export function getJournalService(): JournalService {
  if (!instance) instance = new SupabaseJournalService();
  return instance;
}

export function setJournalServiceForTesting(service: JournalService): void {
  instance = service;
}
