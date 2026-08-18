// M5F: Claude answers the KB Sandbox System Understanding v1 assessment
// directly, as the "Claude (direct repository access)" participant --
// backed by first-hand knowledge of this codebase, most of it built or
// reviewed this same session. Makes the deliverable actually reviewable
// rather than just a shell.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const VERSION_ID = 'a957e114-696b-43dc-90d4-29350c99bec8'
const PROJECT_ID = 'a4107e39-f50e-41ab-83dd-6e41f4c450ac'

const { data: owner, error: ownerError } = await admin.from('profiles').select('id').eq('email', 'mike.aguilar@gmail.com').single()
if (ownerError || !owner) throw ownerError ?? new Error('mike.aguilar profile not found')

const { data: questions, error: qError } = await admin
  .from('system_assessment_questions')
  .select('id, sequence')
  .eq('assessment_version_id', VERSION_ID)
  .order('sequence')
if (qError) throw qError
const qId = Object.fromEntries(questions.map((q) => [q.sequence, q.id]))

const answers = [
  {
    seq: 1,
    classification: 'CONFIRMED',
    evidence: 'src/lib/auth.ts L38, L15-53; project_members RLS helper functions (can_manage_project/can_curate_project/can_run_project_evals) across supabase/migrations/2026081*',
    answer: `Two independent role systems exist. Platform role (profiles.role): anonymous(0) < consultant(1) < curator(2) < admin(3), enforced via requireRole(minRole) in most Server Actions and RLS helpers is_admin()/is_curator_or_admin(). Project role (project_members.role): owner, curator, consultant, viewer -- scoped to one project, enforced by RLS helper functions can_manage_project (owner or platform admin), can_curate_project (owner/curator or platform admin), can_run_project_evals (owner/curator/consultant, excludes viewer), resolved per project_id.

Platform role governs app-wide operations: AI provider/model registry, user/KB-registry administration, Wiki final approval, branding. Project role governs everything scoped to one project: workstream creation, artifact attachment, assessment management, membership, publication.

A single operation frequently checks the platform-role-looking function (requireUser, i.e. "not anonymous") while the REAL gate is project-role RLS -- e.g. createWorkstreamAction, because a person can be a project curator while holding only 'consultant' as their platform role. This is explicit in repo comments at each such call site, not accidental.`,
  },
  {
    seq: 2,
    classification: 'CONFIRMED',
    evidence: "src/lib/projects/public.ts; src/lib/projects/public-workstreams.ts; src/lib/wiki/public.ts; supabase/migrations/20260810130001_public_visibility.sql; supabase/migrations/20260817120001_public_full_detail.sql",
    answer: `Anonymous (auth.uid() is null, plain anon-key request) can read: published project examples at /examples via narrow-column query functions that explicitly exclude owner_id/notes/details/published_by even on an otherwise-visible row; a published project's real workstreams/artifacts/completed assessment responses ONLY if that specific project also has the stricter, admin-only public_full_detail=true flag set (every other published project is unaffected); public Wiki articles (is_public=true AND status='approved', two distinct flags); the Wiki category list (widened to anon since category names are non-sensitive).

Anonymous cannot write anything -- every one of the 90 Server Actions either throws via requireUser()/requireRole() for no session, or has an explicit if (profile.role === 'anonymous') throw guard even where requireUser() alone would technically let an anonymous profile session through.

Gap/caveat: profiles.role = 'anonymous' is a SEPARATE concept -- a real Supabase Auth anonymous session type that exists in the schema and in RLS policies, but no call site for creating one (e.g. supabase.auth.signInAnonymously()) was found anywhere in src/ during this pass. Classification for that specific sub-claim is INFERRED (absence-based), not CONFIRMED -- I did not find a positive removal, only an absent call site.`,
  },
  {
    seq: 3,
    classification: 'CONFIRMED',
    evidence: 'src/app/actions/projects.ts L32-84 (createProjectAction); DB trigger create_owner_membership referenced in the file\'s own comment L29',
    answer: `createProjectAction requires only a non-anonymous session (requireUser + explicit anonymous check) -- no platform-role gate on project creation itself, unlike most other write paths. A DB trigger (create_owner_membership) guarantees the creator gets an 'owner' project_members row before the action's own second insert (staged team members) runs.

Isolation is entirely RLS-based: every project-scoped table (project_workstreams, workstream_artifacts, system_assessments and its four child tables, project_notes, trending_items when project-scoped) carries project_id and is gated by RLS helper functions keyed on that column -- there is no separate "isolation layer" in application code; a cross-project read/write is blocked by Postgres policy, not by a check inside the Server Action.`,
  },
  {
    seq: 4,
    classification: 'CONFIRMED',
    evidence: 'src/app/actions/projects.ts L139-196 (addProjectMemberAction, updateProjectMemberRoleAction, updateProjectMemberStatusAction, transferOwnershipAction); resolveUserIdsByEmail L15-21',
    answer: `project_members: (project_id, user_id, role, status). Roles: owner, curator, consultant, viewer. A member is added by email lookup -- resolveUserIdsByEmail uses the service-role client specifically because a plain RLS-scoped session cannot look up another user's id by email (profiles RLS only allows seeing your own row or, for staff, everyone). transferOwnershipAction is the one membership operation with side effects beyond itself: it moves projects.owner_id, promotes the target membership to 'owner', and demotes whoever held it before to 'curator' -- a project always has exactly one owner_id, this prevents a stale/conflicting second owner row.`,
  },
  {
    seq: 5,
    classification: 'CONFIRMED',
    evidence: 'src/app/actions/projects.ts L61-63 (createProjectAction attach), L89-94 (attachKnowledgeBaseAction)',
    answer: `knowledge_bases carries a nullable project_id FK. A KB can be attached at project-creation time (createProjectAction's input.knowledgeBaseId) or afterward via attachKnowledgeBaseAction (curator+ platform role). A KB is not required to belong to any project -- platform-wide Knowledge Bases exist too (e.g. the AI Engineering Wiki KB referenced elsewhere in this codebase's history). The relationship is one KB to at most one project, not many-to-many.`,
  },
  {
    seq: 6,
    classification: 'CONFIRMED',
    evidence: 'src/app/actions/wiki.ts (entire file); supabase/migrations/20260808220006_wiki_rls.sql (referenced)',
    answer: `wiki_articles.current_version_id points at a wiki_versions row; versions are effectively immutable once approved (approved_by/approved_at stamped, never un-stamped except via rejectArticleAction which resets the ARTICLE's status back to draft, not the version itself). Lifecycle: draft (manual or AI-assisted synthesis) -> curator submits for review (submitArticleForReviewAction) -> admin approves (approveArticleAction, service-role client, since wiki_versions has no client-side UPDATE RLS policy at all) or rejects back to draft (rejectArticleAction) or the article is archived (archiveArticleAction, admin).

Approval also best-effort embeds the approved content -- resolves getActiveEmbeddingProvider() (the embedding-purpose default, independently configured, not the plain generation default) inside the same try/catch that already protects the embed call, so a missing/misconfigured provider degrades to "approved but not yet searchable," never blocks the approval itself.

is_public is a SEPARATE flag from approval -- "approved" means trusted canonical knowledge, "public" means safe for anonymous disclosure. An article can be approved and never public.`,
  },
  {
    seq: 7,
    classification: 'CONFIRMED',
    evidence: 'src/app/actions/workstreams.ts L28-61 (createWorkstreamAction)',
    answer: `project_workstreams.project_id is a required FK -- a workstream always belongs to exactly one project, and one project can have many workstreams (e.g. the CareCall project has three: one per participating AI tool). A workstream represents one bounded unit of external engineering work with its own repository_scope, guardrail text, deliverables checklist, and optional summary. createWorkstreamAction requires only a non-anonymous session at the application layer -- the real gate is project-role RLS (can_curate_project), not platform role, per the Q1 caveat.`,
  },
  {
    seq: 8,
    classification: 'CONFIRMED',
    evidence: 'src/app/actions/workstreams.ts L117-155 (attachArtifactAction); isGithubUrl L11-18',
    answer: `workstream_artifacts is insert-only at the RLS layer -- no UPDATE/DELETE policy exists, an explicit "immutable evidence trail" design (per the migration's own comment). Fields: artifact_type (enum: capability_inventory, endpoint_inventory, openapi_spec, mcp_server, evidence_map, test_results, findings, other), title, external_tool (free text, e.g. "Claude Code"), content (inline markdown/text), external_url, notes, created_by.

At least one of content or external_url must be present. If external_url is set, it must pass isGithubUrl (https, hostname github.com or www.github.com) -- a local filesystem path or non-GitHub link is rejected with a clear validation error; this check exists specifically because an earlier real mistake (a local Windows path pasted into this field) surfaced the gap.

attachArtifactAction is gated to consultant+ (broader than curator) -- the person who actually did the external work is who attaches the evidence.`,
  },
  {
    seq: 9,
    classification: 'CONFIRMED',
    evidence: 'src/app/actions/assessments.ts (entire file); supabase/migrations/20260816110001_system_assessments.sql',
    answer: `Five-table schema: system_assessments -> system_assessment_versions (draft/active/retired; at most one version accepts responses at a time, enforced by activateAssessmentVersionAction retiring the prior active version before activating a new one) -> system_assessment_questions (ordered by sequence) alongside assessment_responses (one row per participant_label per version, upserted via saveAssessmentResponseAction) -> assessment_answers (one row per question per response; only answers with non-blank text are ever upserted -- an earlier version of this code upserted a row for every question regardless of content, making a 1-of-10-answered draft display as if all 10 were answered, fixed this same session).

Scoped at the PROJECT level, not strictly the workstream level -- project_id is denormalized onto every one of the five tables, and workstream_id on system_assessments itself is a soft, nullable link (not used for access control). This is a deliberate, documented interpretive decision made when this feature was built: it lets one assessment span multiple workstreams within a project (e.g. Claude/OpenAI/Grok workstreams in the CareCall project all answer the SAME assessment, enabling side-by-side comparison), rather than requiring a separate assessment per workstream.`,
  },
  {
    seq: 10,
    classification: 'CONFIRMED',
    evidence: 'src/app/actions/ai-providers.ts (entire file); supabase/migrations/20260810110001_ai_providers_and_models.sql',
    answer: `ai_providers: name, provider_type (enum: openai, gemini, groq, openai_compatible), display_name, base_url, api_key_env_var (the environment variable's NAME only -- the actual key value is never stored in the database, resolved server-side from process.env at call time), enabled, supports_model_discovery.

ai_models: provider_id FK, model_id, display_name, model_type (enum: generation, embedding, speech, multimodal), enabled, status (active/deprecated/disabled/unavailable), plus capability flags (supports_structured_output, supports_tools, supports_reasoning, supports_vision, supports_embeddings).

All CRUD is admin-only (requireRole('admin') throughout ai-providers.ts). discoverModelsAction is the one read-oriented, best-effort action -- it lists what a provider's own API currently offers (via the OpenAI-compatible /models list endpoint) but never auto-registers anything; an admin reviews the list and explicitly adds whichever models they want via createModelAction.`,
  },
  {
    seq: 11,
    classification: 'CONFIRMED',
    evidence: 'src/lib/ai/registry.ts (getActiveProvider, getActiveEmbeddingProvider, getActiveStructuredOutputProvider); supabase/migrations/20260810110001_ai_providers_and_models.sql L58-62 (is_default partial unique index per model_type); supabase/migrations/20260818090001_ai_models_structured_output_default.sql (is_default_structured_output)',
    answer: `Not two independent defaults -- THREE. is_default is scoped per model_type via a partial unique index (ai_models_one_default_per_type), which is what makes the generation default and the embedding default independent of each other (they're different model_type values, so setting one never touches the other). A separate, third default -- is_default_structured_output -- is NOT scoped by model_type (a single global partial unique index) since structured output is a CAPABILITY flag on a generation-type model, not a distinct model_type value; a DB check constraint prevents flagging a model that doesn't actually support it.

Three resolver functions in the registry, each independently callable: getActiveProvider() (plain generation), getActiveEmbeddingProvider() (embedding), getActiveStructuredOutputProvider() (structured output).

This independence is not theoretical -- it was the subject of two real bugs found and fixed earlier this same session. Chunk approval and Wiki article approval both originally called getActiveProvider() (the generation default, e.g. Groq) to do their embed step; Groq does not support embeddings at all, so every chunk approval threw a live 500 error and every Wiki approval silently skipped its embedding (caught by a best-effort try/catch). Separately, chunk enrichment and AI-assisted Wiki drafting both originally used the generation default for a structured-output (JSON extraction) task, which happened to work only because Groq's default model also supports structured output -- there was no way to configure a DIFFERENT model for that purpose until getActiveStructuredOutputProvider() was added.`,
  },
  {
    seq: 12,
    classification: 'CONFIRMED',
    evidence: 'src/app/actions/eval.ts (entire file, 8 actions)',
    answer: `eval_datasets (draft/active/archived) hold eval_cases; curator creates a dataset and its cases, then activates it once it has at least one case (activateDatasetAction checks a non-zero count first). createAndRunEvalAction (consultant+) creates an eval_runs row and executes it SYNCHRONOUSLY inside the same Server Action call (executeEvalRun) -- no background job queue exists at this milestone, explicitly because datasets are small (10-15 cases) by design.

A plain consultant may only run against an ACTIVE dataset, never a draft still being authored; curator/admin retain the ability to test-run against a draft before activating it -- enforced both in the action (an explicit status check for the consultant case) and independently in RLS, so the boundary holds even if the action-layer check were bypassed.

markBaselineAction designates exactly one run per dataset as the comparison baseline (unsets the prior baseline first). submitHumanReviewAction records human_* score columns that are strictly additive alongside the automated scores -- never overwrites them.`,
  },
  {
    seq: 13,
    classification: 'CONFIRMED',
    evidence: 'src/app/actions/graphs.ts; src/lib/graph/; src/app/actions/agents.ts L51-62 (askRagAnswerAgentAction)',
    answer: `A single-pass evaluation makes one generation call per case: retrieve evidence, generate an answer, score it, done. The Graph Runtime (LangGraph-based) instead models a run as explicit nodes/states/transitions -- for example retrieve -> generate -> evaluate -> either finish or rewrite-the-query-and-retrieve-again -- with a graph_steps table recording the full execution trace (sequence_number-ordered: which node ran, in what order, with what result).

EvalRunConfig carries an Execution Mode selecting between plain single-pass generation and invoking a graph, wired into the run-configuration UI. The RAG Answer Agent (askRagAnswerAgentAction) is one concrete consumer -- it invokes a graph via answerQuestion() and separately fetches that run's graph_steps as a UI convenience layered on top, so the caller gets both the final answer and the full step-by-step trace of how the graph arrived at it. activateGraphVersionAction is the one mutation exposed for graphs -- switching which version of a graph definition is currently live for a given graph_id.`,
  },
  {
    seq: 14,
    classification: 'CONFIRMED',
    evidence: 'src/app/actions/agents.ts (entire file, 3 actions); src/lib/agent/',
    answer: `agents/agent_versions schema with an active_version_id pointer on the agent row (same circular-FK-added-after-table-exists pattern used elsewhere, e.g. wiki_articles/wiki_versions). activateAgentVersionAction switches which version is live -- real enforcement is RLS (agents_manage_staff for platform-global agents, agents_manage_project_owner for project-scoped ones); the action's own zero-rows check afterward exists only to turn an RLS-blocked update into a clear error message.

createAgentFromTemplateAction instantiates a new agent from a predefined template -- any non-anonymous session, RLS-gated the same way.

There is no generic "invoke any agent" entry point. Each agent TYPE has its own dedicated action wrapper -- askRagAnswerAgentAction is the one example that exists today, gated to consultant+ specifically (not merely non-anonymous), with anonymous/public agent execution explicitly and deliberately excluded at this milestone per an in-repo comment.`,
  },
  {
    seq: 15,
    classification: 'CONFIRMED',
    evidence: 'src/app/actions/workstreams.ts L28-61 (guardrail field on createWorkstreamAction); observed reuse pattern in the CareCall workstreams (all three carry the identical "Safe Legacy Modernization" text)',
    answer: `A guardrail is stored as a single free-text markdown field, project_workstreams.guardrail -- not a separate table, enum, or reusable registry entry. It is rendered on the workstream page through the shared Markdown component. Reuse across workstreams (e.g. the same "Safe Legacy Modernization" guardrail text appearing verbatim on all three CareCall workstreams) currently happens by copy-pasting the same string when creating each workstream, not by referencing a shared row.

Gap: this is directly relevant to the M5F design note's own listed hypothetical route GET /api/guardrails, which implies a queryable, structured guardrail registry. That registry does not exist today -- guardrails exist only as unstructured per-workstream text. If Phase C wants "select an existing guardrail" as an Assistant-facing operation, it would need either a new registry table or a query that de-duplicates existing free-text guardrail strings across workstreams; neither exists yet.`,
  },
  {
    seq: 16,
    classification: 'CONFIRMED',
    evidence: 'supabase/migrations/20260810130001_public_visibility.sql; supabase/migrations/20260817120001_public_full_detail.sql; src/app/actions/projects.ts L205-249; src/app/actions/wiki.ts L258-264',
    answer: `Two independent public-exposure mechanisms, neither implying the other. (1) Wiki: wiki_articles.is_public, set via setArticlePublicAction (admin-only), separate from approval status -- an approved article is not automatically public. (2) Projects: projects.visibility='public' + published_at (set via publishProjectAction, owner-or-admin) exposes only a curated, hand-authored public_profile JSON summary (title/summary/problem/approach/benchmark table/findings/conclusion) -- never live internal data by default. A second, stricter, admin-only flag, public_full_detail (setPublicFullDetailAction), additionally exposes that SPECIFIC project's real workstreams, artifacts, and assessment responses -- but even then, only active/retired assessment versions (never draft) and only completed responses (never in-progress) are RLS-visible to anon; every other published project is unaffected by one project's opt-in.`,
  },
  {
    seq: 17,
    classification: 'CONFIRMED',
    evidence: 'wiki_versions.promoted_from_trending_item_id, ai_provider/ai_model/ai_generated_at/verification_status columns; workstream_artifacts.external_tool/created_by; assessment_responses.external_tool/model/repository_ref',
    answer: `Provenance is maintained per-domain, ad hoc -- there is no single unified provenance table or mechanism across the app. Concrete examples: wiki_versions carries a nullable promoted_from_trending_item_id FK recording Trending -> Wiki promotion, and separately ai_provider/ai_model/ai_generated_at/verification_status columns record which AI system produced an AI-assisted synthesis. workstream_artifacts records external_tool (free text, e.g. which AI coding tool produced the evidence) and created_by (the human who attached it). assessment_responses records external_tool/model/repository_ref per participant. document_chunks trace back to their source document via document_id/source_page/chunk_index.

Gap: no created_via / assistant_prompt_version-style field exists anywhere yet. That is an explicit M5F Phase E requirement (recording that an object originated through the future Workbench Assistant) and was not built in this pass -- confirmed absent, not merely unconfirmed.`,
  },
  {
    seq: 18,
    classification: 'CONFIRMED',
    evidence: 'src/app/actions/curator.ts, wiki.ts, eval.ts, trending.ts (platform-role curator+); workstreams.ts, assessments.ts (project-role can_curate_project)',
    answer: `Platform-role curator+ (requireRole('curator')) gates: the legacy curation-queue management actions; the entire document curation pipeline (upload, enrichment, chunk approve/reject/draft, submit); most Wiki authoring paths (manual/AI-assisted draft creation, editing, source/related-article linking, submit-for-review); the entire eval-authoring surface (dataset/case creation, activation, archiving, baseline marking, human review submission); Trending's under-review/archive/public-toggle/promote-to-wiki actions.

Independently, PROJECT-role curator (can_curate_project, via RLS, not platform role) gates: workstream creation, deliverable-toggle, summary editing; assessment creation and version lifecycle management. A person can hold this authority in one project while their platform role is merely 'consultant' -- see Q1.`,
  },
  {
    seq: 19,
    classification: 'CONFIRMED',
    evidence: 'src/app/actions/admin.ts (entire file); src/app/actions/ai-providers.ts (entire file); src/app/actions/wiki.ts L210-264 (archive/approve/reject/setPublic); src/app/actions/branding.ts; src/app/actions/projects.ts L240-249',
    answer: `Platform-role admin (requireRole('admin')) gates: all 11 actions in admin.ts (Knowledge Base registry, curation queue, user listing/role/active-status/KB-assignment, user creation, legacy AI-provider setting, final document approval); all 9 actions in ai-providers.ts (the entire provider/model registry); Wiki final approve/reject/archive/set-public (the one Wiki tier gated specifically to admin rather than curator); the branding icon upload.

One project-scoped operation is deliberately admin-only regardless of project role: setPublicFullDetailAction. This is the single strictest gate in the whole app -- checked explicitly at the application layer (if (profile.role !== 'admin') throw ...) because RLS's own can_manage_project policy (owner-or-admin) cannot itself distinguish "admin-only" from "owner-or-admin" on that same column set, and this specific capability (exposing a project's raw internal data to anonymous visitors) needed to be stricter than the rest of the publish flow, which a project owner alone can otherwise fully control.`,
  },
  {
    seq: 20,
    classification: 'CONFIRMED',
    evidence: 'src/app/actions/workstreams.ts L117-155 (attachArtifactAction); src/app/actions/assessments.ts L186-243 (saveAssessmentResponseAction)',
    answer: `Entirely manual and asynchronous today -- there is no live integration, API, or MCP surface through which an external AI tool can push data into KB Sandbox directly. The actual workflow: a human runs an external tool (Claude Code, ChatGPT, Grok, etc.) OUTSIDE KB Sandbox against the target repository, then manually (a) attaches the resulting artifacts via attachArtifactAction, recording which tool produced them in the free-text external_tool field, with any link validated as a real github.com URL, and (b) submits assessment answers via saveAssessmentResponseAction under a participant_label identifying the participant/method, with external_tool/model/repository_ref fields capturing which tool and model were used.

This exact workflow is what the CareCall project in this same database demonstrates concretely: three separate workstreams (Claude Code, OpenAI, Grok), each populated this way, all answering the same System Understanding assessment for side-by-side comparison.

Explicitly UNKNOWN / not yet built: any automated path for an external tool to participate without a human manually copying its output in. Closing that gap is precisely what M5F Phases C (Workbench API) and D (MCP server) exist for -- this System Understanding assessment and its companion OpenAPI Discovery artifacts are the evidence base those later phases would design against, not something already implemented.`,
  },
]

const { data: response, error: responseError } = await admin
  .from('assessment_responses')
  .upsert(
    {
      assessment_version_id: VERSION_ID,
      project_id: PROJECT_ID,
      participant_label: 'Claude (direct repo access)',
      external_tool: 'Claude Code',
      model: null,
      repository_ref: 'https://github.com/mikeA911/kb-curator-standalone @ 9250a37890738712240dd4da8e43a0bfe6b38f09',
      status: 'completed',
      created_by: owner.id,
    },
    { onConflict: 'assessment_version_id,participant_label' }
  )
  .select('id')
  .single()
if (responseError || !response) throw responseError ?? new Error('Failed to upsert response')
console.log(`Response ${response.id}`)

const { error: answersError } = await admin.from('assessment_answers').upsert(
  answers.map((a) => ({
    response_id: response.id,
    question_id: qId[a.seq],
    project_id: PROJECT_ID,
    answer: a.answer,
    classification: a.classification,
    evidence: a.evidence,
  })),
  { onConflict: 'response_id,question_id' }
)
if (answersError) throw answersError
console.log(`Upserted ${answers.length} answers`)
