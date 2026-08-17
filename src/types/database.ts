// Mirrors supabase/migrations/*.sql. Keep in sync by hand until this project
// generates types via `supabase gen types` against the live project.

export type UserRole = 'anonymous' | 'consultant' | 'curator' | 'admin'
export type DocType = string

export type ProcessingStatus =
  | 'pending'
  | 'parsing'
  | 'chunking'
  | 'review'
  | 'submitted'
  | 'completed'
  | 'failed'

export type ProcessingStage = 'upload' | 'parse' | 'chunk' | 'enrich' | 'embed' | 'review' | 'completed'

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'filtered' | 'enriching' | 'draft' | 'failed'

export type Parser = 'pdf' | 'docx' | 'text'

export interface ProcessingError {
  stage: ProcessingStage
  code: string
  message: string
  detail?: string
  occurred_at: string
  retryable: boolean
}

export interface EnrichmentError {
  code: string
  message: string
  occurred_at: string
}

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
  is_active: boolean
  assigned_kbs: string[]
  created_at: string
  updated_at: string
}

export interface KnowledgeBase {
  id: string
  name: string
  description: string | null
  project_id: string | null
  created_at: string
  updated_at: string
}

export interface CurationQueueItem {
  id: string
  kb_id: string
  title: string
  url: string
  status: 'pending' | 'in_progress' | 'completed'
  added_by: string | null
  created_at: string
}

export interface DocumentMetadata {
  filters_applied?: string[]
  processed_at?: string
  processing_duration_ms?: number
  [key: string]: unknown
}

export interface Document {
  id: string
  filename: string
  original_filename: string
  doc_type: DocType
  storage_path: string
  file_size: number | null
  mime_type: string | null
  source_url: string | null
  upload_date: string
  uploaded_by: string | null
  processing_status: ProcessingStatus
  processing_stage: ProcessingStage | null
  processing_error: ProcessingError | null
  total_chunks: number | null
  approved_chunks: number
  rejected_chunks: number
  metadata: DocumentMetadata
  created_at: string
  updated_at: string
}

export interface ChunkAIMetadata {
  topic?: string
  subtopic?: string
  relevance_score?: number
  use_cases?: string[]
  key_concepts?: string[]
  confidence?: number
  reasoning?: string
}

export interface DocumentChunk {
  id: string
  document_id: string
  chunk_index: number
  chunk_text: string
  chunk_size: number | null
  source_page: number | null
  source_section: string | null
  parser: Parser
  char_start: number | null
  char_end: number | null
  ai_metadata: ChunkAIMetadata | null
  confidence_score: number | null
  review_status: ReviewStatus
  enrichment_error: EnrichmentError | null
  curator_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  is_filtered: boolean
  filtered_reason: string | null
  metadata_edited: boolean
  metadata_edited_by: string | null
  metadata_edited_at: string | null
  created_at: string
}

export interface KBVector {
  id: string
  chunk_id: string
  document_id: string
  content: string
  embedding?: number[]
  embedding_model: string
  embedding_dim: number
  doc_type: DocType
  topic: string | null
  subtopic: string | null
  use_cases: string[] | null
  key_concepts: string[] | null
  relevance_score: number | null
  curator_notes: string | null
  source_document: string | null
  source_page: number | null
  source_url: string | null
  domain: string | null
  curator_name: string | null
  tags: string[] | null
  chunk_index: number | null
  word_count: number | null
  approved_date: string
  approved_by: string | null
  last_updated: string | null
}

export interface Setting<T = unknown> {
  key: string
  value: T
  updated_at: string
  updated_by: string | null
}

export type AIOperationName = 'generate_text' | 'generate_structured' | 'embed'

export interface AIOperationLog {
  id: string
  created_at: string
  operation: AIOperationName
  provider: string
  model: string
  document_id: string | null
  chunk_id: string | null
  requested_by: string | null
  latency_ms: number | null
  input_tokens: number | null
  output_tokens: number | null
  success: boolean
  error_message: string | null
  eval_run_id: string | null
  eval_case_id: string | null
  graph_run_id: string | null
  graph_step_id: string | null
}

export interface ChunkForReview extends DocumentChunk {
  document?: {
    filename: string
    doc_type: DocType
  }
}

// ============================================
// Wiki
// ============================================

export type WikiCategoryId =
  | 'foundations'
  | 'knowledge_engineering'
  | 'agent_engineering'
  | 'reliability'
  | 'governance'
  | 'improvement'

export type WikiArticleStatus = 'draft' | 'review' | 'approved' | 'archived'
export type WikiVerificationStatus = 'unverified' | 'verified' | 'needs_review'
export type WikiGeneratedBy = 'human' | 'ai_assisted'
export type WikiSourceType = 'document' | 'chunk' | 'external'

export interface WikiCategory {
  id: WikiCategoryId
  name: string
  sort_order: number
  created_at: string
}

