# 50 — Evidence Layer & Founder Voice

## Why this exists

Vela's brand differentiation rests on a claim: *we are the considered, evidence-grounded face-tracking app, not the hype machine the looksmaxxing competitors are.* Today that claim is implicit. This file makes it explicit through two related but distinct surfaces:

1. **Evidence-linked routine tasks** — every task in the routine library has a citation set and a plain-language explainer accessible in two taps. Users can see the source of every recommendation we make. Competitors who use vibes and TikTok trends can't replicate this without rebuilding their content stack.
2. **Founder voice channel** — a monthly long-form essay published in-app, on the web, and via the existing Postmark email pipeline. Calm, considered writing about skin, faces, aging, the brand's positioning, the science behind features. The kind of channel that turns a product into something users tell other people about.

Both features are about trust. Trust takes years to build and minutes to lose. Spec'd carelessly, either becomes a liability — citations that don't survive scrutiny, an essay that lands wrong. Spec'd well, they're the brand's most durable asset.

This file extends `02_TYPES_AND_MODELS.md`, `03_BACKEND_SUPABASE.md`, `06_AI_PROMPTS.md`, `09_ROUTINE.md`, `14_SETTINGS_AND_SUBSCRIPTION.md`, `21_BRAND_SYSTEM.md`, `25_ANALYTICS.md`, `34_TREATMENT_TRACKING.md`, `46_REACTIVATION.md`, and is referenced by `13_SHARE_CARDS.md`, `38_MONTHLY_WRAPPED.md`, `40_PREPAYWALL_VALUE.md`.

---

## Product principles

### For evidence layer

1. **Every claim is sourced.** Every routine task and treatment has at least one citation, accessible in the user-facing UI.
2. **Citations are honest about strength.** We don't paper over weak evidence with confident copy. Tasks with limited evidence say so.
3. **Plain language, not jargon.** Citations link to the underlying study, but the in-app summary is written for a smart non-specialist.
4. **No paywalled science.** When studies behind paywalls are the only available source, we link them but write the summary so the user gets the value without buying the paper.

### For founder voice

1. **One voice, one essay a month.** Not a content factory. Not influencer cross-promotion. A single writer with a perspective.
2. **Editorial standards over engagement metrics.** We measure quality by whether longtime readers think the writing got better, not by clicks.
3. **No sales push in the essays.** The channel is brand-building, not conversion. Conversion is a side effect of trust.
4. **Read-only, not social.** No comments, no likes, no replies. The channel is a publication, not a forum.

---

## Part A — Evidence-Linked Routine Tasks

### What changes in the routine engine

Every entry in the routine task library (file 09) gains an `evidence` field:

```ts
// src/types/routine-evidence.ts
// Add to 02_TYPES_AND_MODELS.md.

export interface RoutineTaskEvidence {
  level: 'strong' | 'moderate' | 'limited' | 'traditional';
  // What the evidence actually supports.
  claim: string;                  // ≤80 chars; the specific claim we're making
  // The plain-language summary (≤200 words) shown in the "About this" sheet.
  summary: string;
  // Citation list. We always include 1+; ideally 3-5 high-quality references.
  references: EvidenceReference[];
  // Where the user can read more.
  furtherReadingUrl?: string;     // e.g., Vela's own explainer essay
  // When the evidence was last reviewed by Vela's medical advisor.
  lastReviewedAt: string;
  // Author of the latest review (private — not surfaced to user).
  lastReviewedBy: string;
}

export interface EvidenceReference {
  citation: string;               // Standard format: Authors. Title. Journal Year;Volume(Issue):Pages.
  doi?: string;                   // DOI when available
  pubmedId?: string;              // PubMed ID when available
  url?: string;                   // Open-access URL when available
  paywalled: boolean;             // Honest flag
  yearPublished: number;
  notes?: string;                 // Internal notes; not surfaced
}
```

### Evidence levels — what each one means

