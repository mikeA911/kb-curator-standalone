// Mirrors supabase/migrations/*.sql. Keep in sync by hand until this project
// generates types via `supabase gen types` against the live project.

export type UserRole = 'anonymous' | 'consultant' | 'curator' | 'admin'
export type DocType = string
export type KnowledgeBaseClassification = 'platform' | 'legacy_sample' | 'project' | 'partner_pilot'
export type KnowledgeBaseLifecycleStatus = 'active' | 'reference' | 'archived'

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
  classification: KnowledgeBaseClassification
  lifecycle_status: KnowledgeBaseLifecycleStatus
  origin: string | null
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
  // Versioned Knowledge Source Documents, Stage 1 (docs/dev-request-versioned-
  // knowledge-source-documents.md): documents is the immutable version table.
  // knowledge_source_id is required -- every document belongs to exactly one
  // logical source.
  knowledge_source_id: string
  version_number: number
  change_note: string | null
  superseded_at: string | null
  retired_at: string | null
  created_at: string
  updated_at: string
}

export type KnowledgeSourceLifecycleStatus = 'active' | 'retired'

// The stable logical-source identity a document's versions belong to --
// mirrors wiki_articles/wiki_versions' current_version_id pattern exactly,
// applied to source documents instead of Wiki content.
export interface KnowledgeSource {
  id: string
  knowledge_base_id: string
  title: string
  source_url: string | null
  publisher: string | null
  current_version_id: string | null
  lifecycle_status: KnowledgeSourceLifecycleStatus
  created_by: string | null
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
  // The already-computed classification (rate_limit / quota_exceeded /
  // model_unavailable / authentication / invalid_request / unknown -- see
  // classifyProviderError in src/lib/ai/provider.ts), stored alongside the
  // free-text error_message so a failure category can be queried directly.
  error_code: string | null
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
  | 'platform_handbook'

export type WikiArticleStatus = 'draft' | 'review' | 'approved' | 'archived'
export type WikiVerificationStatus = 'unverified' | 'verified' | 'needs_review'
export type WikiGeneratedBy = 'human' | 'ai_assisted'
export type WikiSourceType = 'document' | 'chunk' | 'external' | 'workstream_artifact'
// Project-Aware Knowledge and Assistant Context, Stage 1 (docs/dev-request-
// project-aware-knowledge-and-assistant-context.md). Visibility and
// approval are separate dimensions -- an approved article can still be
// project_private. 'organization' is deliberately not offered: this schema
// has no organizations/tenant table to enforce that boundary against yet.
export type WikiVisibilityScope = 'project_private' | 'selected_projects' | 'platform' | 'public'

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
  // Separate again from both status and is_public -- see WikiVisibilityScope.
  // Defaults to 'platform', matching every article's behavior before this
  // column existed.
  visibility_scope: WikiVisibilityScope
  created_by: string | null
  created_at: string
  updated_at: string
}

// A project association -- the allow-list for project_private/
// selected_projects articles, and also how a platform-visibility article
// gets explicitly associated with a project's Knowledge display without
// copying it.
export interface ProjectWikiArticle {
  id: string
  project_id: string
  wiki_article_id: string
  relationship: string | null
  attached_by: string | null
  attached_at: string
}

// Many-to-many: the same knowledge base may serve more than one authorized
// project (e.g. a shared Zadara/Sandz KB across two client engagements).
// Supersedes knowledge_bases.project_id, which is one-to-one and left in
// place but no longer read or written by Stage 1 code.
export interface ProjectKnowledgeBase {
  id: string
  project_id: string
  knowledge_base_id: string
  purpose: string | null
  attached_by: string | null
  attached_at: string
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
  workstream_artifact_id: string | null
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
  // Dashboard Shared Links moderation audit trail -- stamped by
  // removeSharedLinkAction, the admin-only path (stricter than the existing
  // curator-or-admin RLS, enforced in application code -- see the migration
  // comment in 20260821100001_shared_links_moderation.sql).
  archived_by: string | null
  archived_at: string | null
  moderation_reason: string | null
  // Computed by normalizeUrlForDuplicateDetection (src/lib/trending/url-safety.ts)
  // at submission time -- never the displayed/stored URL itself.
  normalized_source_url: string | null
  created_at: string
  updated_at: string
}

export type TrendingItemInsert = Omit<
  TrendingItem,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'status'
  | 'is_public'
  | 'published_at'
  | 'visibility'
  | 'tags'
  | 'archived_by'
  | 'archived_at'
  | 'moderation_reason'
  | 'normalized_source_url'
