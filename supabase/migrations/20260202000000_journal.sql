-- Vela Journal (file 50, Part B).
--
-- Anonymous-readable; no auth required to read a published essay. Editors
-- write through the service role only (no client-side write policy).

create table public.journal_essays (
  slug text primary key,
  title text not null,
  subtitle text,
  published_at timestamptz not null,
  author_name text not null,
  author_bio text,
  estimated_read_minutes smallint not null,
  body text not null,
  "references" jsonb,
  category text not null check (category in ('on-faces', 'science', 'on-vela', 'on-aging')),
  og_image_url text,
  excerpt text not null,
  reviewed_at timestamptz not null,
  reviewed_by text[] not null,
  status text not null default 'draft' check (status in ('draft', 'in-review', 'published', 'archived'))
);

alter table public.journal_essays enable row level security;

create policy "anyone reads published essays"
  on public.journal_essays
  for select
  using (status = 'published');

create index journal_essays_published_at_idx
  on public.journal_essays (published_at desc)
  where status = 'published';

-- Subscriber list. Email-only; not joined to auth.users so non-Vela users
-- can subscribe.
create table public.journal_subscribers (
  email text primary key,
  subscribed_at timestamptz not null default now(),
  source text not null check (source in ('in-app', 'web', 'cancel-flow', 'external')),
  unsubscribed_at timestamptz,
  unsubscribe_token text not null
);

alter table public.journal_subscribers enable row level security;

-- No client-side select/insert/update; subscriptions go through the
-- `journal-subscribe` Edge Function (service role only). Unsubscribe is via
-- a signed link (the `unsubscribe_token`) that hits a public Edge Function.