| Level | What it means | Example |
|---|---|---|
| `strong` | Multiple high-quality RCTs or meta-analyses; widely accepted in dermatology | Daily SPF reduces skin aging signs (Hughes et al. 2013, Annals of Internal Medicine) |
| `moderate` | One or two well-designed RCTs, or strong observational studies | Niacinamide reduces hyperpigmentation at 5% concentration (Hakozaki et al. 2002) |
| `limited` | Small studies, limited cohorts, or mostly mechanistic evidence | Topical caffeine reduces under-eye puffiness (small studies, mechanism plausible) |
| `traditional` | Long-standing dermatologic practice without RCT-level evidence | Avoiding hot showers for sensitive skin (clinical consensus, no formal trial) |

The level is honest. A task labeled `traditional` says so in the UI; we don't pretend otherwise.

### Where evidence surfaces in the UI

**1. Tap the task on the routine screen**

A task in the routine list (file 09) gains an info affordance:

```
✿  Niacinamide serum (morning)              [ ⓘ ]
```

Tapping the (ⓘ) opens a bottom sheet:

```
┌──────────────────────────────────────────┐
│   Niacinamide serum                      │
│                                          │
│   Why we suggest it for you:             │
│                                          │
│   Niacinamide reduces hyperpigmentation  │
│   and the appearance of pores at         │
│   concentrations around 5%. The effect   │
│   builds over 8-12 weeks of consistent   │
│   use.                                   │
│                                          │
│   Evidence: moderate                     │
│                                          │
│   Two randomized controlled trials       │
│   (cited below) showed measurable        │
│   reduction in hyperpigmentation at 5%   │
│   over 8 weeks. Mechanism well-          │
│   understood (precursor to NADP+).       │
│                                          │
│   References:                            │
│   ▸ Hakozaki et al. 2002, Br J Derm      │
│     [open access]                        │
│   ▸ Bissett et al. 2005, Derm Surg       │
│     [paywalled]                          │
│                                          │
│   ─────────────────────────────────      │
│   Read more in our journal:              │
│   "What niacinamide actually does"   →   │
└──────────────────────────────────────────┘
```

The link at the bottom goes to a relevant founder-voice essay (Part B below) when one exists.

**2. Treatment selection (file 34)**

Same pattern: every treatment in the library has its `evidence` field surfaced when the user is picking a treatment to track. Tretinoin, isotretinoin, finasteride all show their evidence level + summary + references at selection.

**3. Doctor-friendly PDF (file 34)**

The exported treatment timeline PDF includes an "Evidence" appendix listing the citations for the active treatment. Useful when a patient takes the PDF to their dermatologist and the doctor wants to know what Vela's recommendations are based on.

**4. Score-explanation copy (file 06)**

The AI score explanation prompt is updated to optionally cite a relevant piece of evidence when discussing a sub-score change:

> *"Your skin clarity is up two points this week. Niacinamide is on its 8-week timeline — Hakozaki's study found similar shifts at this point."*

This is opt-in: the AI prompt only includes evidence cites if `confidenceInCitation > 0.7`. We don't shoehorn citations into every observation.

### Citation sourcing & review process (canonical)

Vela uses a **build-time, AI-assisted, human-verified** pipeline. The medical-advisor-per-citation bottleneck is replaced with a scalable workflow that still keeps a human gate before any citation reaches users.

#### The pipeline (4 stages)

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ 1. AI candidate  │ → │ 2. Verification  │ → │ 3. AI summary    │ → │ 4. Human review  │
│    sourcing      │   │    (DOI lookup)  │   │    drafting      │   │    & approval    │
│ (PubMed, Cochrane│   │  (each candidate │   │  (≤200 words per │   │  (batch review,  │
│  Crossref API)   │   │   resolved to    │   │   citation, file │   │  pre-launch +    │
│                  │   │   actual paper)  │   │   50 voice rules)│   │  quarterly)      │
└──────────────────┘   └──────────────────┘   └──────────────────┘   └──────────────────┘
        │                       │                       │                       │
        ▼                       ▼                       ▼                       ▼
 candidate_citations.json  verified_citations.json  drafted_evidence.json  evidence_database.json
