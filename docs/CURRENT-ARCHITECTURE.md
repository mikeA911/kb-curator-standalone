# KB Sandbox — Current Architecture

Living documentation of what's actually implemented, as of Milestone 4 (Controlled Graph Runtime). Where this differs from `KB Sandbox.md`'s original brief, that's called out explicitly with a reason — this file describes reality, not intent.

## Milestone roadmap

The project follows a revised milestone sequence (superseding any earlier "Milestone 4/5..." numbering implied by the original brief). Everything through **M4 is built**; M5 onward is planned, not started.

| # | Milestone | Status |
|---|-----------|--------|
| M1 | Curator Foundation — auth, projects/KB basics, upload, parsing, chunking, enrichment, review, embeddings, pgvector, RLS, AI provider abstraction | Built |
| M2 | LLM Wiki & Provenance — versioned Wiki lifecycle, AI-assisted synthesis, source provenance, Quick Help | Built |
| M3 | Evaluation Engine — datasets/cases/runs/results, retrieval metrics, LLM judge, human review, baseline comparison | Built |
| M3.5 | Multi-Provider / Multi-Model AI Registry — `ai_providers`/`ai_models`, Groq + generic OpenAI-compatible gateway, capability validation | Built |
| M3.6 | Projects, Membership & Isolation — `project_members`, project roles, project-scoped RLS, client/training isolation | Built |
| M3.7 | Public / Anonymous Experience — public About/Examples/Knowledge, explicit publish/unpublish, anon-safe RLS | Built |
| M4 | Graph Runtime / Controlled Agent Loop — Retrieve → Generate → Evaluate → Retry/End, persistent state, graph versioning | Built |
| M5 | First Formal Agents — model + instructions + state + sources + tools + graph + guardrails + eval suite, starting with a RAG Answer Agent | Planned |
| M6 | Runs, Tracing & Experiments — full execution traces, experiment definitions, configuration leaderboard | Planned |
| M7 | Governance Foundation — AI system inventory, risk tier, controls, evaluation gates, approval records, audit evidence | Planned |
| M8 | Research & Knowledge-Maintenance Agents — bounded research agent, claim extraction, proposed Wiki updates with human approval | Planned |
| M9 | Learning & Model Adaptation — structured corrections, validated training datasets, LoRA/QLoRA/DoRA experiments, governed promotion | Planned |
| M10 | Training / Consultant Enablement Layer — guided learning projects, reusable templates, curated examples for junior consultants | Planned |

The sections below describe M1–M4 as actually implemented. See each section heading for which milestone introduced it.

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

