-- Align DB with Edge Functions and journal pipeline (post v1.5 review).
--
-- 1. cancel_offers_log — used by evaluate-cancel-save (was missing; cancel_save_attempts is separate).
-- 2. journal_subscribers — last_seen_at for journal-subscribe upsert; default unsubscribe_token for new rows.
-- 3. storage bucket doctor-exports — doctor-pdf-export uploads (private).

-- ---------------------------------------------------------------------
-- Cancel-save server audit (file 47)
-- ---------------------------------------------------------------------
create table if not exists public.cancel_offers_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_kind text not null,
  reasoning text not null,
  decided_at timestamptz not null default now()
);

create index if not exists cancel_offers_log_user_decided_idx
  on public.cancel_offers_log (user_id, decided_at desc);

alter table public.cancel_offers_log enable row level security;
-- Service role only (Edge Function). No user-facing policies.

-- ---------------------------------------------------------------------
-- Journal subscribers — edge function upsert shape
-- ---------------------------------------------------------------------
alter table public.journal_subscribers
  add column if not exists last_seen_at timestamptz;

alter table public.journal_subscribers
  alter column unsubscribe_token set default (gen_random_uuid()::text);

-- ---------------------------------------------------------------------
-- Private bucket for clinician PDF exports (Edge uploads via service role)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('doctor-exports', 'doctor-exports', false)
on conflict (id) do nothing;