```

Each stage produces a versioned JSON artifact in the repo. Cursor (or a build script) runs stages 1–3 automatically; stage 4 is the only human-in-the-loop gate.

#### Stage 1 — AI candidate sourcing

A build-time script (`scripts/evidence/sourceCitations.ts`) iterates every routine task in `src/core/routine/contentLibrary.ts` and every treatment in `src/core/treatments/library.ts` that's missing an `evidence` field. For each, it:

1. Constructs a search query from the task's `claim` field — e.g., for `niacinamide-am`: `"niacinamide" AND ("hyperpigmentation" OR "skin clarity") AND ("randomized" OR "controlled")`.
2. Hits the **PubMed E-utilities API** (`eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`) — free, no API key required for low-volume use; rate limit 3 requests/sec without a key, 10/sec with.
3. Pulls the top 20 results sorted by relevance.
4. For each, fetches metadata via `esummary.fcgi`: title, authors, journal, year, abstract, DOI, publication type (RCT > meta-analysis > review > case study).
5. Cross-checks against **Crossref API** (`api.crossref.org/works/<DOI>`) for citation count and licensing (open-access flag).
6. Filters: drop any candidate older than 20 years, drop case-reports-only, drop letters-to-editor.
7. Writes the top 5 surviving candidates per task to `evidence/candidates/<task-id>.json`.

The AI proxy is NOT involved at this stage. PubMed is the source of truth.

#### Stage 2 — DOI verification

A second script (`scripts/evidence/verifyCitations.ts`) reads each candidate JSON and verifies the DOI actually resolves to the claimed paper. Hallucinated citations are the single biggest risk in any AI-assisted workflow; this stage catches them.

For each candidate:
1. `fetch('https://doi.org/' + doi)` with a HEAD request.
2. If 200/302 → real paper, retain.
3. If 404 → log an error and discard.
4. Cross-reference fetched title against the candidate's title (Levenshtein distance < 5 characters); if titles diverge, discard.

Output: `evidence/verified/<task-id>.json`.

#### Stage 3 — AI summary drafting

A third script (`scripts/evidence/draftSummaries.ts`) reads verified candidates and uses the AI proxy with a new system prompt `EVIDENCE_SUMMARY_SYSTEM`:

```
You write the plain-language summary section for a routine task's evidence sheet.

INPUT: 1-3 verified citations for a single task, each with:
- Title, authors, journal, year, abstract, publication type

OUTPUT: One JSON object:
{
  "level": "strong" | "moderate" | "limited" | "traditional",
  "claim": "≤80 char restatement of what the citations support",
  "summary": "≤200 words plain-language summary of the evidence",
  "references": [{...}],
  "honesty": "honest tag of any caveats — small N, single-population, etc."
}

VOICE: Vela voice (file 21). Plain English. No clinical jargon.

LEVEL RULES:
- "strong": multiple RCTs OR a Cochrane review OR a meta-analysis
- "moderate": one well-designed RCT OR strong observational studies
- "limited": small studies, mechanistic evidence, or single-population RCTs
- "traditional": no RCT-level evidence; long-standing dermatology consensus

