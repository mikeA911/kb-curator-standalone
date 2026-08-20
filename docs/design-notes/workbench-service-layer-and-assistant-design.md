# Workbench Service Layer & Conversational Assistant

Status: **implemented**. Originally produced for handoff to a coding AI session that had no memory of the conversation that produced it; retained here as the as-built reference for the service layer, MCP tool contract, and chat Assistant.

## Implementation status (as of 2026-08-20)

- **Phase A (Handbook Wiki), Phase C (service layer), Phase D (MCP contract), Phase E (Assistant)** — all shipped. `src/lib/workbench/{projects,workstreams,ai-providers,identity}.ts`, `src/lib/mcp/tools.ts`, `conversations`/`chat_messages` schema, chat panel UI.
- Both identity-resolution paths from §5.3 exist — cookie-based (live) and bearer-token (`resolveCallerIdentityFromToken`, built and tested, genuinely unused until an external MCP transport exists — that's intentional, not a gap).
- §10's deferrals remain correctly unbuilt: streaming, external MCP transport, autonomous code-writing.
- Superseded/extended by two follow-on design notes: [Assistant Identity, Provenance & the Document-First Principle](./assistant-identity-provenance-design.md) and [Guided Workbench Methods & Requirement Reasoning](./guided-workbench-methods-design.md).

## 1. Purpose & how to use this doc

This document specifies the architecture for four remaining phases of the M5F milestone in **KB Sandbox** (a Next.js 16.3.0 + Supabase AI-engineering workbench, deployed at kbsandbox.tech):

- **Phase A** — Workbench Handbook Wiki
- **Phase C** — Small Workbench API (service-layer extraction)
- **Phase D** — MCP server (internal-only, contract-first)
- **Phase E** — Conversational Workbench Assistant
- **Provenance fields** — tracking which of the above created a given record

**Phase B (self-analysis OpenAPI Discovery of KB Sandbox itself) already shipped** and was human-reviewed. Its five artifacts live as `workstream_artifacts` rows on the "KB Sandbox — API Discovery" project (`project_id: a4107e39-f50e-41ab-83dd-6e41f4c450ac`, workstream `7880c681-2fd6-4d2d-8309-4cf4c2bb7ee7`), and its key finding — **the app has zero conventional HTTP route handlers; every mutation and most reads go through Next.js Server Actions** (`src/app/actions/*.ts`, 16 files, `'use server'`) — is the starting fact every later phase in this doc builds on. `src/app/manifest.ts` is the one real framework-served endpoint (PWA manifest); it's unrelated to any of this.

**How to use this doc**: Section 2 is grounding — verified facts about the current codebase, each with a file:line citation, so you don't have to rediscover them. Sections 3–8 are the target design for each phase (section 4 states a cross-cutting principle rather than a phase), in recommended build order. Section 9 gives sequencing. Section 10 is explicitly out of scope — do not build these without a fresh design pass. Treat citations as of the commit this doc was written against; re-verify anything load-bearing before acting on it, since the codebase moves.

**This doc is documentation only.** No code, schema, or dependency changes were made to produce it.

## 2. Current-state findings (grounding)

### 2.1 No streaming, no tool-calling in `AIProvider`

The `AIProvider` interface (`src/lib/ai/provider.ts:107-112`) is strictly request/response:

```
generateText(input: GenerateTextInput): Promise<GenerateTextResult>
generateStructured<T>(input: GenerateStructuredInput<T>): Promise<GenerateStructuredResult<T>>
embed(input: EmbedInput): Promise<EmbedResult>
```

No `generateStream`/`chatStream`, no async generators, no SSE. All three concrete providers confirm this — `GeminiProvider.generateText` (`src/lib/ai/gemini-provider.ts:33-60`) calls `client.models.generateContent(...)` (not `generateContentStream`); `OpenAIProvider.generateText` (`src/lib/ai/openai-provider.ts:27-49`) and `OpenAICompatibleProvider.generateText` (`src/lib/ai/openai-compatible-provider.ts:38-60`) call `client.chat.completions.create(...)` with no `stream: true`.

No provider exposes function/tool calling either. `ai_models.supports_tools` exists as a DB column (`supabase/migrations/20260810110001_ai_providers_and_models.sql:40`, mirrored `src/types/database.ts:702`) but is explicitly unused — `supabase/migrations/20260811100001_graph_runtime.sql:6-8` states outright: *"this is NOT the Agent milestone (M5): no tool-calling, no arbitrary autonomy. `ai_models.supports_tools` stays unread by this migration's runtime."* Both Gemini's and OpenAI's underlying SDKs natively support function calling — the wrapper just doesn't expose it yet.

### 2.2 No chat schema anywhere

No `conversations`, `chat_messages`, or `assistant_sessions` tables in any of the 29 files under `supabase/migrations/`, and no matching types in `src/types/database.ts`. No chat/assistant Server Action file exists under `src/app/actions/`. One migration comment is a deliberate negation worth noting: `supabase/migrations/20260814110001_trending_knowledge.sql:38-39` — a discussion feature exists "to evaluate the significance of the source, not to be a chat feature."

### 2.3 No non-cookie auth path — this is the real gap Phase C must close

`requireUser()` (`src/lib/auth.ts:15-36`) and `requireRole()` (`src/lib/auth.ts:47-53`, checked against `ROLE_RANK = {anonymous:0, consultant:1, curator:2, admin:3}` at `auth.ts:38`) are **cookie-session-only**: they call `createClient()` (`src/lib/supabase/server.ts:9-28`), which reads `next/headers` cookies, then `supabase.auth.getUser()`, then loads the `profiles` row. There is no equivalent entry point for a caller that isn't a Server Component/Action request with a cookie jar — which is exactly the situation an MCP tool handler or an Assistant backend call is in.

`createAdminClient()` (`src/lib/supabase/admin.ts:10-14`) needs only env vars (Supabase URL + service-role key), **bypasses RLS entirely**, and per its own comment (`admin.ts:6-9`) must only be used "after an explicit authorization check" — it performs **zero identity verification of its own**. It is not a substitute for an auth path; it's a privileged tool that something else must gate.

Supabase does already issue standard JWT access tokens on login (used internally by the cookie-based flow). `supabase.auth.getUser(token)` can verify an arbitrary bearer token and return the identity it belongs to, without needing a cookie jar — this is the mechanism Phase C should build on (see §5.3), but it should sit behind a narrow interface rather than being called directly everywhere, in case the verification mechanism needs to evolve later (e.g., token introspection caching, a different issuer).

### 2.4 Service-layer readiness is uneven across `src/app/actions/*.ts`

Sampled `curator.ts`, `wiki.ts`, `projects.ts`, `workstreams.ts`, `ai-providers.ts`:

- **`curator.ts`** (73 lines) — almost entirely thin: every action (lines 24-71) calls straight into `src/lib/curator/documents.ts` / `src/lib/curator/chunks.ts` (`createUploadedDocument`, `processDocument`, `enrichDocumentChunks`, `approveChunk`, `rejectChunk`, `saveChunkDraft`, `submitDocument`, `deleteDocumentById`). Body is just `requireRole('curator')` + a lib call + `revalidatePath`. **Near-mechanical to extract.**
- **`wiki.ts`** (264 lines) — mostly thin too: create/edit/link/approve/reject/archive/publish delegate to `src/lib/wiki/{articles,review,sources,relations,synthesis,help}.ts` (e.g. `wiki.ts:51-62`, `142-152`, `224-235`). But `createAIAssistedDraftAction` (`wiki.ts:73-134`) has real inline orchestration: fetches chunks, validates `review_status === 'approved'` (`wiki.ts:83-86`), joins document names, calls the AI provider, re-links sources in a loop.
- **`projects.ts`** (296 lines) — **mostly inline**. No `src/lib/projects/*` service beyond `errors.ts`; every action does raw `supabase.from(...)` queries plus permission logic directly in the file: the dual platform/project-role gate in `approveProjectAction` (`projects.ts:130-132`), a 3-step ownership-transfer update sequence (`projects.ts:203-224`), email→id resolution via the admin client (`projects.ts:15-21`), an admin-only column gate in `setPublicFullDetailAction` (`projects.ts:273`).
- **`workstreams.ts`** (155 lines) — **entirely inline**, no `src/lib/projects/workstreams.ts` service exists despite the plausible name. GitHub-URL validation (`workstreams.ts:11-18`), zero-rows-as-permission-denial pattern (`workstreams.ts:82-84`, `107-109`), deliverable-array mutation logic (`workstreams.ts:76-78`).
- **`ai-providers.ts`** (157 lines) — **inline**, no `src/lib/ai-providers/*`. Model-discovery embeds an `OpenAI` client construction directly (`ai-providers.ts:154-156`) and a default-flag two-step clear/set pattern (`ai-providers.ts:98-100`, `113-114`).

**Conclusion**: `curator.ts`/`wiki.ts` are ~80% ready to move as-is. `projects.ts`/`workstreams.ts`/`ai-providers.ts` are ~90%+ business logic that has to actually be rewritten into a service, not just relocated.

### 2.5 No generic provenance convention exists

Only narrow, per-table analogs exist today:

- `wiki_versions.generated_by` (`'human' | 'ai_assisted'`, `supabase/migrations/20260808220003_wiki_versions.sql:30-34`), plus `ai_provider`, `ai_model`, `ai_generated_at`, `source_chunk_ids` — provenance only for AI-assisted Wiki versions.
- `workstream_artifacts.external_tool` / `.created_by`, and `assessment_responses.external_tool` / `.model` / `.repository_ref` — tool/model attribution scoped to those two tables only.

A cross-table `created_via`/`assistant_prompt_version` convention genuinely does not exist. This was confirmed as an explicit known gap during Phase B: *"Gap: no created_via / assistant_prompt_version-style field exists anywhere yet... an explicit M5F Phase E requirement... confirmed absent, not merely unconfirmed"* (`scripts/answer-kbsandbox-system-assessment.mjs:171`).

### 2.6 Wiki synthesis only sources from `document_chunks`, and no Handbook category exists

`wiki_articles.status` lifecycle (`src/lib/wiki/articles.ts`): `'draft' | 'review' | 'approved' | 'archived'` (`src/types/database.ts:208`, constraint at `supabase/migrations/20260808220002_wiki_articles.sql:15`). Transitions: `createArticleShell` → `draft` (`articles.ts:48`); `submitArticleForReview` draft→`review` (`articles.ts:169-178`); `approveWikiVersion` → `approved` + sets `current_version_id` (`src/lib/wiki/review.ts:34-38`, the only place that moves `current_version_id`); `rejectWikiVersionToDraft` → `draft` (`review.ts:41-44`); `archiveArticle` → `archived` (`articles.ts:180-183`). Editing approved content creates a new version via `createNextDraftVersion` (`articles.ts:140-167`) rather than mutating the approved row.

`synthesizeWikiDraft(provider, {topic, category, chunks})` (`src/lib/wiki/synthesis.ts:28-56`) is a pure function calling `provider.generateStructured` against a Zod schema. Its Server Action, `createAIAssistedDraftAction` (`src/app/actions/wiki.ts:68-131`), sources **only from `document_chunks`** with `review_status === 'approved'` (lines 77-86) — it has no path that ingests `workstream_artifacts` (e.g. the Phase B OpenAPI-discovery output) as source evidence. Result always lands as `status: 'draft'` (`createAIAssistedArticle`, `articles.ts:82-91`), never auto-published.

Categories are a fixed 6-value lookup: `foundations, knowledge_engineering, agent_engineering, reliability, governance, improvement` (`supabase/migrations/20260808220001_wiki_categories.sql:11-17`; type `src/types/database.ts:200-206`). None fit "documentation about the Workbench itself." `is_public` (`supabase/migrations/20260810130001_public_visibility.sql:36`) gates public visibility alongside `status='approved'` (`src/lib/wiki/public.ts:49-50,72-73`). `wiki_articles` has no `project_id` (confirmed via `supabase/migrations/20260808220002_wiki_articles.sql`) — only a nullable `knowledge_base_id` — so all users share one Wiki; there's no structural platform/project split today.

### 2.7 Route surface, confirmed unchanged

`Glob` for `src/app/api/**/*.ts` and `src/app/**/route.ts` both return no files — still true as of this writing. `src/proxy.ts:9-40` (Next 16's renamed `middleware.ts`) only refreshes the Supabase session cookie on every non-static request; it explicitly does **not** do route/role protection (see its own comment, lines 5-8) — that's delegated to `requireUser`/`requireRole` per page/action. Any future `/api/*` route would pass through this proxy unmodified.

## 3. Phase A — Workbench Handbook Wiki

Add one new `wiki_categories` value — `platform_handbook` — reusing the existing article/version/approval lifecycle exactly as-is (§2.6): `draft → review → approved`/`archived`, same `is_public` gating, same `current_version_id` mechanics. No new tables, no new status values, no new RLS shape — this is purely additive to an enum plus a modest extension to the synthesis path.

**Sourcing is dual, not code-derived-only.** The Handbook is expected to be a mix of two distinct kinds of content, and the design must support both:

1. **Implementation evidence** — extend `synthesizeWikiDraft`/`createAIAssistedDraftAction` (`src/lib/wiki/synthesis.ts:28-56`, `src/app/actions/wiki.ts:68-131`) to accept `workstream_artifacts` content as source material alongside (or instead of) `document_chunks` — today it's `document_chunks`-only (§2.6). This lets the first Handbook articles draw directly on the existing "KB Sandbox — API Discovery" artifacts (the Phase B capability/endpoint inventories, findings, evidence map) without re-deriving that knowledge. Concretely: a new source-selection mode in the AI-draft Server Action that fetches `workstream_artifacts` rows instead of `document_chunks` rows and passes their `content` into the same `synthesizeWikiDraft` call.
2. **Human-authored methodology** — a plain authoring path with *no* AI synthesis involved: the existing manual article-creation flow (`createArticleShell`, `articles.ts:48`) is already sufficient for this — a curator or the user writes a how-to/process article directly. This matters because capability and endpoint inventories describe *what the system does*, not *how a person should use it*; onboarding, workflow, and "why we do it this way" content has to be written by someone who has done the work, not inferred from source code.

Do not treat AI self-analysis as the Handbook's sole source — the doc, and any implementation of it, should make clear that both paths are first-class, not one primary and one fallback.

## 4. Core architectural principle (applies to §5–§7)

Every caller — existing Server Actions (UI), the MCP tool layer (Phase D), and the future Assistant's tool-calls (Phase E) — must converge on **one Workbench service layer and one authorization model**. The service layer described in §5 is not "the API for MCP" with something separate for the UI; it's the single place permission logic and business logic live. MCP tools and Server Actions are both meant to be thin adapters: resolve a caller identity, build a caller context, call the same underlying functions. Never implement the same permission check twice in two places — if a check needs to change, it should change in exactly one function.

## 5. Phase C — Small Workbench API (service-layer extraction)

### 5.1 Module structure

Introduce `src/lib/workbench/` as the target service layer, organized by domain to mirror the existing `src/app/actions/*.ts` split (`workbench/projects.ts`, `workbench/workstreams.ts`, `workbench/ai-providers.ts`, plus thin re-exports or direct reuse of the already-good `src/lib/curator/*` and `src/lib/wiki/*` modules — those don't need to move, just to be called through the same caller-context convention as everything else).

Each exported function takes a `WorkbenchCallerContext` (see §5.3) as an explicit first argument instead of implicitly deriving identity from cookies — this is what makes the function callable from a Server Action, an MCP tool handler, or (later) the Assistant's tool-calling loop, uniformly.

### 5.2 Migration plan per domain

- **Curator, Wiki** (`curator.ts`, most of `wiki.ts`): near-mechanical — the logic already lives in `src/lib/curator/*` / `src/lib/wiki/*`; change those functions to accept a `WorkbenchCallerContext` instead of doing their own `requireRole` call, and have the existing Server Actions become thin callers that build the context from cookies first. `createAIAssistedDraftAction`'s inline orchestration (`wiki.ts:73-134`) should move into a new `src/lib/wiki/ai-draft.ts`-style function as part of this pass.
- **Projects** (`projects.ts`): real extraction. Preserve the exact permission semantics already in place — especially `approveProjectAction`'s dual gate (platform admin/curator OR project owner/curator, `projects.ts:130-132`) and the 3-step ownership-transfer sequence (`projects.ts:203-224`) — these are not simplifiable without changing behavior, just relocate them intact into `src/lib/workbench/projects.ts`.
- **Workstreams** (`workstreams.ts`): real extraction into `src/lib/workbench/workstreams.ts`, carrying over the GitHub-URL validation (`workstreams.ts:11-18`) and the zero-rows-as-permission-denial pattern (`workstreams.ts:82-84,107-109`) as-is.
- **AI Providers** (`ai-providers.ts`): real extraction into `src/lib/workbench/ai-providers.ts`. Note the inline `OpenAI` client construction (`ai-providers.ts:154-156`) used for model discovery — this is a live network call to a third-party API and should stay carefully scoped to admin-only callers in the new location, matching today's behavior.

Do all of the above **incrementally, one domain at a time**, each independently shippable and testable — do not attempt a single big-bang extraction across all 16 action files.

### 5.3 `WorkbenchCallerContext` and identity verification

Define a caller-context shape carrying at minimum: `userId`, `profileRole` (the `ROLE_RANK` value), and a lazy/cached way to fetch project membership for a given project id (mirroring what `requireUser`/`requireRole` and the various `project_members` lookups already do today).

**Identity principle, not a fixed mechanism**: any caller into the Workbench service layer must resolve to a verified Supabase-issued identity before a `WorkbenchCallerContext` is built. Two concrete resolution paths should exist behind a shared, narrow interface (e.g. `resolveCallerIdentity(input): Promise<{ userId: string } | null>`):

1. **Cookie-based** (existing Server Actions): today's `requireUser()`/`createClient()` flow, unchanged.
2. **Bearer-token-based** (MCP, future Assistant backend calls): verify a Supabase access token via `supabase.auth.getUser(token)` and resolve the same `profiles` row.

Keep these behind the shared interface rather than scattering direct `supabase.auth.getUser(token)` calls through every new caller — if the verification mechanism ever needs to change (token introspection caching, a different issuer, revocation checks), it should change in one place.

### 5.4 What this phase does *not* need

No new public HTTP routes. No new credential system — reuse Supabase's own JWT issuance rather than inventing API keys. No change to RLS policies (the service layer sits in application code, calling Supabase the same way Server Actions do today, respecting the same RLS where the cookie-based client is used, and using the admin client only where an explicit permission check in the service layer has already run, exactly as today's inline logic does).

## 6. Phase D — MCP server (internal-only, contract/adapter first)

**Audience for this phase: internal only.** The only consumer is Phase E's in-app Assistant, calling in-process. No public transport, no OAuth flow — that's explicitly deferred (§10).

**Design the contract, not the transport.** The actual deliverable of this phase is an MCP **tool contract**: a set of named tools, each with a well-typed input/output schema, each mapping 1:1 onto a function in the Phase C service layer (§5). This contract should be transport-independent — it should not assume in-process calling forever, but it also should not be built out against any particular transport before there's a real external consumer.

Concretely:

- A tool registry module (e.g. `src/lib/mcp/tools.ts`) listing each tool's name, schema, and the `src/lib/workbench/*` function it adapts to.
- For now, tools are invoked directly in-process by the Assistant's tool-calling loop (Phase E) — no MCP SDK transport server needs to run yet.
- Permission enforcement is **fully delegated** to the `WorkbenchCallerContext` checks already built in Phase C (per §4) — the MCP layer must not reimplement or duplicate any authorization logic; it only adapts a tool call's arguments into a service-layer call and its result back into the tool's output schema.
- Note explicitly in the tool registry design that an external transport — **Streamable HTTP**, the current MCP specification's recommended remote transport (superseding the older HTTP+SSE transport) — is a plausible later addition once there is a concrete external MCP client to serve (e.g. wanting Claude Desktop or another MCP-aware tool to connect to a live KB Sandbox instance). Do not design that transport or its auth flow now; the contract/adapter layer defined here is what needs to be right, and a transport can be added on top of it without changing the contract.

## 7. Phase E — Conversational Workbench Assistant

**Scope**: a bounded in-app chat assistant, not an autonomous code-writing agent. It can answer questions using platform knowledge (Wiki, including the new Handbook from Phase A) and call a curated set of safe, well-defined tools from the Phase D registry — e.g. create a project, search Wiki, summarize an eval/assessment run, add a project note. It does **not** generate or apply code changes to the KB Sandbox codebase. When a user describes a new feature they want, the Assistant captures it as structured output (a feature-request record, or simply a well-formed written summary) for a human to bring to a coding AI session — it does not attempt to build it.

What has to be built for this phase to work at all:

1. **Extend `AIProvider`** (`src/lib/ai/provider.ts`) with streaming (`generateTextStream` or equivalent) and tool/function calling (`tools` param on the text-generation call, structured `toolCalls` in the result). Both Gemini's and OpenAI's SDKs already support function calling natively (see §2.1) — this is additive to the existing interface, not a rewrite of it. Decide per-provider whether tool-calling support is required at launch or can start with just the providers that support it, using `ai_models.supports_tools` (already in the schema, currently unread) to gate which models are offered for Assistant use.
2. **New schema**: `conversations` and `chat_messages` tables (owner/participant scoping — likely per-user, possibly per-project — message role, content, tool-call records, timestamps). No existing schema covers this (§2.2).
3. **Tool-calling loop**: Assistant receives a user message → calls the AI provider with the message history + the Phase D tool registry's schemas → on a tool-call response, invokes the corresponding MCP-layer tool (which adapts into the Phase C service layer, with the Assistant's own resolved `WorkbenchCallerContext`) → feeds the tool result back to the provider → repeats until a final text response → persists the turn.
4. **UI**: a chat panel — likely a persistent, collapsible panel available across the authenticated app shell (`src/app/(app)/layout.tsx` region) rather than a single dedicated page, so it can be invoked from any Workbench context. Exact placement is left to the implementing session's judgment; note it as an open decision, not a blocker.

## 8. Provenance fields

Once Phase E exists and the Assistant can write specific record types, add:

- `created_via text default 'ui'` — e.g. `'ui' | 'assistant'` (extend as new creation paths appear).
- `assistant_prompt_version` — which prompt/tool-schema version produced the record, for later auditing/evaluation.
- `assistant_conversation_id` — foreign key back to the `conversations` row (from §7.2) that produced the record, so a created project/note/etc. can be traced back to the exact chat turn that made it.

Add these **only to the specific tables the Assistant gains write access to** as each write-tool is built (e.g. `projects`, `project_notes`) — not as a single speculative migration touching unrelated tables now. This matches the existing narrow-provenance pattern already used on `wiki_versions` (§2.5) rather than inventing a new blanket convention ahead of need.

## 9. Recommended sequencing

**A → C → D → E**, each independently shippable and human-reviewed before the next begins — mirroring the review gate already used between Phase B and this document. Provenance fields (§8) land as part of Phase E, not as their own milestone.

*(This section originally proposed M-numbered sub-milestone labels for A/C/D/E. Those labels collided with the platform's own public roadmap numbering — see the Implementation status note at the top of this document — and have been dropped in favor of the plain phase letters used throughout this doc.)*

Rationale for this order: Phase A is self-contained (reuses ~100% of existing Wiki infrastructure, no architectural forks) and delivers value on its own regardless of whether C/D/E ever ship. Phase C is a prerequisite for both D and E (both need the service layer and the caller-context/identity work). Phase D is a relatively small, well-scoped contract definition once C exists. Phase E is the largest and most novel piece, and depends on both C (tools to call) and D (the contract shape those tool-calls target) — building it last means its riskiest new work (streaming, tool-calling, chat schema) is the only genuinely novel infrastructure left by the time it starts.

## 10. Explicitly out of scope / deferred

- **Autonomous code-writing agent** inside the product (the Assistant generating/applying code changes to this repo from a chat session). If ever wanted, it needs its own dedicated design pass — the safety and scope implications are materially different from the bounded Assistant in §7.
- **External MCP exposure** — a hosted/remote transport (Streamable HTTP or otherwise) reachable by Claude Desktop or other external MCP clients, and the OAuth/token flow that would require. Deferred until there's a concrete external consumer (§6).
- **A blanket provenance migration** across all tables speculatively, ahead of the Assistant actually having write access to them (§8).

## 11. Verification note

This document is a planning artifact — no code, schema, or dependency changes accompany it. Before acting on any specific claim in §2, re-verify the cited file:line against the current state of the repository, since it may have moved since this doc was written.
