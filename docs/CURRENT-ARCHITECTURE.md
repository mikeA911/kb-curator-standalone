# KB Sandbox — Current Architecture

Living documentation of what's actually implemented, as of Milestone 2 (LLM Wiki). Where this differs from `KB Sandbox.md`'s original brief, that's called out explicitly with a reason — this file describes reality, not intent.

## Stack

Next.js 16 (App Router), TypeScript, Supabase (Postgres + pgvector, Auth, Storage). No Next.js `middleware.ts` — Next 16 renamed the convention to `proxy.ts`; ours only refreshes the session cookie, it does not gate routes (route protection lives in each layout/page and in RLS — see [Auth](#auth)). All AI provider calls and privileged writes happen server-side, in Server Actions under `src/app/actions/`.

The original Vite SPA is preserved at `legacy-vite-app/` for reference and was not deleted; Milestone 1 was a full rebuild, not an in-place migration (see `KB Sandbox.md` for why).

## Data model

Three layers, deliberately kept distinct rather than collapsed into one:

```text
SOURCE DOCUMENTS  (documents)
        │  parsed + chunked
        ▼
DOCUMENT CHUNKS   (document_chunks)  ──approve──▶  KB_VECTORS  (retrieval units)
        │
        │  curator selects approved chunks as evidence
        ▼
WIKI ARTICLES     (wiki_articles / wiki_versions)  ──approve──▶  WIKI_VECTORS
        │
        ▼
  (future: RAG Answer Agent, graph orchestration — not built yet)
```

`kb_vectors` and `wiki_vectors` are separate tables on purpose: a source chunk and a curated Wiki synthesis of that chunk are different things with different provenance, and collapsing them would make it impossible to tell "this is raw evidence" from "this is reviewed synthesis" at retrieval time. Neither has a retrieval function wired up yet (no `/search` UI, no `match_wiki` RPC) — Milestone 2 only builds the write side and simple title/category text search, per the brief's explicit scope limit.

### Curator pipeline (Milestone 1)

`documents` → parse (`src/lib/parsing.ts`, real pdf/docx/txt extraction, not an LLM-guessing-at-a-URL) → chunk (`src/lib/chunking.ts`, deterministic paragraph accumulation with page/section/parser provenance) → enrich (`src/lib/curator/enrichment.ts`, AI-generated topic/relevance/concepts via the generic `AIProvider`) → curator review/approve/reject (`src/lib/curator/chunks.ts`) → embed on approval → `kb_vectors`.

Every stage that can fail records a structured error (`documents.processing_error`, `document_chunks.enrichment_error`: `{stage, code, message, occurred_at, retryable}`) instead of silently degrading — this was a deliberate fix versus the original app, which returned placeholder metadata on AI failures and hid them from curators.

### Wiki pipeline (Milestone 2)

```text
Sources → AI-assisted synthesis → Draft → Human review → Approved → Versioned canonical knowledge
```

- **`wiki_articles`** — stable identity: slug, title, category (FK to `wiki_categories`, a seeded lookup table for the six top-level taxonomy categories — not a hardcoded enum, so the UI can list/order them), status (`draft` / `review` / `approved` / `archived`), and `current_version_id`.
- **`wiki_versions`** — insert-only, never updated by a regular staff session (no client-facing `UPDATE` RLS policy at all). Content is one markdown field covering the standard section structure (What it is / Why it matters / How it works / Architecture / When to use / When not to use / Failure modes / Evaluation / Governance considerations / Practical experiment), plus dedicated columns for `quick_help`, `implementation_notes`, and `limitations` since those are used differently from the narrative body. AI-assisted versions carry provenance (`ai_provider`, `ai_model`, `ai_generated_at`, `source_chunk_ids`).
- **`current_version_id` only ever moves on admin approval.** Editing a draft, or editing *approved* content, always inserts a new `wiki_versions` row (`version_number` + 1); it never touches `current_version_id` or mutates an existing row. This is the mechanism behind "approved content stays live until the new version is itself approved" and "superseded versions don't accidentally become current" — see `src/lib/wiki/articles.ts` (`createNextDraftVersion`) and `src/lib/wiki/review.ts` (`approveWikiVersion`, the only function that writes `current_version_id`).
- **`wiki_sources`** — links a version to `documents`/`document_chunks` (or an external citation with neither, via a `source_type='external'` escape hatch). At least one of `document_id`/`chunk_id` is enforced by a CHECK constraint for non-external sources.
- **`wiki_relations`** — a plain self-join table for "related articles," directional in storage but rendered symmetrically. Explicitly not a graph store, per the brief.
- **`wiki_vectors`** — optional, written best-effort at approval time (`embedApprovedVersion` in `review.ts`); a failure here is logged and does not block approval, since an AI/embedding outage shouldn't turn an editorial decision into a hard failure.

AI-assisted draft generation (`src/lib/wiki/synthesis.ts`) takes curator-selected **approved** chunks only, calls `AIProvider.generateStructured` with a Zod schema matching the article shape, and always produces a `draft` — there is no code path where an AI call sets `status='approved'` or moves `current_version_id`.

## Auth & authorization

Supabase Auth, session cookie refreshed by `src/proxy.ts` on every request. Actual enforcement happens twice, deliberately:

1. **Server Actions/layouts** call `requireUser()`/`requireRole()` (`src/lib/auth.ts`) against the caller's own session before doing anything.
2. **RLS** is the backstop that holds even if an action forgot to check — e.g. `wiki_versions` has no `UPDATE` policy for `authenticated` at all, so even a bug in a Server Action's role check couldn't let a non-admin set `approved_by`/`approved_at`; only the service-role client (used exclusively inside the admin-gated `approveArticleAction`) can write those columns.

Approval-type actions (`approveDocument`, `approveArticleAction`) use a service-role Supabase client, mirroring what the old app's `admin-api` Edge Function did — except that logic now lives in this app's own server runtime instead of a separate Supabase Edge Function, since Next.js Server Actions cover the same "run with elevated privilege, server-side" need.

## AI provider abstraction

`src/lib/ai/provider.ts` defines `generateText` / `generateStructured` / `embed`; `OpenAIProvider` and `GeminiProvider` implement it. `getActiveProvider()` (`src/lib/ai/index.ts`) reads the active choice from the `settings` table and wraps whichever provider in a logging decorator (`src/lib/ai/logging.ts`) that writes every call — operation, provider, model, latency, token counts, success/failure — to `ai_operation_logs`. Wiki synthesis and chunk enrichment are both just callers of this same interface; neither knows or cares which vendor is behind it.

The initial embedding profile is `vector(1536)` (OpenAI `text-embedding-3-small`), recorded per-row via `embedding_model`/`embedding_dim` rather than assumed — see the column comment on `kb_vectors.embedding` in `supabase/migrations/20260808190006_kb_vectors.sql`. Changing the default embedding model later is an additive migration (new column + re-embed job), not a silent dimension mismatch.

## What's explicitly not built yet

Per Milestone 2's scope: no agent builder, no RAG Answer Agent, no graph execution, no evaluation subsystem, no experiments, no LoRA/DoRA, no governance approval workflows beyond the Wiki's own draft→review→approved gate, no full run tracing. Wiki/RAG retrieval (`match_wiki`-style vector search) is deliberately not wired up — `wiki_vectors` exists so a future milestone doesn't have to retrofit the write side, but there's no read path yet.