NEVER:
- Pretend evidence is stronger than it is. If 2 of 3 citations are weak, the level is "limited" or "moderate," not "strong."
- Recommend a specific brand or product.
- Diagnose anything.
- Use exclamation marks or forbidden words from file 21.
```

Output: `evidence/drafts/<task-id>.json` — one per task with full `RoutineTaskEvidence` populated except `lastReviewedAt` and `lastReviewedBy`.

#### Stage 4 — Human review & approval (the gate)

The drafts go to a single human reviewer for batch review BEFORE the database is committed to production. This is the only manual step.

**Pre-launch:** all initial drafts are reviewed in one pass by a contracted board-certified dermatologist (a one-time engagement, not ongoing). The reviewer can:
- ✅ Approve as-is → moves to `evidence/approved/<task-id>.json`
- ✏️ Edit the summary and approve → same destination, edits noted in commit
- ❌ Reject → moves to `evidence/rejected/<task-id>.json` with reason; that task gets re-sourced via Stage 1 with a refined query

**Post-launch:** the **research lead** (a Vela team member, not a clinician) handles routine updates. New candidates that come up during quarterly refresh OR when adding a new routine task can be approved by the research lead alone IF the AI-suggested level is `'limited'` or `'traditional'`. `'moderate'` and `'strong'` levels still require dermatologist sign-off, but in batches of 10+ to make the engagement scalable.

This way the dermatologist is engaged ~4 times a year for an hour each, not on every citation.

#### Output: the canonical evidence database

Approved citations are merged into `src/data/evidence-database.json`, which the app loads via remote config (per "Updating evidence over time" below). The database structure:

```jsonc
{
  "version": "v1.0.0",
  "generatedAt": "2026-05-01T00:00:00Z",
  "reviewedBy": ["dermatologist:dr-smith", "researchLead:vela-team"],
  "tasks": {
    "niacinamide-am": { /* RoutineTaskEvidence */ },
    "tretinoin-pm": { /* RoutineTaskEvidence */ },
    // ... every routine task
  },
  "treatments": {
    "tretinoin": { /* TreatmentDefinition.evidence */ },
    // ... every treatment in file 34 library
  }
}
```

Lint catches any task or treatment without a corresponding entry in this file. Cursor cannot ship a routine library task without an approved evidence record.

#### Why this works

- **No more medical-advisor blocker per citation.** The dermatologist reviews batches, not individuals.
- **AI does the heavy lifting** (search, drafting) but never the verification.
- **DOI verification catches hallucinations** — the most dangerous failure mode of AI-sourced citations.
- **Honesty about evidence level** is enforced by the prompt, the level taxonomy, and the human review.
- **Reproducible.** A new contributor can re-run the pipeline and produce the same database, version-controlled in git.

### Updating evidence over time

The evidence database is a versioned static dataset shipped with the app, with a remote-config override:

- `app_config.evidence_database_version` is bumped whenever the database is updated.
- The app fetches the latest evidence on cold start (with a 7-day cache).
- Updates can include: new citations, evidence-level changes (e.g., a new meta-analysis upgrades a `moderate` to `strong`), removed citations (if a study is retracted), reworded summaries.
- A small Settings entry: *Evidence database version v3.1 · Last updated April 2026* — visible to the user as a transparency signal.

### What evidence does NOT do

- **Does not replace medical advice.** Every "About this" sheet ends with the line: *"Vela isn't a doctor. If you have a specific concern, talk to one."*
- **Does not market products.** A citation supports the *category* (niacinamide), never a brand.
- **Does not rank treatments by effectiveness.** We never say "X is better than Y" — only "X has stronger evidence than Y" with both summarized fairly.
- **Does not enable paywalls of evidence.** The "About this" sheet is free for free users (lapsed-readonly mode included). Trust shouldn't be a premium feature.

### Edge cases

- **A study cited in a task is later retracted** — research lead updates the database; the citation is removed in the next remote-config push; if the retraction was significant enough to affect the task itself, the task is removed from the library.
- **Task contraindicated during a life-stage mode (canonical).** When a user in a life-stage mode taps (ⓘ) on a task that's hard-blocked or warned for that mode (e.g., tretinoin during pregnancy), the "About this" sheet renders with a top banner BEFORE the evidence content:

  > *"This task is paused during your current pregnancy mode. The evidence below is for use after pregnancy."*

  The full evidence summary and references are still shown — transparency over paternalism. The banner contextualizes; it doesn't hide. When the mode ends, the banner disappears and the sheet reverts to its standard form.
- **A user disagrees with a citation** — Settings → "Send feedback about evidence" opens a feedback form. Reviewed by the research lead weekly. Not user-editable directly.
- **Evidence sits behind a hard paywall** — we still cite it (honesty), flag `paywalled: true`, and write the summary so the user doesn't need to buy the paper.
- **No evidence exists for a traditional task** — task is labeled `traditional` with a summary explaining: *"This is long-standing dermatology practice without formal trial evidence. Removing it isn't risky — adding it is gentle."*
- **A task's evidence becomes outdated mid-version** (between releases) — remote-config pushes the update; users see the new content on next cold start.

### Analytics

| Event | Properties |
|---|---|
| `evidence_sheet_opened` | `task_id_or_treatment_id, evidence_level` |
| `evidence_reference_tapped` | `task_id, reference_index, paywalled: bool` |
| `evidence_further_reading_tapped` | `task_id, journal_essay_slug` |
| `evidence_feedback_submitted` | `task_id` |
| `evidence_database_updated_on_device` | `from_version, to_version` |

PII rule: never log feedback content; that's manually reviewed via the dashboard.

---

## Part B — Founder Voice Channel

### What it is

A monthly long-form essay channel — *Vela Journal* — published in three places:

1. **In-app** — a new entry under Settings → *From Vela* surfaces the latest essay and an archive of past ones.
2. **On the web** — `getvela.com/journal/[slug]` — a clean, typography-first reading site.
3. **As a newsletter** — opt-in delivery via the existing Postmark pipeline (file 46).

Each essay is 1,500–4,000 words. Published on the **first Monday of each month**. One author at a time (typically the founder; occasionally a guest essay from Vela's medical advisor or a verified expert).

### The journal's positioning

- **Not a marketing blog.** No "Top 5 Reasons to Try Vela." No "5 things you didn't know about retinol" listicles.
- **Not personal-life content.** Whoever writes it isn't sharing what they had for breakfast.
- **Subject matter:** the science of faces and skin; the philosophy of tracking longitudinal change; aging as a category we approach poorly as a culture; the considered case against looksmaxxing; deep dives into routines and treatments; reflections on building a face-tracking app that respects its users.
- **Tone:** the brand voice (file 21), turned up an editorial notch. Considered, warm, slightly literary. Not breezy. Not academic. Somewhere between a New Yorker piece and a thoughtful Substack essay.

Reference points (for the writer's calibration):
- The first chapter of *Why We Sleep* by Matthew Walker — accessible science writing.
- *On Photography* by Susan Sontag — considered prose about images and identity.
- The early issues of *Stratechery* — focused, unhurried weekly thinking.

### Voice rules (extension of file 21)

In addition to file 21's brand voice rules, the journal-specific rules:

- **No exclamation marks.** (Same as everywhere.)
- **No second-person plural.** *"We at Vela"* never appears. The author writes in first person singular when reflecting; in third person when explaining.
- **No "I think" hedging.** The author makes claims; the prose carries the weight.
- **Cite when claiming.** Studies are cited inline with hyperlinks to references at the end of the essay.
- **Avoid the word "amazing."** And "incredible," "transformation," "glow up." The forbidden words list from file 21 applies fully.
- **Personal narrative is allowed but earned.** A founder writing "the first time I noticed my own jawline softening" is fine. *"I cried when I saw what Vela showed me"* is not.

### Surface 1 — In-app

A new section in Settings: **From Vela**.

```
┌────────────────────────────────────────┐
│   From Vela                            │
│                                        │
│   New this month                       │
│   ─────────────────────────────────    │
│                                        │
│   Why we resist "anti-aging"           │
│   April 2026 · 12 min read             │
│                                        │
│   On the language we use about         │
│   faces, time, and what we mean        │
│   when we say "track" instead of       │
│   "fix."                               │
│                                        │
│                                        │
│   Older essays                         │
│   ─────────────────────────────────    │
│                                        │
│   What niacinamide actually does       │
│   March 2026 · 8 min read              │
│                                        │
│   The science of redness               │
│   February 2026 · 10 min read          │
│                                        │
│   On showing up                        │
│   January 2026 · 6 min read            │
│                                        │
│                                        │
│   Get these by email          ☐        │
└────────────────────────────────────────┘
```

The reader screen for an individual essay:

- Cream surface with significant whitespace.
- `displaySerif` for the title; `bodyLarge` for the body, with comfortable line-height.
- Pull quotes styled subtly.
- References listed at the end with clickable links.
- One small share affordance at the bottom — copy link or share to socials. No like button, no comments, no reaction emojis.
- A subtle "Continue reading" pinned to the bottom of the scroll view linking to the next-most-relevant past essay.

### Surface 2 — Web

`getvela.com/journal/[slug]`

A separate Next.js / Astro site (or a simple static-site setup), styled to match Vela's design system but optimized for reading. Mobile-first, dark-mode-aware, no JavaScript required for reading the essay (progressive enhancement only).

The web version has:
- A canonical archive (`getvela.com/journal/`) listing all essays.
- Clean URLs (`getvela.com/journal/why-we-resist-anti-aging`).
- Open Graph + Twitter Card metadata for shared links — preview shows the essay's title, the journal name, and a single accent illustration. **Never the user's photo or face data.**
- An RSS feed (`/journal/feed.xml`) for readers who use RSS.
- A simple email-subscribe form for the newsletter delivery.

The web journal is **not** behind the consumer paywall. Reading is free for everyone — the journal is brand-building, not a conversion lever.

### Surface 3 — Email newsletter

Opt-in subscribers receive each new essay as an email on publication day. Powered by Postmark (already integrated in file 46 for lapsed-user digests).

The email is plain HTML — no fancy templates. Title, byline, body, footer. Reads well in any email client.

Subscription points:
- A `☐ Get these by email` checkbox in the in-app *From Vela* screen.
- A web-side `/journal/subscribe` form.
- The cancellation flow's email-digest opt-in (file 47) **also** offers journal subscription as a separate checkbox.
- Anyone can subscribe regardless of Vela subscription status — including non-users who heard about the journal externally.

Unsubscribe: one-click footer link, immediate effect, never re-prompted.

### Topics — a starting calendar

The first six months' essays, sketched at a high level:

| Month | Working title | Theme |
|---|---|---|
| Jan | On showing up | The case for tracking. Why measurement, by itself, builds the habit. |
| Feb | The science of redness | Plain-language deep dive on vascular response, rosacea, and what works. Cites the literature. |
| Mar | What niacinamide actually does | Specific active deep dive. Mechanistic + studies + honest about evidence. |
| Apr | Why we resist "anti-aging" | The brand essay. Why Vela uses the language it does. The cultural case for "tracking" over "fixing." |
| May | What a year of tretinoin really looks like | The retinization curve, week by week, with citations. The honest version of TikTok claims. |
| Jun | Sleep, stress, skin | Reviewing the evidence on lifestyle correlations. What HealthKit can and can't tell you. |

After six months, the writer takes a breath and decides what comes next based on what's worked.

### Reserved slots for life-stage topics (canonical)

The journal MUST publish at least 2 essays per calendar year on life-stage topics (pregnancy, menopause, HRT, cancer recovery — file 48). These are the topics that earn the journal its audience and are uniquely suited to Vela's brand. Suggested topics for the second six months:

| Month | Working title | Theme |
|---|---|---|
| Jul | Skin in pregnancy: what changes, what doesn't | Pregnancy mode contextualized. Cites peer-reviewed dermatology + obstetrics literature. |
| Aug | The retinoid question | When tretinoin is right; when it isn't. Includes the pregnancy contraindication as a major footnote. |
| Sep | Perimenopause and skin | The estrogen-collagen relationship; what's known; what's hype. |
| Oct | What HRT does to a face, over time | Trans-affirming, evidence-grounded, plainly written. |
| Nov | Recovery isn't a journey, it's data | Cancer recovery framing; respectful, useful for survivors. |
| Dec | Year in review | What we noticed in the data; what we'll publish next year. |

Life-stage essays are reviewed by an additional sensitivity reader (oncology, OB-GYN, or trans-health depending on topic) BEFORE the standard three-reviewer pipeline. This is non-negotiable.

### Operational details

- **Cadence:** one essay per month, published first Monday at 9 AM ET. Announced in-app and via newsletter.
- **Author:** primary writer is the founder. Guest essays (medical advisor, occasional invited expert) up to twice a year.
- **Editorial review:** every essay is reviewed before publication by:
  - One brand voice reviewer (checks for forbidden words, tone, no exclamation marks).
  - Vela's medical advisor (for any essay with health claims).
  - One copy editor (grammar, clarity, citations).
- **Length:** target 1,500–4,000 words. Editor pushes back if shorter than 1,500 (likely too thin) or longer than 4,000 (likely needs trimming).
- **Cost:** the founder writes; advisor and editor are paid hourly. Estimate: ~$1,200/month for the editorial process, scaling down as patterns establish.

### Schema

```ts
// src/types/journal.ts
// Add to 02_TYPES_AND_MODELS.md.

