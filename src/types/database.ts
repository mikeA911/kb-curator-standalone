// Mirrors supabase/migrations/*.sql. Keep in sync by hand until this project
// generates types via `supabase gen types` against the live project.

export type UserRole = 'user' | 'curator' | 'admin'
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
  email: string
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
// Evaluation
// ============================================

export type EvalDatasetStatus = 'draft' | 'active' | 'archived'
export type EvalDifficulty = 'easy' | 'medium' | 'hard'
export type EvalRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type EvalResultStatus = 'completed' | 'failed'
export type EvidenceSource = 'chunks' | 'wiki' | 'both'
export type EvaluatorType = 'none' | 'llm_judge'
// Mirrors ProviderName in src/lib/ai/index.ts -- redeclared here rather than
// imported to avoid a database.ts <-> lib/ai circular import (lib/ai already
// imports Database from this file).
export type AIProviderName = 'openai' | 'gemini'
export type FailureClassification =
  | 'knowledge_failure'
  | 'retrieval_failure'
  | 'reasoning_failure'
  | 'workflow_failure'
  | 'tool_failure'
  | 'behavior_failure'
  | 'rule_failure'
  | 'unknown'

export interface EvalDataset {
  id: string
  name: string
  description: string | null
  version: number
  status: EvalDatasetStatus
  knowledge_base_id: string | null
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

export interface EvalRunConfig {
  generation: { provider: AIProviderName; model?: string }
  embedding: { provider: AIProviderName; model?: string; dimensions?: number }
  retrieval: { evidence_source: EvidenceSource; top_k: number; threshold?: number }
  evaluator: { type: EvaluatorType; provider?: AIProviderName; model?: string }
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
}

export interface EvalResultWithCase extends EvalResult {
  case: Pick<EvalCase, 'question' | 'expected_answer' | 'expected_concepts' | 'expected_article_ids' | 'expected_chunk_ids'>
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

export type WikiArticleInsert = Omit<WikiArticle, 'id' | 'created_at' | 'updated_at' | 'current_version_id'> &
  Partial<Pick<WikiArticle, 'current_version_id'>>
export type WikiArticleUpdate = Partial<Omit<WikiArticle, 'id' | 'created_at'>>

export type WikiVersionInsert = Omit<WikiVersion, 'id' | 'created_at'>
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
      eval_datasets: { Row: EvalDataset; Insert: EvalDatasetInsert; Update: EvalDatasetUpdate; Relationships: [] }
      eval_cases: { Row: EvalCase; Insert: EvalCaseInsert; Update: EvalCaseUpdate; Relationships: [] }
      eval_runs: { Row: EvalRun; Insert: EvalRunInsert; Update: EvalRunUpdate; Relationships: [] }
      eval_results: { Row: EvalResult; Insert: EvalResultInsert; Update: EvalResultUpdate; Relationships: [] }
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