> &
  Partial<
    Pick<
      TrendingItem,
      'status' | 'is_public' | 'published_at' | 'visibility' | 'tags' | 'archived_by' | 'archived_at' | 'moderation_reason' | 'normalized_source_url'
    >
  >
export type TrendingItemUpdate = Partial<Omit<TrendingItem, 'id' | 'created_at'>>

// ============================================
// Public Blog
// ============================================
// Modeled on the Projects/Examples "just publish" pattern (visibility/
// published_at, one Publish/Unpublish toggle) rather than Wiki's
// draft/review/approved lifecycle -- see src/app/actions/projects.ts.

export type BlogPostStatus = 'draft' | 'published'

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string
  status: BlogPostStatus
  author_id: string | null
  last_editor_id: string | null
  submitted_for_review_at: string | null
  submitted_by: string | null
  published_by: string | null
  source_reference: string | null
  cover_image_path: string | null
  cover_image_alt: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export type BlogPostInsert = Omit<BlogPost, 'id' | 'created_at' | 'updated_at' | 'status' | 'published_at'> &
  Partial<Pick<BlogPost, 'status' | 'published_at'>>
export type BlogPostUpdate = Partial<Omit<BlogPost, 'id' | 'created_at'>>

export interface BlogRelation {
  id: string
  from_post_id: string
  to_post_id: string
  relation_type: string
  created_at: string
}
export type BlogRelationInsert = Omit<BlogRelation, 'id' | 'created_at' | 'relation_type'> & Partial<Pick<BlogRelation, 'relation_type'>>

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
  // Shared method/approach, common to every workstream in this project --
  // e.g. "the same 4-phase discovery method, run by two different AI
  // tools." A workstream's own page links back here rather than repeating
  // it (see project_workstreams.goal, still per-workstream for cases where
  // it genuinely differs, but no longer the primary display).
  goal: string | null
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
  // Stricter, admin-only opt-in layered on top of visibility='public' --
  // exposes real workstreams/artifacts/assessment responses to anonymous
  // visitors, not just the curated public_profile summary. See
  // setPublicFullDetailAction and 20260817120001_public_full_detail.sql.
  public_full_detail: boolean
  // Provenance -- who/what created this row. 'ui' is the default (and the
  // only value possible before M6D); 'assistant' is stamped by the chat
  // tool-calling loop (src/lib/chat/loop.ts) as a follow-up update after
  // create_project succeeds, never by the service layer itself.
  created_via: string
  assistant_prompt_version: string | null
  assistant_conversation_id: string | null
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

export type BusinessFunction =
  | 'business_development_sales'
  | 'finance_pricing'
  | 'legal_commercial'
  | 'customer_support'
  | 'delivery_consulting'
  | 'architecture_engineering'
  | 'security_compliance'
  | 'customer_representative'
  | 'project_governance'
  | 'other'

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: ProjectRole
  status: ProjectMemberStatus
  // Project Approval Authorities, Stage 1 (docs/dev-request-project-approval-
  // authorities.md): why a member participates -- routes approval work, does
  // not by itself grant approval authority. Separate from ProjectRole.
  business_function: BusinessFunction | null
  function_notes: string | null
  created_at: string
  updated_at: string
}

// Bounded catalogue per the dev request -- extensible via migration later,
// not via an admin UI in Stage 1.
export type ApprovalType =
  | 'technical'
  | 'pricing'
  | 'commercial'
  | 'security_compliance'
  | 'support_commitment'
  | 'proposal_release'
  | 'customer_acceptance'
  | 'knowledge_publication'
  | 'production_change'

export type ApprovalRequirementStatus = 'required' | 'optional' | 'not_applicable'
export type ApprovalMode = 'any_authorized' | 'all_assigned'
export type ApprovalVisibilityScope = 'internal' | 'customer_visible'
export type AuthorityStatus = 'active' | 'revoked'