export interface JournalEssay {
  slug: string;                   // URL-safe; immutable after publication
  title: string;
  subtitle?: string;
  publishedAt: string;            // ISO date
  authorName: string;
  authorBio?: string;             // ≤120 chars; only for guest essays
  estimatedReadMinutes: number;
  body: string;                   // Markdown content
  references?: JournalReference[];
  category: JournalCategory;
  // SEO + sharing
  ogImageUrl?: string;            // illustration only, never face data
  excerpt: string;                // ≤200 chars for previews
  // Internal
  reviewedAt: string;
  reviewedBy: string[];
  status: 'draft' | 'in-review' | 'published' | 'archived';
}

export type JournalCategory =
  | 'on-faces'                    // philosophy / brand essays
  | 'science'                     // deep dives on actives, conditions
  | 'on-vela'                     // building the product, decisions, tradeoffs
  | 'on-aging';                   // the cultural / personal angle

export interface JournalReference {
  citation: string;
  doi?: string;
  url?: string;
  paywalled: boolean;
}

export interface JournalSubscription {
  email: string;
  subscribedAt: string;
  source: 'in-app'|'web'|'cancel-flow'|'external';
  unsubscribedAt?: string;
}
```

### Schema additions (Supabase)

```sql
create table public.journal_essays (
  slug text primary key,
  title text not null,
  subtitle text,
  published_at timestamptz not null,
  author_name text not null,
  author_bio text,
  estimated_read_minutes smallint not null,
  body text not null,
  references jsonb,
  category text not null,
  og_image_url text,
  excerpt text not null,
  reviewed_at timestamptz not null,
  reviewed_by text[] not null,
  status text not null default 'draft'
);

