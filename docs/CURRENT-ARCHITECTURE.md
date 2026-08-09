# KB Sandbox — Current Architecture

Living documentation of what's actually implemented, as of Milestone 3 (Evaluation Engine). Where this differs from `KB Sandbox.md`'s original brief, that's called out explicitly with a reason — this file describes reality, not intent.

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

`kb_vectors` and `wiki_vectors` are separate tables on purpose: a source chunk and a curated Wiki synthesis of that chunk are different things with different provenance, and collapsing them would make it impossible to tell "this is raw evidence" from "this is reviewed synthesis" at retrieval time. Milestone 2 only built the write side plus simple title/category text search; Milestone 3 adds the actual read/retrieval path (`match_documents`, `match_wiki_vectors` — see [Evaluation engine](#evaluation-engine-milestone-3)), but only for evaluation runs. There is still no general-purpose `/search` UI.

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

## Evaluation engine (Milestone 3)

```text
eval_datasets (versioned benchmark)
      │  1:N
      ▼
eval_cases (question, expected evidence, expected concepts, scoring criteria)
      │
      │  a run selects a configuration and executes every case
      ▼
eval_runs (config jsonb snapshot: generation/embedding/retrieval/evaluator)
      │  1:N
      ▼
eval_results (retrieval metrics + generated answer + optional judge output + human review)
```

- **`eval_datasets`** — `draft` / `active` / `archived`, plain integer `version`. Activating requires ≥1 case (`activateDatasetAction`). Once a dataset leaves `draft`, its cases are frozen — not by convention, but by RLS: `eval_cases`' insert/update/delete policies each require `exists (select 1 from eval_datasets d where d.id = eval_cases.dataset_id and d.status = 'draft')` (`supabase/migrations/20260809110004_eval_rls.sql`). This is what makes "an active benchmark can't be silently invalidated" a guarantee instead of a hope.
- **`eval_cases`** — question, `expected_answer`, `expected_concepts[]`, `expected_article_ids[]` (Wiki), `expected_chunk_ids[]` (source chunks), `scoring_criteria`, `tags[]`, `difficulty`. Expected evidence is intentionally split by type rather than a single generic id list, matching the chunk/Wiki evidence-type separation below.
- **`eval_runs`** — snapshots its entire configuration into `config` (jsonb: generation provider/model, embedding provider/model/dimensions, retrieval evidence source/top-K/threshold, evaluator type/provider/model) at creation time, plus `dataset_version`. A run is executed with `getProviderByName()` (`src/lib/ai/index.ts`), never `getActiveProvider()` — so a historical run stays interpretable even after the app's global `settings.ai_provider` changes later. One run per dataset can be flagged `is_baseline` for comparison.
- **`eval_results`** — one row per case per run. Automated columns (`retrieval_hit`/`retrieval_recall`/`retrieval_mrr`/`generation_score`/`grounding_score`/`outcome_score`/`failure_classification`) and a parallel set of `human_*` columns are both present and never overwrite each other — `submitHumanReviewAction` (`src/app/actions/eval.ts`) only ever writes the `human_*` set. A per-case pipeline failure (embedding outage, provider error, etc.) still produces a row, with `status='failed'` and a structured `error` object — it never just vanishes from the run.

### Evidence-type separation carries through to retrieval and scoring

Per an explicit architectural constraint (not just an implementation detail): Wiki evidence and source-chunk evidence are never merged into one ambiguous list.

- `src/lib/eval/retrieval.ts`'s `retrieveEvidence()` calls `match_documents` (chunks, via `kb_vectors`) and/or `match_wiki_vectors` (Wiki, via `wiki_vectors`, restricted to each article's `current_version_id` so drafts never leak into an eval) depending on the run's `retrieval.evidence_source` (`chunks` / `wiki` / `both`), then merges by similarity for a combined top-K.
- Every retrieved item keeps an explicit `type: 'chunk' | 'wiki'` (`RetrievedEvidenceItem`, `src/types/database.ts`) all the way through scoring and storage.
- `src/lib/eval/scoring.ts`'s `computeRetrievalMetrics()` (Hit@K, Recall@K, MRR — all deterministic, no LLM involved) only ever compares a `chunk` item against `expected_chunk_ids` and a `wiki` item against `expected_article_ids`; a matching id of the wrong type is never counted as a hit.

This is what makes "Chunks Only vs. Wiki Only vs. Wiki + Chunks" a real, run-configurable comparison rather than something the schema would have to be redesigned to support later.

### Pipeline: retrieve → generate → score

`src/lib/eval/run.ts`'s `executeEvalRun()` runs synchronously inside the Server Action that launched it (`createAndRunEvalAction`), the same pattern as Milestone 1's chunk enrichment — datasets are small (10-15 cases) by design at this milestone, so no background job queue yet. Per case: `retrieveEvidence()` → `computeRetrievalMetrics()` (always, deterministic) → `generateAnswer()` (`src/lib/eval/generation.ts`, evidence-grounded prompt via the existing `AIProvider`) → optionally `judgeAnswer()` (`src/lib/eval/judge.ts`, `generateStructured()` against a Zod schema, additive only — never the sole evaluator, per the brief's "deterministic evaluation first").

## Auth & authorization

Supabase Auth, session cookie refreshed by `src/proxy.ts` on every request. Actual enforcement happens twice, deliberately:

1. **Server Actions/layouts** call `requireUser()`/`requireRole()` (`src/lib/auth.ts`) against the caller's own session before doing anything.
2. **RLS** is the backstop that holds even if an action forgot to check — e.g. `wiki_versions` has no `UPDATE` policy for `authenticated` at all, so even a bug in a Server Action's role check couldn't let a non-admin set `approved_by`/`approved_at`; only the service-role client (used exclusively inside the admin-gated `approveArticleAction`) can write those columns.

Approval-type actions (`approveDocument`, `approveArticleAction`) use a service-role Supabase client, mirroring what the old app's `admin-api` Edge Function did — except that logic now lives in this app's own server runtime instead of a separate Supabase Edge Function, since Next.js Server Actions cover the same "run with elevated privilege, server-side" need.

## AI provider abstraction

`src/lib/ai/provider.ts` defines `generateText` / `generateStructured` / `embed`; `OpenAIProvider` and `GeminiProvider` implement it. `getActiveProvider()` (`src/lib/ai/index.ts`) reads the active choice from the `settings` table and wraps whichever provider in a logging decorator (`src/lib/ai/logging.ts`) that writes every call — operation, provider, model, latency, token counts, success/failure — to `ai_operation_logs`. Wiki synthesis and chunk enrichment are both just callers of this same interface; neither knows or cares which vendor is behind it.

`getProviderByName(name, logContext)` (also `src/lib/ai/index.ts`) is the one place that picks a specific provider independent of the global `settings` row — evaluation runs need this so a run can compare "openai vs. gemini" as a variable under test rather than inheriting whatever the app is currently defaulting to. `ai_operation_logs` gained `eval_run_id`/`eval_case_id` columns (`LogContext`, `src/lib/ai/logging.ts`) so an AI call made during an eval run — embedding, generation, or judge — can be traced back to the specific run and case that triggered it, without building the full Runs/Tracing subsystem that's planned for a later milestone.

The initial embedding profile is `vector(1536)` (OpenAI `text-embedding-3-small`), recorded per-row via `embedding_model`/`embedding_dim` rather than assumed — see the column comment on `kb_vectors.embedding` in `supabase/migrations/20260808190006_kb_vectors.sql`. Changing the default embedding model later is an additive migration (new column + re-embed job), not a silent dimension mismatch.

## What's explicitly not built yet

Per Milestone 3's scope: no agents, no Agent Builder, no graph orchestration/loops, no automatic query rewriting, no autonomous research, no full Experiments subsystem (a run can be flagged as a baseline and compared to one other run — that's the whole of "comparison" for now), no governance approval workflows beyond the Wiki's own draft→review→approved gate, no training-dataset export, no LoRA/QLoRA/DoRA, no full Runs/Tracing subsystem (only the `eval_run_id`/`eval_case_id` linkage on `ai_operation_logs` described above). An evaluation result — including a `failed` one — never automatically modifies production knowledge, prompts, or models; every correction (score override, failure reclassification) is an explicit human action via `submitHumanReviewAction`.

There's still no general-purpose `/search` retrieval UI outside the evaluation pipeline — `match_documents`/`match_wiki_vectors` exist and are exercised by every eval run, but nothing else calls them yet.