// A policy says WHAT approval a project needs; an authority assignment
// (below) says WHO may make that specific decision. Stage 1 only builds
// this planning shell -- no project_approval_requests/decisions yet.
export interface ProjectApprovalPolicy {
  id: string
  project_id: string
  approval_type: ApprovalType
  requirement_status: ApprovalRequirementStatus
  sequence: number | null
  minimum_approvals: number
  approval_mode: ApprovalMode
  allow_self_approval: boolean
  monetary_trigger: number | null
  discount_trigger_percent: number | null
  visibility_scope: ApprovalVisibilityScope
  required_before_release: boolean
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ProjectAuthorityAssignment {
  id: string
  project_id: string
  user_id: string
  business_function: BusinessFunction | null
  approval_type: ApprovalType
  monetary_limit: number | null
  discount_limit_percent: number | null
  conditions: string | null
  effective_from: string
  expires_at: string | null
  status: AuthorityStatus
  allow_self_approval: boolean
  granted_by: string | null
  granted_at: string
  revoked_by: string | null
  revoked_at: string | null
  revocation_reason: string | null
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
  created_via: string
  assistant_prompt_version: string | null
  assistant_conversation_id: string | null
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
  | 'design_note'
  | 'implementation_handoff'
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
  created_via: string
  assistant_prompt_version: string | null
  assistant_conversation_id: string | null
  created_at: string
}

// ============================================
// Chat / Conversational Workbench Assistant (M6D)
// ============================================

// The doc's own list of summary fields (dev-request-assistant-first-use-onboarding-and-history.md):
// objective, confirmed requirements, decisions, open questions, records
// created, evidence referenced, and the likely next action.
export interface ConversationSummary {
  objective: string
  confirmedRequirements: string[]
  decisions: string[]
  openQuestions: string[]
  createdRecords: string[]
  referencedEvidence: string[]
  nextAction: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
  // Bumped by a trigger on every chat_messages insert (see
  // 20260820130001_chat_history_and_summary.sql) -- lets conversation
  // history be listed/resumed by recency without joining chat_messages.
  last_message_at: string | null
  // Rolling per-conversation summary (Stage 2) -- see maybeRefreshSummary in
  // src/lib/chat/summary.ts. summary_through_message_id is set null, not
  // cascaded, if that message is ever deleted.
  summary_json: ConversationSummary | null
  summary_through_message_id: string | null
  summary_updated_at: string | null
  summary_provider: string | null
  summary_model: string | null
  summary_version: string | null
  // Project-Aware Knowledge and Assistant Context, Stage 2. Null means
  // general/unbound. Immutable once set (20260824190001_conversations_project_binding.sql's
  // trigger) -- "changing project context" means starting a new conversation.
  project_id: string | null
  // Set at turn start, cleared when the turn resolves either way -- survives
  // a page refresh, unlike in-memory isPending state. See runAssistantTurn
  // and ChatPanel's mount-time recovery check.
  pending_turn_started_at: string | null
}

export type ConversationInsert = Omit<
  Conversation,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'title'
  | 'last_message_at'
  | 'summary_json'
  | 'summary_through_message_id'
  | 'summary_updated_at'
  | 'summary_provider'
  | 'summary_model'
  | 'summary_version'
  | 'project_id'
  | 'pending_turn_started_at'
> &
  Partial<
    Pick<
      Conversation,
      | 'title'
      | 'last_message_at'
      | 'summary_json'
      | 'summary_through_message_id'
      | 'summary_updated_at'
      | 'summary_provider'
      | 'summary_model'
      | 'summary_version'
      | 'project_id'
      | 'pending_turn_started_at'
    >
  >
export type ConversationUpdate = Partial<Omit<Conversation, 'id' | 'user_id' | 'created_at'>>

export type ChatMessageRole = 'user' | 'assistant' | 'tool'

export interface ChatMessageRow {
  id: string
  conversation_id: string
  user_id: string
  role: ChatMessageRole
  content: string | null
  // Present on an assistant message that requested one or more tool calls.
  tool_calls: { id: string; name: string; arguments: Record<string, unknown> }[] | null
  // Present on a 'tool' role message: which call this is the result of.
  tool_call_id: string | null
  tool_name: string | null
  // M6E: plain-text provenance snapshot (raw provider name / model_id),
  // set only on assistant-role rows -- same convention as
  // wiki_versions.ai_provider/.ai_model, deliberately not an FK so
  // historical rows stay accurate if the model is later renamed/disabled.
  provider: string | null
  model: string | null
  // The structured response envelope (docs/dev-request-structured-assistant-
  // responses-and-artifacts-panel.md), set only on the final assistant-role
  // row of a turn. Kept loosely typed here (like tool_calls above) rather
  // than importing src/lib/chat/response-envelope.ts's PersistedAssistantEnvelope
  // shape -- the stored references (target kind/id, artifactId, sourceId)
  // are re-resolved against the current user's access on every read (see
  // conversations.ts's toDisplayMessages), so this column is never trusted
  // as pre-resolved routes, and a future schema-version change must fall
  // back gracefully rather than being assumed to match today's shape.
  response_payload: Record<string, unknown> | null
  created_at: string
}

export type ChatMessageInsert = Omit<
  ChatMessageRow,
  'id' | 'created_at' | 'tool_calls' | 'tool_call_id' | 'tool_name' | 'content' | 'provider' | 'model' | 'response_payload'
> &
  Partial<Pick<ChatMessageRow, 'tool_calls' | 'tool_call_id' | 'tool_name' | 'content' | 'provider' | 'model' | 'response_payload'>>

// ============================================
// Workstream System Understanding Assessment
// ============================================

// A curator-authored, versioned set of standardized questions every
// "participant" (an external AI tool/method) answers after independently
// examining a system -- testing whether they understood it, not just
// whether they produced plausible artifacts. Deliberately reusable, not
// specific to OpenAPI/CareCall. See docs/ design note for the full model.
export interface SystemAssessment {
  id: string
  project_id: string
  // Soft/optional link to the originating workstream -- not used for
  // access control. An assessment spans every workstream/participant in
  // the project (Claude Code and ChatGPT/Codex are separate *workstreams*
  // in this app, but the same assessment).
  workstream_id: string | null
  name: string
  description: string | null
  current_version_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
export type SystemAssessmentInsert = Omit<SystemAssessment, 'id' | 'created_at' | 'updated_at' | 'current_version_id'> &
  Partial<Pick<SystemAssessment, 'current_version_id'>>
export type SystemAssessmentUpdate = Partial<Omit<SystemAssessment, 'id' | 'created_at' | 'project_id'>>

// "Immutable once active" (no silent edits after a version has responses)
// is enforced in the action layer, not by a status-derived RLS/trigger
// rule -- see the migration's RLS section comment.
export type SystemAssessmentVersionStatus = 'draft' | 'active' | 'retired'

export interface SystemAssessmentVersion {
  id: string
  assessment_id: string
  project_id: string
  version_number: number
  // How a participant should answer -- versioned alongside the questions
  // so a response can always be traced to exactly what was asked and how.
  instructions: string
  status: SystemAssessmentVersionStatus
  created_by: string | null
  created_at: string
}
export type SystemAssessmentVersionInsert = Omit<SystemAssessmentVersion, 'id' | 'created_at' | 'status'> &
  Partial<Pick<SystemAssessmentVersion, 'status'>>

export interface SystemAssessmentQuestion {
  id: string
  assessment_version_id: string
  project_id: string
  sequence: number
  title: string
  question: string
  category: string | null
  guidance: string | null
}
export type SystemAssessmentQuestionInsert = Omit<SystemAssessmentQuestion, 'id'>

export type AssessmentResponseStatus = 'in_progress' | 'completed'

// A response belongs to a participant/method, not to a workstream --
// participant_label is descriptive metadata (e.g. "Claude Code"), not a
// workstream FK. See the migration comment for why.
export interface AssessmentResponse {
  id: string
  assessment_version_id: string
  project_id: string
  participant_label: string
  external_tool: string | null
  model: string | null
  repository_ref: string | null
  status: AssessmentResponseStatus
  created_by: string | null
  created_at: string
  updated_at: string
}
export type AssessmentResponseInsert = Omit<
  AssessmentResponse,
  'id' | 'created_at' | 'updated_at' | 'status' | 'external_tool' | 'model' | 'repository_ref'
> &
  Partial<Pick<AssessmentResponse, 'status' | 'external_tool' | 'model' | 'repository_ref'>>
export type AssessmentResponseUpdate = Partial<Omit<AssessmentResponse, 'id' | 'created_at' | 'project_id' | 'assessment_version_id'>>

export type AnswerClassification = 'CONFIRMED' | 'INFERRED' | 'UNKNOWN'

// One row per question per response -- not one giant Markdown blob -- so
// individual questions stay independently reviewable/scoreable later.
// Evidence stays inline free text in this pass, not a normalized table.
export interface AssessmentAnswer {
  id: string
  response_id: string
  question_id: string
  project_id: string
  answer: string
  classification: AnswerClassification | null
  evidence: string | null
  created_at: string
  updated_at: string
}
export type AssessmentAnswerInsert = Omit<AssessmentAnswer, 'id' | 'created_at' | 'updated_at' | 'classification' | 'evidence'> &
  Partial<Pick<AssessmentAnswer, 'classification' | 'evidence'>>
export type AssessmentAnswerUpdate = Partial<Pick<AssessmentAnswer, 'answer' | 'classification' | 'evidence'>>

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
  // Independent of is_default -- see 20260818090001_ai_models_structured_output_default.sql.
  // Only meaningful (and only settable) when supports_structured_output is true.
  is_default_structured_output: boolean
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

export type KnowledgeSourceInsert = Omit<KnowledgeSource, 'id' | 'created_at' | 'updated_at' | 'current_version_id'> &
  Partial<Pick<KnowledgeSource, 'current_version_id'>>
export type KnowledgeSourceUpdate = Partial<Omit<KnowledgeSource, 'id' | 'created_at'>>

export type ChunkInsert = Omit<DocumentChunk, 'id' | 'created_at'>
export type ChunkUpdate = Partial<Omit<DocumentChunk, 'id' | 'document_id' | 'chunk_index' | 'created_at'>>

export type KBVectorInsert = Omit<KBVector, 'id' | 'approved_date' | 'last_updated'>
export type KBVectorUpdate = Partial<Omit<KBVector, 'id' | 'chunk_id' | 'document_id' | 'approved_date'>>

export type WikiArticleInsert = Omit<
  WikiArticle,
  'id' | 'created_at' | 'updated_at' | 'current_version_id' | 'is_public' | 'visibility_scope'
> &
  Partial<Pick<WikiArticle, 'current_version_id' | 'is_public' | 'visibility_scope'>>
export type WikiArticleUpdate = Partial<Omit<WikiArticle, 'id' | 'created_at'>>

export type ProjectWikiArticleInsert = Omit<ProjectWikiArticle, 'id' | 'attached_at'> & Partial<Pick<ProjectWikiArticle, 'attached_at'>>
export type ProjectWikiArticleUpdate = Partial<Omit<ProjectWikiArticle, 'id' | 'project_id' | 'wiki_article_id'>>

export type ProjectKnowledgeBaseInsert = Omit<ProjectKnowledgeBase, 'id' | 'attached_at'> &
  Partial<Pick<ProjectKnowledgeBase, 'attached_at'>>
export type ProjectKnowledgeBaseUpdate = Partial<Omit<ProjectKnowledgeBase, 'id' | 'project_id' | 'knowledge_base_id'>>

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
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'visibility'
  | 'public_slug'
  | 'public_profile'
  | 'published_at'
  | 'published_by'
  | 'goal'
  | 'public_full_detail'
  | 'created_via'
  | 'assistant_prompt_version'
  | 'assistant_conversation_id'
> &
  Partial<
    Pick<
      Project,
      | 'visibility'
      | 'public_slug'
      | 'public_profile'
      | 'published_at'
      | 'published_by'
      | 'goal'
      | 'public_full_detail'
      | 'created_via'
      | 'assistant_prompt_version'
      | 'assistant_conversation_id'
    >
  >
export type ProjectUpdate = Partial<Omit<Project, 'id' | 'created_at'>>

export type ProjectMemberInsert = Omit<
  ProjectMember,
  'id' | 'created_at' | 'updated_at' | 'business_function' | 'function_notes'
> &
  Partial<Pick<ProjectMember, 'business_function' | 'function_notes'>>
export type ProjectMemberUpdate = Partial<Omit<ProjectMember, 'id' | 'project_id' | 'user_id' | 'created_at'>>

export type ProjectApprovalPolicyInsert = Omit<ProjectApprovalPolicy, 'id' | 'created_at' | 'updated_at'>
export type ProjectApprovalPolicyUpdate = Partial<Omit<ProjectApprovalPolicy, 'id' | 'project_id' | 'created_at'>>

export type ProjectAuthorityAssignmentInsert = Omit<ProjectAuthorityAssignment, 'id' | 'created_at' | 'updated_at'>
export type ProjectAuthorityAssignmentUpdate = Partial<Omit<ProjectAuthorityAssignment, 'id' | 'project_id' | 'created_at'>>

export type ProjectWorkstreamInsert = Omit<
  ProjectWorkstream,
  'id' | 'created_at' | 'updated_at' | 'created_via' | 'assistant_prompt_version' | 'assistant_conversation_id'
> &
  Partial<Pick<ProjectWorkstream, 'created_via' | 'assistant_prompt_version' | 'assistant_conversation_id'>>
export type ProjectWorkstreamUpdate = Partial<Omit<ProjectWorkstream, 'id' | 'project_id' | 'created_at'>>

// No WorkstreamArtifactUpdate -- insert-only, no update/delete RLS policy
// (see the migration comment: an immutable evidence trail).
export type WorkstreamArtifactInsert = Omit<
  WorkstreamArtifact,
  'id' | 'created_at' | 'created_via' | 'assistant_prompt_version' | 'assistant_conversation_id'
> &
  Partial<Pick<WorkstreamArtifact, 'created_via' | 'assistant_prompt_version' | 'assistant_conversation_id'>>

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
      knowledge_sources: {
        Row: KnowledgeSource
        Insert: KnowledgeSourceInsert
        Update: KnowledgeSourceUpdate
        Relationships: []
      }
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
      project_wiki_articles: {
        Row: ProjectWikiArticle
        Insert: ProjectWikiArticleInsert
        Update: ProjectWikiArticleUpdate
        Relationships: []
      }
      project_knowledge_bases: {
        Row: ProjectKnowledgeBase
        Insert: ProjectKnowledgeBaseInsert
        Update: ProjectKnowledgeBaseUpdate
        Relationships: []
      }
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
      blog_posts: { Row: BlogPost; Insert: BlogPostInsert; Update: BlogPostUpdate; Relationships: [] }
      blog_relations: { Row: BlogRelation; Insert: BlogRelationInsert; Update: Partial<BlogRelation>; Relationships: [] }
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
      project_approval_policies: {
        Row: ProjectApprovalPolicy
        Insert: ProjectApprovalPolicyInsert
        Update: ProjectApprovalPolicyUpdate
        Relationships: []
      }
      project_authority_assignments: {
        Row: ProjectAuthorityAssignment
        Insert: ProjectAuthorityAssignmentInsert
        Update: ProjectAuthorityAssignmentUpdate
        Relationships: []
      }
      project_workstreams: { Row: ProjectWorkstream; Insert: ProjectWorkstreamInsert; Update: ProjectWorkstreamUpdate; Relationships: [] }
      workstream_artifacts: { Row: WorkstreamArtifact; Insert: WorkstreamArtifactInsert; Update: never; Relationships: [] }
      system_assessments: { Row: SystemAssessment; Insert: SystemAssessmentInsert; Update: SystemAssessmentUpdate; Relationships: [] }
      system_assessment_versions: { Row: SystemAssessmentVersion; Insert: SystemAssessmentVersionInsert; Update: Partial<SystemAssessmentVersion>; Relationships: [] }
      system_assessment_questions: { Row: SystemAssessmentQuestion; Insert: SystemAssessmentQuestionInsert; Update: Partial<SystemAssessmentQuestion>; Relationships: [] }
      assessment_responses: { Row: AssessmentResponse; Insert: AssessmentResponseInsert; Update: AssessmentResponseUpdate; Relationships: [] }
      assessment_answers: { Row: AssessmentAnswer; Insert: AssessmentAnswerInsert; Update: AssessmentAnswerUpdate; Relationships: [] }
      ai_providers: { Row: AIProviderRow; Insert: AIProviderInsert; Update: AIProviderUpdate; Relationships: [] }
      ai_models: { Row: AIModelRow; Insert: AIModelInsert; Update: AIModelUpdate; Relationships: [] }
      graphs: { Row: Graph; Insert: GraphInsert; Update: GraphUpdate; Relationships: [] }
      graph_versions: { Row: GraphVersion; Insert: GraphVersionInsert; Update: never; Relationships: [] }
      graph_runs: { Row: GraphRun; Insert: GraphRunInsert; Update: GraphRunUpdate; Relationships: [] }
      agent_templates: { Row: AgentTemplate; Insert: AgentTemplateInsert; Update: AgentTemplateUpdate; Relationships: [] }
      agents: { Row: Agent; Insert: AgentInsert; Update: AgentUpdate; Relationships: [] }
      agent_versions: { Row: AgentVersion; Insert: AgentVersionInsert; Update: never; Relationships: [] }
      graph_steps: { Row: GraphStep; Insert: GraphStepInsert; Update: GraphStepUpdate; Relationships: [] }
      conversations: { Row: Conversation; Insert: ConversationInsert; Update: ConversationUpdate; Relationships: [] }
      chat_messages: { Row: ChatMessageRow; Insert: ChatMessageInsert; Update: never; Relationships: [] }
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