-- Public read access (the journal is free).
alter table public.journal_essays enable row level security;
create policy "anyone reads published journal essays"
  on public.journal_essays for select
  using (status = 'published');

-- Subscribers (separate from auth.users; non-Vela users can subscribe)
create table public.journal_subscribers (
  email text primary key,
  subscribed_at timestamptz not null default now(),
  source text not null,
  unsubscribed_at timestamptz,
  unsubscribe_token text not null  -- for one-click unsubscribe
);
```

### Privacy & trust details

- The journal does not require login to read.
- Reading any essay is not tracked back to the user's Vela account. The web version uses minimal analytics (page-views by URL, no fingerprinting, no cross-site tracking, no Google Analytics).
- Email subscribers' addresses are never sold, shared, or used for any purpose other than the journal.
- Unsubscribe is one-click.
- The journal has no ads. Ever. This is a brand value, written into the marketing strategy.

### Edge cases

- **Author writes something problematic** — every essay goes through three reviewers. Catastrophic edge cases (an essay that lands wrong post-publication) trigger a small "We've removed this essay" notice with a brief explanation. We don't pretend it didn't happen.
- **A study cited in an essay is retracted** — essay gets a small editor's note at the top: *"Updated [date]: the [study name] cited below has been retracted; see correction."*
- **Subscriber list breach scenario** — emails are stored encrypted at rest in Supabase; in the event of a breach, we notify subscribers within 72 hours per GDPR. Subscriber list is treated with the same care as any PII.
- **Essay's writer leaves the company** — journal continues with a new primary author. The voice may shift; we don't pretend it doesn't. A small founder's note acknowledges the transition.

### Analytics

| Event | Properties |
|---|---|
| `journal_essay_opened` | `slug, source: 'in-app'|'web'|'email'|'rss'` |
| `journal_essay_read_completed` | `slug, dwell_seconds_bucket` |
| `journal_essay_shared` | `slug, channel: 'copy-link'|'email'|'twitter'|'native-share'` |
| `journal_subscribed` | `source: 'in-app'|'web'|'cancel-flow'` |
| `journal_unsubscribed` | `essay_index_at_unsubscribe` |
| `journal_essay_bounce` | `slug, dwell_seconds_bucket: '<10'|'10-30'|'30-60'` (very short reads) |

Analytics on the web side are GDPR-clean: no cookies, server-side log aggregation only, no third-party trackers.

---

## Settings (combined for both parts)

A new section under **Settings → About**:

```
About Vela

  ─────────────────────────────────────────
  From Vela (journal)                    >
  Evidence behind your routine           >
  Privacy and data                       >
  Help                                   >