export interface WikiArticle {
  id: string
  knowledge_base_id: string | null
  slug: string
  title: string
  category: WikiCategoryId
  short_description: string | null
  current_version_id: string | null
  status: WikiArticleStatus
  // Separate from status='approved' -- approved means "trusted canonical
  // knowledge", public means "safe for anonymous disclosure". Set only via
  // setArticlePublicAction (admin-only).
  is_public: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface WikiVersion {
  id: string
  wiki_article_id: string
  version_number: number
  quick_help: string
  content: string
  implementation_notes: string | null
  limitations: string | null
  verification_status: WikiVerificationStatus
  last_verified_at: string | null
  generated_by: WikiGeneratedBy
  ai_provider: string | null
  ai_model: string | null
  ai_generated_at: string | null
  source_chunk_ids: string[] | null
  created_by: string | null
  approved_by: string | null
  created_at: string
  approved_at: string | null
  // Which Trending item (if any) this version was promoted from -- see
  // trending_items / promoteTrendingToWikiAction.
  promoted_from_trending_item_id: string | null
}

export interface WikiSource {
  id: string
  wiki_version_id: string
  document_id: string | null
  chunk_id: string | null
  source_type: WikiSourceType
  relationship: string | null
  notes: string | null
  created_at: string
}

export interface WikiRelation {
  id: string
  from_article_id: string
  to_article_id: string
  relation_type: string
  created_at: string
}

export interface WikiVector {
  id: string
  wiki_version_id: string
  content: string
  embedding?: number[]
  embedding_model: string
  embedding_dim: number
  created_at: string
}

export interface WikiArticleWithVersion extends WikiArticle {
  current_version: WikiVersion | null
}

export interface WikiSourceWithEvidence extends WikiSource {
  document?: Pick<Document, 'id' | 'original_filename' | 'doc_type'> | null
  chunk?: Pick<DocumentChunk, 'id' | 'chunk_index' | 'source_page' | 'chunk_text'> | null
}

// ============================================
// Trending Knowledge (M5E)
// ============================================

// Deliberately not the Wiki draft/review/approved lifecycle -- Trending is
// "what are we watching?", Wiki is "what do we currently know?". See
// supabase/migrations/20260814110001_trending_knowledge.sql.
export type TrendingVisibility = 'platform' | 'project'
export type TrendingStatus = 'active' | 'under_review' | 'promoted' | 'archived'

export interface TrendingItem {
  id: string
  title: string
  source_url: string
  source_name: string | null
  description: string
  tags: string[]
  submitted_by: string | null
  project_id: string | null
  visibility: TrendingVisibility
  status: TrendingStatus
  // Separate axis from status -- see wiki_articles.is_public precedent.
  is_public: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export type TrendingItemInsert = Omit<
  TrendingItem,
  'id' | 'created_at' | 'updated_at' | 'status' | 'is_public' | 'published_at' | 'visibility' | 'tags'
> &
  Partial<Pick<TrendingItem, 'status' | 'is_public' | 'published_at' | 'visibility' | 'tags'>>
export type TrendingItemUpdate = Partial<Omit<TrendingItem, 'id' | 'created_at'>>

export interface TrendingComment {
  id: string
  trending_item_id: string
  author_id: string | null
  body: string
  created_at: string
  updated_at: string | null
}
export type TrendingCommentInsert = Omit<TrendingComment, 'id' | 'created_at' | 'updated_at'>

export interface TrendingWikiLink {
  id: string
  trending_item_id: string
  wiki_article_id: string
  linked_by: string | null
  created_at: string
}
export type TrendingWikiLinkInsert = Omit<TrendingWikiLink, 'id' | 'created_at'>

// ============================================
// Project Notes (M5E)
// ============================================

// 'project_team' means every member; 'curator'/'admin' mean any curator/admin
// on staff, not a specific person -- see can_view_project_note in
// supabase/migrations/20260814120001_project_notes.sql.
export type ProjectNoteRecipientType = 'user' | 'project_team' | 'curator' | 'admin'
export type ProjectNoteStatus = 'open' | 'resolved'

export interface ProjectNote {
  id: string
  project_id: string
  author_id: string | null
  recipient_type: ProjectNoteRecipientType
  recipient_user_id: string | null
  subject: string
  body: string
  // Polymorphic reference to a Workbench object (eval run, document, ...) --
  // no FK constraint, resolved per-type at read time. See ProjectNotes
  // Interpretive decisions in the M5E plan.
  context_type: string | null
  context_id: string | null
  status: ProjectNoteStatus
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
}

export type ProjectNoteInsert = Omit<
  ProjectNote,
  'id' | 'created_at' | 'status' | 'resolved_at' | 'resolved_by' | 'recipient_user_id' | 'context_type' | 'context_id'
> &
  Partial<Pick<ProjectNote, 'status' | 'resolved_at' | 'resolved_by' | 'recipient_user_id' | 'context_type' | 'context_id'>>
export type ProjectNoteUpdate = Partial<Omit<ProjectNote, 'id' | 'created_at' | 'project_id'>>

export interface ProjectNoteReply {
  id: string
  note_id: string
  author_id: string | null
  body: string
  created_at: string
}
export type ProjectNoteReplyInsert = Omit<ProjectNoteReply, 'id' | 'created_at'>

// ============================================
// Evaluation
// ============================================

export type ProjectType = 'learning' | 'experiment' | 'consulting' | 'transformation' | 'knowledge'
export type ProjectStatus = 'draft' | 'active' | 'completed' | 'archived'

// private = members/admin only (default, never auto-changed). internal =
// any authenticated user can view (editing still gated by project_members).
// public = a deliberately published presentation, visible with no session
// at all. Publishing is owner/admin only (see can_manage_project) -- never
// implied by curator/consultant project access.
export type ProjectVisibility = 'private' | 'internal' | 'public'

// Hand-authored public presentation content -- deliberately NOT a live
// rollup of eval_results (see publishProjectAction) and deliberately not
// one DB column per section. benchmarkSummary is a safe, curated summary
// table, never raw eval_run/eval_result rows.
export interface PublicProjectProfile {
  title?: string
  summary?: string
  problem?: string
  approach?: string
  findings?: string
  conclusion?: string
  benchmarkSummary?: {
    name: string
    rows: { metric: string; baseline?: string; variant?: string }[]
  }
  relatedWikiSlugs?: string[]
}

export interface Project {
  id: string
  name: string
  project_type: ProjectType
  objective: string | null
  status: ProjectStatus
  notes: string | null
  // Type-specific fields (hypothesis, success_criteria, business_problem, ...)
  // live here rather than as a wide table of nullable columns -- no template
  // engine, per the Project Model brief's explicit scope limit.
  details: Record<string, string>
  owner_id: string | null
  visibility: ProjectVisibility
  public_slug: string | null
  public_profile: PublicProjectProfile | null
  published_at: string | null
  published_by: string | null
  created_at: string
  updated_at: string
}

// Project role (owner/curator/consultant/viewer) is deliberately a separate
// concept from platform role (UserRole, above) -- one controls what someone
// can administer across KB Sandbox, the other what they can do inside one
// specific project. Granting 'consultant' in one project must never imply
// access to another.
export type ProjectRole = 'owner' | 'curator' | 'consultant' | 'viewer'
export type ProjectMemberStatus = 'active' | 'inactive'

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: ProjectRole
  status: ProjectMemberStatus
  created_at: string
  updated_at: string
}

// M5D (simplified) -- a Workstream is a scope document (repository scope,
// goal, a named guardrail, a deliverables checklist) that tells a
// consultant what to do with an external tool (e.g. Claude Code against a
// cloned openapi-modernizer/mcp-modernizer repo template); KB Sandbox never
// executes this itself. workstream_artifacts is the evidence trail the
// consultant attaches when they're done -- insert-only, no automated
// scoring against it in this pass.
export type WorkstreamStatus = 'draft' | 'active' | 'completed' | 'archived'

export interface WorkstreamDeliverable {
  label: string
  completed: boolean
}

export interface ProjectWorkstream {
  id: string
  project_id: string
  name: string
  slug: string
  status: WorkstreamStatus
  repository_scope: string[]
  goal: string | null
  guardrail: string | null
  // Outcome summary -- distinct from `goal` (what we set out to do). Curator-
  // editable, populated once artifacts/evidence exist.
  summary: string | null
  deliverables: WorkstreamDeliverable[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ArtifactType =
  | 'capability_inventory'
  | 'endpoint_inventory'
  | 'openapi_spec'
  | 'mcp_server'
  | 'evidence_map'
  | 'test_results'
  | 'findings'
  | 'other'

export interface WorkstreamArtifact {
  id: string
  workstream_id: string
  artifact_type: ArtifactType
  title: string
  external_tool: string | null
  content: string | null
  external_url: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export type EvalDatasetStatus = 'draft' | 'active' | 'archived'
export type EvalDifficulty = 'easy' | 'medium' | 'hard'
export type EvalRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type EvalResultStatus = 'completed' | 'failed'
export type EvidenceSource = 'chunks' | 'wiki' | 'both'
export type EvaluatorType = 'none' | 'llm_judge'
// Was a fixed 'openai' | 'gemini' union; providers are now admin-managed rows
// (see ai_providers/ai_models below) rather than a compile-time enum, so this
// is just ai_providers.name at the type level. Kept as a named alias (rather
// than inlining `string` at every call site) so the intent -- "this is a
// provider name" -- stays legible.
export type AIProviderName = string
export type FailureClassification =
  | 'knowledge_failure'
  | 'retrieval_failure'
  | 'reasoning_failure'
  | 'workflow_failure'
  | 'tool_failure'
  | 'behavior_failure'
  | 'rule_failure'
  | 'unknown'

// ============================================
// AI provider/model registry
// ============================================

export type AIProviderType = 'openai' | 'gemini' | 'groq' | 'openai_compatible'
export type AIModelType = 'generation' | 'embedding' | 'speech' | 'multimodal'
export type AIModelStatus = 'active' | 'deprecated' | 'disabled' | 'unavailable'

export interface AIProviderRow {
  id: string
  name: string
  provider_type: AIProviderType
  display_name: string
  base_url: string | null
  // The env var NAME (e.g. 'GROQ_API_KEY'), never the secret value itself.
  api_key_env_var: string
  enabled: boolean
  supports_model_discovery: boolean
  created_at: string
  updated_at: string
}

export interface AIModelRow {
  id: string
  provider_id: string
  model_id: string
  display_name: string
  model_type: AIModelType
  enabled: boolean
  is_default: boolean
  context_window: number | null
  max_output_tokens: number | null
  input_cost_per_million: number | null
  output_cost_per_million: number | null
  embedding_dimensions: number | null
  supports_structured_output: boolean
  supports_tools: boolean
  supports_reasoning: boolean
  supports_vision: boolean
  supports_embeddings: boolean
  status: AIModelStatus
  deprecation_date: string | null
  replacement_model_id: string | null
  notes: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface EvalDataset {
  id: string
  name: string
  description: string | null
  version: number
  status: EvalDatasetStatus
  knowledge_base_id: string | null
  project_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface EvalCase {
  id: string
  dataset_id: string
  question: string
  expected_answer: string | null
  expected_concepts: string[] | null
  expected_article_ids: string[] | null
  expected_chunk_ids: string[] | null
  scoring_criteria: string | null
  tags: string[] | null
  difficulty: EvalDifficulty | null
  created_at: string
  updated_at: string
}

// Absent = today's exact single-pass behavior (backward compatible with
// every stored run). graphId/graphVersionId/maxIterations/acceptanceThresholds
// are the config snapshot Milestone 4 requires so a historical graph run
// stays interpretable even after the active graph version changes later --
// see docs/CURRENT-ARCHITECTURE.md's Graph Runtime section.
export interface EvalRunExecutionConfig {
  mode: 'single_pass' | 'graph'
  graphId?: string
  graphVersionId?: string
  maxIterations?: number
  acceptanceThresholds?: {
    requiredOutcomeScore?: number
    requiredGroundingScore?: number
    requireExpectedEvidence?: boolean
  }
  // Milestone 5B -- both-or-neither, optional. Absent = today's exact
  // graph-mode behavior. Set when a run is "an Agent's evaluation suite"
  // rather than a bare graph-mode run, so graph_runs.agent_id/
  // agent_version_id get populated (see src/lib/eval/run.ts's
  // runCaseViaGraph) without any other change to how the run executes.
  agentId?: string
  agentVersionId?: string
}

export interface EvalRunConfig {
  // model is required, not optional -- a run must snapshot exactly which
  // model was tested (see the brief this shipped with: "historical eval runs
  // must continue to record the actual model tested").
  generation: { provider: AIProviderName; model: string }
  embedding: { provider: AIProviderName; model: string; dimensions?: number }
  retrieval: { evidence_source: EvidenceSource; top_k: number; threshold?: number }
  // provider/model stay optional as a pair -- evaluator.type='none' genuinely
  // has neither.
  evaluator: { type: EvaluatorType; provider?: AIProviderName; model?: string }
  execution?: EvalRunExecutionConfig
}

export interface EvalRun {
  id: string
  dataset_id: string
  dataset_version: number
  name: string | null
  status: EvalRunStatus
  config: EvalRunConfig
  is_baseline: boolean
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_by: string | null
  created_at: string
}

export interface EvalError {
  stage: string
  code: string
  message: string
  occurred_at: string
}

export interface RetrievedEvidenceItem {
  type: 'chunk' | 'wiki'
  id: string
  rank: number
  similarity: number
  title: string
  content: string
}

export interface EvaluatorDetails {
  provider: string
  model: string
  reasoning: string
  missing_concepts: string[]
  unsupported_claims: string[]
}

export interface EvalResult {
  id: string
  eval_run_id: string
  eval_case_id: string
  status: EvalResultStatus
  error: EvalError | null
  generated_answer: string | null
  retrieved_evidence: RetrievedEvidenceItem[] | null
  retrieval_hit: boolean | null
  retrieval_recall: number | null
  retrieval_mrr: number | null
  generation_score: number | null
  grounding_score: number | null
  outcome_score: number | null
  overall_score: number | null
  latency_ms: number | null
  input_tokens: number | null
  output_tokens: number | null
  estimated_cost: number | null
  evaluator_details: EvaluatorDetails | null
  failure_classification: FailureClassification | null
  human_reviewed_by: string | null
  human_reviewed_at: string | null
  human_accepted: boolean | null
  human_generation_score: number | null
  human_grounding_score: number | null
  human_outcome_score: number | null
  human_failure_classification: FailureClassification | null
  human_notes: string | null
  created_at: string
  // Null for a single-pass run. Set together -- a graph-mode result always
  // has both, a single-pass result always has neither.
  graph_run_id: string | null
  iteration_count: number | null
}

export interface EvalResultWithCase extends EvalResult {
  case: Pick<EvalCase, 'question' | 'expected_answer' | 'expected_concepts' | 'expected_article_ids' | 'expected_chunk_ids'>
}

// ============================================
// Graph Runtime (Milestone 4)
// ============================================
// graphs (stable identity) -> graph_versions (immutable config snapshot) ->
// graph_runs (one execution) -> graph_steps (one row per executed node,
// the actual trace). The executable graph wiring lives in TypeScript
// (src/lib/graph/); graph_versions.definition documents what ran, it is
// never reconstructed from jsonb at runtime. See
// docs/CURRENT-ARCHITECTURE.md's Graph Runtime section for the full model.

export type GraphType = 'rag_retry'
export type GraphStatus = 'draft' | 'active' | 'archived'

export interface Graph {
  id: string
  name: string
  slug: string
  description: string | null
  graph_type: GraphType
  status: GraphStatus
  project_id: string | null
  active_version_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// Config snapshot only -- not reconstructed into an executable graph at
// runtime. Mirrors the 5-node RAG Retry flow; a future graph_type would get
// its own definition shape.
export interface GraphVersionDefinition {
  nodes: string[]
  edges: { from: string; to: string }[]
  conditionalEdges: { from: string; condition: string; accept: string; retry: string }[]
  maxIterations: number
  acceptanceThresholds: {
    requiredOutcomeScore?: number
    requiredGroundingScore?: number
    requireExpectedEvidence?: boolean
  }
}

export interface GraphVersion {
  id: string
  graph_id: string
  version_number: number
  definition: GraphVersionDefinition
  instructions_version: string | null
  created_by: string | null
  created_at: string
  activated_at: string | null
}

export type GraphRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'terminated'

// Every graph run records why it stopped. 'unscored' (distinct from
// 'success') covers the no-judge/no-golden-evidence case -- the graph ran
// once and stopped because there was nothing to score against, which must
// never be conflated with an actual accepted evaluation in a comparison UI.
export type GraphTerminationReason =
  | 'success'
  | 'unscored'
  | 'max_iterations'
  | 'non_retryable_failure'
  | 'provider_error'
  | 'invalid_configuration'
  | 'manual_termination'

export interface GraphRun {
  id: string
  graph_id: string
  graph_version_id: string
  project_id: string | null
  eval_run_id: string | null
  eval_case_id: string | null
  // Milestone 5B -- set when this run was produced by an Agent (either a
  // live answerQuestion() call or an Agent's evaluation suite run), null
  // for a bare graph-mode run with no Agent involved. Both null/both set,
  // never one without the other.
  agent_id: string | null
  agent_version_id: string | null
  status: GraphRunStatus
  initial_input: Record<string, unknown>
  final_output: Record<string, unknown> | null
  iteration_count: number
  started_at: string | null
  completed_at: string | null
  termination_reason: GraphTerminationReason | null
  error_code: string | null
  error_message: string | null
  created_by: string | null
  created_at: string
}

export type GraphStepStatus = 'completed' | 'failed'
export type GraphNodeName = 'retrieve' | 'generate' | 'evaluate' | 'diagnose' | 'rewrite_query'

export interface GraphStep {
  id: string
  graph_run_id: string
  sequence_number: number
  node_name: GraphNodeName
  iteration: number
  input_snapshot: Record<string, unknown> | null
  output_snapshot: Record<string, unknown> | null
  transition_to: string | null
  status: GraphStepStatus
  latency_ms: number | null
  ai_operation_log_id: string | null
  error_code: string | null
  error_message: string | null
  started_at: string
  completed_at: string | null
}

// ============================================
// Agent Framework (Milestone 5A foundation slice + 5B)
// ============================================
// agent_templates (reusable, mutable defaults) -> agents (stable identity,
// optionally created from a template) -> agent_versions (immutable,
// executes THROUGH the Graph Runtime above -- graph_runs.agent_id/
// agent_version_id link an execution back to the Agent that produced it,
// there is no separate agent_runs table). See
// docs/CURRENT-ARCHITECTURE.md's Agent Framework section for the full
// model, including why no tool-calling/authorization framework exists yet.

export type AgentType = 'knowledge' | 'research' | 'evaluation' | 'engineering' | 'governance' | 'learning'
export type AgentStatus = 'draft' | 'active' | 'archived'
export type AgentTemplateStatus = 'active' | 'archived'

export interface AgentSourcePolicy {
  evidenceSource: EvidenceSource
  topK: number
  threshold?: number
}

export interface AgentGuardrails {
  noUnsupportedClaims?: boolean
  projectKnowledgeBoundary?: boolean
  maxRetries?: number
}

export interface AgentTerminationPolicy {
  maxIterations?: number
  successTerminationReasons?: GraphTerminationReason[]
}

// Reserved for future per-tool policy toggles -- see docs/CURRENT-ARCHITECTURE.md.
export type AgentToolPolicy = Record<string, unknown>

// Ordinary mutable table -- a template has no runs of its own, only Agents
// created from it do. "Template changes don't mutate existing Agent
// versions" holds because these defaults are COPIED into an agent_versions
// row at creation time (src/lib/agent/create.ts), never read live.
export interface AgentTemplate {
  id: string
  name: string
  slug: string
  description: string | null
  agent_type: AgentType
  default_graph_version_id: string
  default_purpose: string
  default_instructions: string
  default_source_policy: AgentSourcePolicy
  default_tool_policy: AgentToolPolicy
  default_guardrails: AgentGuardrails
  default_termination_policy: AgentTerminationPolicy
  default_generation_provider_id: string | null
  default_generation_model_id: string | null
  default_embedding_provider_id: string | null
  default_embedding_model_id: string | null
  default_evaluator_provider_id: string | null
  default_evaluator_model_id: string | null
  status: AgentTemplateStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  name: string
  slug: string
  description: string | null
  agent_type: AgentType
  template_id: string | null
  project_id: string | null
  active_version_id: string | null
  status: AgentStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

// No AgentVersionUpdate -- agent_versions is insert-only (see the migration
// comment: no UPDATE RLS policy exists at all, same immutability mechanism
// as graph_versions/wiki_versions).
export interface AgentVersion {
  id: string
  agent_id: string
  version_number: number
  purpose: string
  instructions: string
  graph_version_id: string
  generation_provider_id: string
  generation_model_id: string
  embedding_provider_id: string
  embedding_model_id: string
  evaluator_provider_id: string | null
  evaluator_model_id: string | null
  source_policy: AgentSourcePolicy
  tool_policy: AgentToolPolicy
  guardrails: AgentGuardrails
  termination_policy: AgentTerminationPolicy
  metadata: Record<string, unknown>
  created_by: string | null
  created_at: string
  activated_at: string | null
}

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>

export type DocumentInsert = Omit<
  Document,
  'id' | 'upload_date' | 'created_at' | 'updated_at' | 'approved_chunks' | 'rejected_chunks'
> &
  Partial<Pick<Document, 'approved_chunks' | 'rejected_chunks'>>
export type DocumentUpdate = Partial<Omit<Document, 'id' | 'upload_date' | 'created_at'>>

export type ChunkInsert = Omit<DocumentChunk, 'id' | 'created_at'>
export type ChunkUpdate = Partial<Omit<DocumentChunk, 'id' | 'document_id' | 'chunk_index' | 'created_at'>>

export type KBVectorInsert = Omit<KBVector, 'id' | 'approved_date' | 'last_updated'>
export type KBVectorUpdate = Partial<Omit<KBVector, 'id' | 'chunk_id' | 'document_id' | 'approved_date'>>

export type WikiArticleInsert = Omit<WikiArticle, 'id' | 'created_at' | 'updated_at' | 'current_version_id' | 'is_public'> &
  Partial<Pick<WikiArticle, 'current_version_id' | 'is_public'>>
export type WikiArticleUpdate = Partial<Omit<WikiArticle, 'id' | 'created_at'>>

export type WikiVersionInsert = Omit<WikiVersion, 'id' | 'created_at' | 'promoted_from_trending_item_id'> &
  Partial<Pick<WikiVersion, 'promoted_from_trending_item_id'>>
export type WikiVersionUpdate = Partial<Pick<WikiVersion, 'approved_by' | 'approved_at'>>

export type WikiSourceInsert = Omit<WikiSource, 'id' | 'created_at'>

export type WikiRelationInsert = Omit<WikiRelation, 'id' | 'created_at'>

export type WikiVectorInsert = Omit<WikiVector, 'id' | 'created_at'>

export type EvalDatasetInsert = Omit<EvalDataset, 'id' | 'created_at' | 'updated_at'>
export type EvalDatasetUpdate = Partial<Omit<EvalDataset, 'id' | 'created_at'>>

export type EvalCaseInsert = Omit<EvalCase, 'id' | 'created_at' | 'updated_at'>
export type EvalCaseUpdate = Partial<Omit<EvalCase, 'id' | 'dataset_id' | 'created_at'>>

export type EvalRunInsert = Omit<EvalRun, 'id' | 'created_at'>
export type EvalRunUpdate = Partial<Omit<EvalRun, 'id' | 'dataset_id' | 'created_at'>>

export type EvalResultInsert = Omit<EvalResult, 'id' | 'created_at'>
export type EvalResultUpdate = Partial<Omit<EvalResult, 'id' | 'eval_run_id' | 'eval_case_id' | 'created_at'>>

// visibility/public_slug/public_profile/published_at/published_by are all
// optional at insert time -- a plain project creation never touches
// publication state, only publishProjectAction does.
export type ProjectInsert = Omit<
  Project,
  'id' | 'created_at' | 'updated_at' | 'visibility' | 'public_slug' | 'public_profile' | 'published_at' | 'published_by'
> &
  Partial<Pick<Project, 'visibility' | 'public_slug' | 'public_profile' | 'published_at' | 'published_by'>>
export type ProjectUpdate = Partial<Omit<Project, 'id' | 'created_at'>>

export type ProjectMemberInsert = Omit<ProjectMember, 'id' | 'created_at' | 'updated_at'>
export type ProjectMemberUpdate = Partial<Omit<ProjectMember, 'id' | 'project_id' | 'user_id' | 'created_at'>>

export type ProjectWorkstreamInsert = Omit<ProjectWorkstream, 'id' | 'created_at' | 'updated_at'>
export type ProjectWorkstreamUpdate = Partial<Omit<ProjectWorkstream, 'id' | 'project_id' | 'created_at'>>

// No WorkstreamArtifactUpdate -- insert-only, no update/delete RLS policy
// (see the migration comment: an immutable evidence trail).
export type WorkstreamArtifactInsert = Omit<WorkstreamArtifact, 'id' | 'created_at'>

export type AIProviderInsert = Omit<AIProviderRow, 'id' | 'created_at' | 'updated_at'>
export type AIProviderUpdate = Partial<Omit<AIProviderRow, 'id' | 'created_at'>>

export type AIModelInsert = Omit<AIModelRow, 'id' | 'created_at' | 'updated_at'>
export type AIModelUpdate = Partial<Omit<AIModelRow, 'id' | 'provider_id' | 'created_at'>>

// active_version_id is optional at insert time -- a graph is created before
// its first version exists, then activated via a separate UPDATE.
export type GraphInsert = Omit<Graph, 'id' | 'created_at' | 'updated_at' | 'active_version_id'> &
  Partial<Pick<Graph, 'active_version_id'>>
export type GraphUpdate = Partial<Omit<Graph, 'id' | 'created_at'>>

// No GraphVersionUpdate -- graph_versions is insert-only (see the migration
// comment: no UPDATE RLS policy exists at all, same immutability mechanism
// as wiki_versions).
export type GraphVersionInsert = Omit<GraphVersion, 'id' | 'created_at'>

export type GraphRunInsert = Omit<GraphRun, 'id' | 'created_at'>
export type GraphRunUpdate = Partial<Omit<GraphRun, 'id' | 'graph_id' | 'graph_version_id' | 'created_at'>>

export type GraphStepInsert = Omit<GraphStep, 'id'>
export type GraphStepUpdate = Partial<Omit<GraphStep, 'id' | 'graph_run_id' | 'started_at'>>

// agent_templates is an ordinary mutable table (see the interface comment
// above) -- both Insert and Update exist, unlike agent_versions below.
export type AgentTemplateInsert = Omit<AgentTemplate, 'id' | 'created_at' | 'updated_at'>
export type AgentTemplateUpdate = Partial<Omit<AgentTemplate, 'id' | 'created_at'>>

// active_version_id is optional at insert time -- an agent is created
// before its first version exists, then activated via a separate UPDATE,
// same convention as GraphInsert.
export type AgentInsert = Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'active_version_id'> &
  Partial<Pick<Agent, 'active_version_id'>>
export type AgentUpdate = Partial<Omit<Agent, 'id' | 'created_at'>>

// No AgentVersionUpdate -- agent_versions is insert-only (see the migration
// comment: no UPDATE RLS policy exists at all, same immutability mechanism
// as graph_versions/wiki_versions).
export type AgentVersionInsert = Omit<AgentVersion, 'id' | 'created_at'>

// @supabase/postgrest-js requires every table to carry a `Relationships`
// array and the schema to declare `Views`, even when empty -- omitting them
// doesn't error, it silently collapses every Row/Insert/Update type to
// `never` throughout the app, which is exactly what happened here once.
export interface Database {
  __InternalSupabase: {
    PostgrestVersion: '12'
  }
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: ProfileInsert; Update: ProfileUpdate; Relationships: [] }
      knowledge_bases: {
        Row: KnowledgeBase
        Insert: Omit<KnowledgeBase, 'created_at' | 'updated_at'>
        Update: Partial<KnowledgeBase>
        Relationships: []
      }
      curation_queue: {
        Row: CurationQueueItem
        Insert: Omit<CurationQueueItem, 'id' | 'created_at'>
        Update: Partial<CurationQueueItem>
        Relationships: []
      }
      documents: { Row: Document; Insert: DocumentInsert; Update: DocumentUpdate; Relationships: [] }
      document_chunks: { Row: DocumentChunk; Insert: ChunkInsert; Update: ChunkUpdate; Relationships: [] }
      kb_vectors: { Row: KBVector; Insert: KBVectorInsert; Update: KBVectorUpdate; Relationships: [] }
      settings: { Row: Setting; Insert: Setting; Update: Partial<Setting>; Relationships: [] }
      ai_operation_logs: {
        Row: AIOperationLog
        Insert: Omit<AIOperationLog, 'id' | 'created_at'>
        Update: Partial<AIOperationLog>
        Relationships: []
      }
      wiki_categories: {
        Row: WikiCategory
        Insert: Omit<WikiCategory, 'created_at'>
        Update: Partial<WikiCategory>
        Relationships: []
      }
      wiki_articles: { Row: WikiArticle; Insert: WikiArticleInsert; Update: WikiArticleUpdate; Relationships: [] }
      wiki_versions: { Row: WikiVersion; Insert: WikiVersionInsert; Update: WikiVersionUpdate; Relationships: [] }
      wiki_sources: { Row: WikiSource; Insert: WikiSourceInsert; Update: Partial<WikiSource>; Relationships: [] }
      wiki_relations: {
        Row: WikiRelation
        Insert: WikiRelationInsert
        Update: Partial<WikiRelation>
        Relationships: []
      }
      wiki_vectors: { Row: WikiVector; Insert: WikiVectorInsert; Update: Partial<WikiVector>; Relationships: [] }
      trending_items: { Row: TrendingItem; Insert: TrendingItemInsert; Update: TrendingItemUpdate; Relationships: [] }
      trending_comments: { Row: TrendingComment; Insert: TrendingCommentInsert; Update: Partial<TrendingComment>; Relationships: [] }
      trending_wiki_links: { Row: TrendingWikiLink; Insert: TrendingWikiLinkInsert; Update: Partial<TrendingWikiLink>; Relationships: [] }
      project_notes: { Row: ProjectNote; Insert: ProjectNoteInsert; Update: ProjectNoteUpdate; Relationships: [] }
      project_note_replies: { Row: ProjectNoteReply; Insert: ProjectNoteReplyInsert; Update: Partial<ProjectNoteReply>; Relationships: [] }
      eval_datasets: { Row: EvalDataset; Insert: EvalDatasetInsert; Update: EvalDatasetUpdate; Relationships: [] }
      eval_cases: { Row: EvalCase; Insert: EvalCaseInsert; Update: EvalCaseUpdate; Relationships: [] }
      eval_runs: { Row: EvalRun; Insert: EvalRunInsert; Update: EvalRunUpdate; Relationships: [] }
      eval_results: { Row: EvalResult; Insert: EvalResultInsert; Update: EvalResultUpdate; Relationships: [] }
      projects: { Row: Project; Insert: ProjectInsert; Update: ProjectUpdate; Relationships: [] }
      project_members: { Row: ProjectMember; Insert: ProjectMemberInsert; Update: ProjectMemberUpdate; Relationships: [] }
      project_workstreams: { Row: ProjectWorkstream; Insert: ProjectWorkstreamInsert; Update: ProjectWorkstreamUpdate; Relationships: [] }
      workstream_artifacts: { Row: WorkstreamArtifact; Insert: WorkstreamArtifactInsert; Update: never; Relationships: [] }
      ai_providers: { Row: AIProviderRow; Insert: AIProviderInsert; Update: AIProviderUpdate; Relationships: [] }
      ai_models: { Row: AIModelRow; Insert: AIModelInsert; Update: AIModelUpdate; Relationships: [] }
      graphs: { Row: Graph; Insert: GraphInsert; Update: GraphUpdate; Relationships: [] }
      graph_versions: { Row: GraphVersion; Insert: GraphVersionInsert; Update: never; Relationships: [] }
      graph_runs: { Row: GraphRun; Insert: GraphRunInsert; Update: GraphRunUpdate; Relationships: [] }
      agent_templates: { Row: AgentTemplate; Insert: AgentTemplateInsert; Update: AgentTemplateUpdate; Relationships: [] }
      agents: { Row: Agent; Insert: AgentInsert; Update: AgentUpdate; Relationships: [] }
      agent_versions: { Row: AgentVersion; Insert: AgentVersionInsert; Update: never; Relationships: [] }
      graph_steps: { Row: GraphStep; Insert: GraphStepInsert; Update: GraphStepUpdate; Relationships: [] }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_curator_or_admin: { Args: { uid: string }; Returns: boolean }
      increment_approved_chunks: { Args: { doc_id: string }; Returns: void }
      increment_rejected_chunks: { Args: { doc_id: string }; Returns: void }
      match_documents: {
        Args: {
          query_embedding: number[]
          match_threshold?: number
          match_count?: number
          filter_doc_type?: string
          filter_use_cases?: string[]
        }
        Returns: { id: string; chunk_id: string; content: string; similarity: number; metadata: Record<string, unknown> }[]
      }
      match_wiki_vectors: {
        Args: {
          query_embedding: number[]
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          wiki_version_id: string
          wiki_article_id: string
          content: string
          similarity: number
          article_slug: string
          article_title: string
        }[]
      }
    }
  }
}