As of Milestone 3.6/3.7, authorization is really three tiers layered on top of each other: **platform role** (`profiles.role`, this section), **project role** (`project_members.role`, scoped to one project — see [Projects, Membership & Isolation](#projects-membership--isolation-milestone-36)), and **public/anon** (no role at all, read-only, scoped to explicitly published content only — see [Public / Anonymous Experience](#public--anonymous-experience-milestone-37)).

Approval-type actions (`approveDocument`, `approveArticleAction`) use a service-role Supabase client, mirroring what the old app's `admin-api` Edge Function did — except that logic now lives in this app's own server runtime instead of a separate Supabase Edge Function, since Next.js Server Actions cover the same "run with elevated privilege, server-side" need.

## AI provider abstraction (registry: Milestone 3.5)

`src/lib/ai/provider.ts` defines `generateText` / `generateStructured` / `embed`, each accepting an optional `model` to override whatever default the provider instance was built with. `OpenAIProvider`, `GeminiProvider`, and `OpenAICompatibleProvider` implement it — the last one is a single reusable class (constructor: name, API key, base URL, optional default model) that covers Groq and any future OpenAI-API-shaped gateway (local vLLM, an enterprise gateway, etc.) via the already-installed `openai` npm package with a custom `baseURL`, rather than one class per vendor.

Providers and models are no longer a hard-coded TS union — they're admin-managed rows in `ai_providers`/`ai_models` (`src/lib/ai/registry.ts`), seeded with OpenAI, Gemini, and Groq. `ai_providers.api_key_env_var` stores only the env var *name* (`'GROQ_API_KEY'`), never a secret value — the admin UI reports `Configured`/`Missing` by checking `process.env[...]` server-side. `ai_models` carries per-model capability flags (`supports_structured_output`/`tools`/`reasoning`/`vision`/`embeddings`), a `status` lifecycle (`active`/`deprecated`/`disabled`/`unavailable`) with optional `deprecation_date`, and `is_default` — a partial unique index (`ai_models_one_default_per_type`) enforces at most one default per `model_type`, which is what makes "the default generation model" and "the default embedding model" genuinely independent (e.g. Groq for generation, Gemini for embedding) rather than one universal "active provider" setting.

`getActiveProvider()` (`src/lib/ai/registry.ts`, re-exported from `src/lib/ai/index.ts`) resolves to whichever provider/model the registry currently marks as the default generation model — this replaced the old `settings.ai_provider` key entirely; Wiki synthesis and chunk enrichment call it unchanged. `getProviderByName(supabase, name, logContext)` is the one place that picks a specific provider independent of the platform default — evaluation runs use this, now `async` since it's a DB lookup rather than a switch over a hard-coded union. `assertModelCapability(model, need)` is called once at the top of `executeEvalRun` (not scattered provider-name checks) to reject a disabled model, an embedding model in a generation slot, or a non-structured-output model selected as an LLM judge, before any API call is made. `classifyProviderError()` (`src/lib/ai/provider.ts`) turns a caught SDK error into one of `rate_limit`/`quota_exceeded`/`model_unavailable`/`authentication`/`invalid_request`/`unknown`, attached to `AIProviderError.errorCode`.

Every field of an eval run's `generation`/`embedding`/`evaluator` config (`EvalRunConfig`) is a plain string (provider name + model id), not a foreign key into `ai_models` — a run's stored config is a value snapshot, so a model being disabled or deleted from the registry later never changes what a historical run says it tested. `getProviderByName`/`resolveModel` are only ever called at run-creation time; reading back a completed run never re-resolves or re-validates against the current registry state.

`ai_operation_logs` carries `eval_run_id`/`eval_case_id` columns (`LogContext`, `src/lib/ai/logging.ts`) so an AI call made during an eval run — embedding, generation, or judge — can be traced back to the specific run and case that triggered it, without building the full Runs/Tracing subsystem that's planned for a later milestone.

The initial embedding profile is `vector(1536)`, recorded per-row via `embedding_model`/`embedding_dim` rather than assumed — see the column comment on `kb_vectors.embedding` in `supabase/migrations/20260808190006_kb_vectors.sql`. Changing the default embedding model later is an additive migration (new column + re-embed job), not a silent dimension mismatch; adding a new *generation* provider (as Groq's addition demonstrated) requires no schema change to the vector tables at all.

### What's explicitly not built yet (provider/model registry)

No quota/rate-limit header telemetry beyond the basic error-code classification above; no model discovery for Gemini (the `@google/genai` SDK isn't wired up for it — Gemini models stay manually configured, `supports_model_discovery=false`); no Project-level model allowlists or preferred-model settings; no Agent model configuration (no Agents exist yet). All four are explicitly deferred, not oversights.

## Projects, Membership & Isolation (Milestone 3.6)

A **project** (`projects`) scopes a piece of AI engineering work — one of five `project_type`s (`learning`/`experiment`/`consulting`/`transformation`/`knowledge`) — and can own a project-specific knowledge base and/or eval dataset (nullable `project_id` FK on `knowledge_bases`/`eval_datasets`; `null` means "platform-global," e.g. the AI Engineering Wiki Benchmark).

Authorization is deliberately **two-tier**, tracked as two entirely separate concepts:

- **Platform role** (`profiles.role`: `anonymous`/`consultant`/`curator`/`admin`) — what someone can administer across KB Sandbox as a whole.
- **Project role** (`project_members.role`: `owner`/`curator`/`consultant`/`viewer`) — what they can do inside *one specific project*. Granting `consultant` on one project never implies access to another. A project's `owner_id` always has a matching `owner` membership row, enforced by an `after insert on projects` trigger (`create_owner_membership`), not by every call site remembering to insert one.

Four `SECURITY DEFINER` SQL helpers (`supabase/migrations/20260810120001_project_members.sql`, same pattern as `is_admin`/`is_curator_or_admin`) back every project-scoped RLS policy, each with a **platform-admin bypass** built in so "admin sees/manages everything" never has to be repeated in a policy body: `is_project_member`, `can_manage_project` (owner-only — this is also the M3.7 publish gate), `can_curate_project` (owner/curator), `can_run_project_evals` (owner/curator/consultant, excludes `viewer`).

Existing platform-wide curator/admin policies from Milestone 3 are **intentionally untouched** — a platform curator/admin still manages any dataset regardless of project, which is what keeps the platform-level AI Engineering Wiki Benchmark working for every consultant. What's new is scoping: a project's own `knowledge_bases`/`eval_datasets`/`eval_runs` are only visible to that project's members (RLS on `knowledge_bases`/`eval_datasets`/`eval_cases`/`eval_runs`/`eval_results`, each policy re-checking `project_id is null or is_project_member(...)`), and a `before insert or update on eval_datasets` trigger (`validate_eval_dataset_project_kb_consistency`) rejects attaching a knowledge base that belongs to a *different* project.

UI: a Team step in the project-creation wizard (stage members by email, resolved via a narrow service-role lookup that only ever returns `id`+`email`) and a full Members page (`/projects/[id]/members`) for role changes, activation/deactivation, and ownership transfer — all mutations go through the caller's own RLS-scoped client, matching every other Server Action in this codebase; `requireUser()`'s anonymous-role rejection is defense-in-depth on top of RLS, not the real gate.

## Public / Anonymous Experience (Milestone 3.7)

A **public visitor** here means literally `auth.uid() is null` — no session, no profile row, Supabase's plain `anon` API key. This is a different concept from `profiles.role = 'anonymous'` (a real Supabase Auth anonymous sign-in session, built in an earlier migration but never wired up to any UI) — that machinery is left dormant on purpose; nothing in this milestone creates or depends on an `'anonymous'`-role profile.

Governing principle: **publish a curated view of a project, never the internal project itself.** Nothing became public by weakening an existing RLS policy — every public read path is a new, additive policy (`supabase/migrations/20260810130001_public_visibility.sql`) plus a dedicated narrow-`select()` query function, since RLS is row-level only and several tables (`projects`, `wiki_versions`) carry columns (`owner_id`, `notes`, `details`, `published_by`, `source_chunk_ids`, `created_by`, `approved_by`) that must never reach a public reader even on an otherwise-visible row.

- **`projects`** gains `visibility` (`private`/`internal`/`public`, default `private` — never auto-changed), `public_slug` (unique), `public_profile` (jsonb — hand-authored title/summary/problem/approach/findings/conclusion/`benchmarkSummary`/`relatedWikiSlugs`, deliberately **not** a live rollup of `eval_results`), `published_at`, `published_by`. `projects_select_public` (additive) requires both `visibility = 'public'` and a non-null `published_at`. Publishing is gated to `can_manage_project` (owner or platform admin) — reuses the existing `projects_update_managers` policy, no new UPDATE policy needed, since the new columns live on the same row.
- **`wiki_articles`** gains `is_public` (default `false`), deliberately separate from `status='approved'` — approved means "trusted canonical knowledge," public means "safe for anonymous disclosure." `wiki_versions_select_public` scopes to exactly an article's *current* version via an `is_public_wiki_article()` helper — never a draft, a pending review revision, or a superseded-but-once-approved version.
- **Column safety is enforced by the query layer, not RLS**, in `src/lib/projects/public.ts`/`src/lib/wiki/public.ts` — both select an explicit narrow column allowlist and cast to a hand-typed row interface. (Supabase-js's select-string literal type inference doesn't resolve real per-column types against this codebase's hand-authored `Database` type — it silently degrades every field to `any` — so the actual TypeScript safety net here is the explicit row interface + cast, not the select string's type. The runtime column list sent to Postgrest is still exactly what's written regardless.)
- **Routes**: a new `(public)` route group (`src/app/(public)/`) — `/` (landing), `/about`, `/examples` + `/examples/[slug]` (published project showcases), `/knowledge` + `/knowledge/[slug]` (public Wiki articles). Its layout does not redirect on auth state — unlike `(app)/layout.tsx`, it works for a sessionless visitor and stays reachable for a logged-in user (who gets extra affordances, e.g. an owner's "Manage Public Page" link). Every other authenticated route is unchanged and still redirects to `/login`.
- **Publishing UX** (`/projects/[id]/publish`, owner/admin only): explicitly separate "Save draft" vs. "Publish"/"Unpublish" actions — changing a form field never auto-publishes. Unpublishing frees the slug and resets `visibility`/`published_at`/`published_by` but preserves the `public_profile` draft so the owner doesn't lose their work.
- Deliberately **not** exposed to anon: `wiki_sources`, `wiki_relations`, `project_members`, any `eval_*` table, `ai_operation_logs` — none of these gained a new policy this milestone, confirmed via a live anon-key regression check (`scripts/live-e2e.test.ts`).

## Graph Runtime (Milestone 4)

The first graph-based execution primitive: STATE + NODES + EDGES + CONDITIONAL TRANSITIONS + TERMINATION + TRACE. Extends the M3 single-pass pipeline (`retrieve → generate → score`) into a bounded retry loop (`retrieve → generate → evaluate → (accept → END | retry: diagnose → rewrite_query → retrieve)`, capped at `maxIterations`) without replacing the single-pass path, which remains available and unchanged. **The graph controls execution; the LLM only controls content generation and query rewriting inside nodes** — no `while(modelSaysContinue){modelDoAnything()}`. This is explicitly not the Agent milestone (M5): no tool-calling, no Agent Builder, no autonomous behavior; `ai_models.supports_tools` stays unread.

Uses `@langchain/langgraph` (`StateGraph`/`Annotation.Root`) for orchestration only — every node reuses an existing M3 service unchanged (`retrieveEvidence`, `generateAnswer`, `judgeAnswer`, `computeRetrievalMetrics`); LangChain never replaces `AIProvider` or the eval pipeline. `RagGraphState` (`src/lib/graph/state.ts`) is an explicit typed interface, never `Record<string, any>`.

- **Schema**: `graphs` (stable identity, nullable `project_id` = platform-global) → `graph_versions` (immutable config snapshot — no UPDATE RLS policy at all, same enforcement mechanism as `wiki_versions`; a graph's *active* version is tracked via `graphs.active_version_id`, updated in place, so `graph_versions` itself never needs an UPDATE) → `graph_runs` (one execution) → `graph_steps` (one row per executed node — the actual trace, the design brief's own framing: "more important than visual graph editing").
- **Nodes** (`src/lib/graph/nodes.ts`) — five plain, independently-testable functions, no LangGraph dependency of their own: `retrieveNode`/`generateNode` thinly wrap the M3 services; `evaluateNode` always runs deterministic retrieval metrics and adds an LLM judge only when one is configured (never fabricates a score with no golden answer); `diagnoseNode` uses deterministic rules only (missing expected evidence → `retrieval_failure`, low score → `generation_failure`); `rewriteQueryNode` produces only a revised retrieval query, never an answer.
- **Transition** (`src/lib/graph/transitions.ts`) — `shouldContinue()` is a pure, deterministic function (never asks the model "want another attempt?"): accepted → end; `iteration >= maxIterations` → end; retryable → diagnose. Three acceptance regimes depending on what's configured: judge-and-thresholds, deterministic-retrieval-hit-only (no judge but golden evidence exists), or a single pass ending in `terminationReason = 'unscored'` (deliberately distinct from `'success'` — nothing was checked, and a comparison UI must never conflate the two).
- **Reasoning retry vs. infrastructure retry** — structurally separate code paths. A thrown `AIProviderError` from an AI-calling node terminates the `graph_run` immediately (`status='failed'`, `termination_reason='provider_error'`) and never reaches `diagnose`; that's a catch block, not a graph edge. No infrastructure-level retry/backoff exists in the provider layer today — a transient `rate_limit` fails the run outright, a known limitation, not silently absorbed.
- **Eval integration**: `EvalRunConfig.execution` is optional (`{ mode: 'single_pass' | 'graph', graphId?, graphVersionId?, maxIterations?, acceptanceThresholds? }`) — absent means exactly today's single-pass behavior, fully backward compatible with every historical run. `runCaseViaGraph()` (`src/lib/eval/run.ts`) creates a `graph_runs` row and maps the graph's *final* state into the same `eval_results` shape the single-pass path writes (plus new nullable `graph_run_id`/`iteration_count` columns) — the results table, scoring, and run-comparison UI need no changes to understand a graph-mode result. `MAX_GRAPH_ITERATIONS = 5` (`src/lib/graph/errors.ts`) is a hard server-side ceiling regardless of what a run requests.
- **UI**: `/graphs` (list + `[slug]` detail — version history, "Activate Version," an ordinary list/ASCII flow diagram, deliberately no visual node-drag editor), an Execution Mode selector on `RunConfigForm`, and a trace panel added to the existing eval-result drill-down page (`/evals/runs/[id]/[resultId]`) showing each executed node/iteration when `eval_results.graph_run_id` is present.
- **RLS**: `graphs`/`graph_versions` use the same two-tier split `knowledge_bases` already uses for nullable `project_id` (global vs. project-scoped), except "manage" is owner-only for project-scoped graphs (`can_manage_project`, not `can_curate_project`) per the design brief's explicit "admin/project owner" wording. `graph_runs`/`graph_steps` mirror `eval_runs`' exact staff-unscoped-plus-consultant-project-scoped shape. All helper functions (`is_project_member`, `can_manage_project`, `can_run_project_evals`, `is_curator_or_admin`) are reused by name from M3.6, never redefined.
- **Known scope trim**: `graph_steps.ai_operation_log_id` linkage to the *specific* AI call a node made is not wired for M4 (the column exists for a later milestone) — providers are resolved once per case, not once per node invocation, so `ai_operation_logs.graph_run_id` is populated correctly but the step-level cross-reference isn't. The trace's core value (which nodes ran, their input/output/latency/status/iteration) doesn't depend on it.

## What's explicitly not built yet

Per Milestone 3's scope: no agents, no Agent Builder, no graph orchestration/loops, no automatic query rewriting, no autonomous research, no full Experiments subsystem (a run can be flagged as a baseline and compared to one other run — that's the whole of "comparison" for now), no governance approval workflows beyond the Wiki's own draft→review→approved gate, no training-dataset export, no LoRA/QLoRA/DoRA, no full Runs/Tracing subsystem (only the `eval_run_id`/`eval_case_id` linkage on `ai_operation_logs` described above). An evaluation result — including a `failed` one — never automatically modifies production knowledge, prompts, or models; every correction (score override, failure reclassification) is an explicit human action via `submitHumanReviewAction`.

There's still no general-purpose `/search` retrieval UI outside the evaluation pipeline — `match_documents`/`match_wiki_vectors` exist and are exercised by every eval run, but nothing else calls them yet.

Nothing through Milestone 4 builds toward M5 onward yet: no formal Agent definitions, no tool-calling (the registry's `supports_tools` flag exists but is unread), no Agent Builder UI, no multi-agent collaboration, no autonomous research, no Runs/Tracing/Experiments subsystem beyond the baseline-vs-one-other-run comparison already in Milestone 3 plus the graph trace panel, no governance inventory/risk-tier/approval-record system, no training-dataset export or model fine-tuning, no guided-learning-project templates. Real Supabase Auth anonymous sign-in sessions (`profiles.role='anonymous'`) also remain unbuilt/dormant — Milestone 3.7 solved "anonymous access" with a simpler no-session model instead (see above), not by finishing that older mechanism.