```

Tapping **Evidence behind your routine** opens an aggregate view: every routine task and treatment in the user's current set, with their evidence level at a glance. Tap any → the same "About this" sheet that's accessible from the routine screen.

Tapping **From Vela (journal)** opens the journal archive screen described above.

---

## Pre-launch checklist

### Evidence layer
- [ ] Every routine task in the file 09 library has a populated `evidence` field
- [ ] Every treatment in the file 34 library has a populated `evidence` field
- [ ] Medical advisor has signed off on every entry (lastReviewedBy populated, internally auditable)
- [ ] Evidence database versioning + remote-config update path tested
- [ ] "About this" sheet renders correctly in light + dark mode
- [ ] Citations link out correctly (DOI, URL); paywalled flag honored
- [ ] AI score-explanation prompt uses evidence-aware citation only when `confidenceInCitation > 0.7`
- [ ] Doctor-friendly PDF includes evidence appendix
- [ ] "Send feedback about evidence" form delivers to research lead
- [ ] No evidence claim is unsourced
- [ ] No evidence-level mislabeling (sample audit by an external dermatologist on 20 random entries)
- [ ] Evidence database accessible to lapsed-readonly users (file 46)

### Founder voice
- [ ] First six essays drafted before launch (Jan-Jun calendar)
- [ ] Three-reviewer pipeline documented and operational
- [ ] In-app journal screen renders all essays with correct metadata
- [ ] Web journal site deployed at `getvela.com/journal`
- [ ] RSS feed available at `/journal/feed.xml`
- [ ] Email newsletter Postmark templates approved by brand voice review
- [ ] Subscribe forms in three places: in-app, web, cancel flow (file 47)
- [ ] Unsubscribe is one-click, immediate
- [ ] Subscriber list separate from auth.users, encrypted at rest
- [ ] No ads, no trackers on web journal
- [ ] OG / Twitter Card metadata never includes user data
- [ ] First-Monday-of-month publishing cadence verified across 3 sample months
- [ ] Brand voice review passed for every essay before publication
- [ ] Forbidden words lint passes on every essay
- [ ] Editorial calendar visible to the team (Notion / Linear)
- [ ] Style guide for guest authors written and shared
- [ ] Author bio template approved
- [ ] Search engine visibility tested (essay titles index correctly)

### Both
- [ ] Settings → About → "From Vela" + "Evidence behind your routine" reachable in two taps
- [ ] PostHog events scrub all body content
- [ ] Account deletion does not affect journal subscription unless user opts in to delete that too
- [ ] Persona check: each persona walked through finding evidence on a task and reading their first essay
- [ ] Maestro flow: tap routine task → "About this" sheet → tap reference → opens external study correctly
- [ ] Maestro flow: open journal in app → tap latest essay → read to end → share via copy-link
