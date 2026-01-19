// Database types for the Curator Module

export type UserRole = 'user' | 'curator' | 'admin'
export type DocType = 'fhir' | 'vbc' | 'grants' | 'billing'
export type ProcessingStatus = 'pending' | 'processing' | 'review' | 'completed' | 'failed'
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'filtered' | 'enriching'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  filename: string
  original_filename: string
  doc_type: DocType
  storage_path: string
  file_size: number | null
  mime_type: string | null
  upload_date: string
  uploaded_by: string | null
  processing_status: ProcessingStatus
  total_chunks: number | null
  approved_chunks: number
  rejected_chunks: number
  metadata: DocumentMetadata | null
  error_message: string | null
}

export interface DocumentMetadata {
  filters_applied?: string[]
  processed_at?: string
  processing_duration_ms?: number
  [key: string]: unknown
}

export interface DocumentChunk {
  id: string
  document_id: string
  chunk_index: number
  chunk_text: string
  chunk_size: number | null
  ai_metadata: ChunkAIMetadata | null
  confidence_score: number | null
  review_status: ReviewStatus
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

export interface ChunkAIMetadata {
  // AI-generated metadata
  topic?: string
  subtopic?: string
  relevance_score?: number
  use_cases?: string[]
  key_concepts?: string[]
  acronyms?: Record<string, string>
  reasoning?: string

  // Comprehensive chunk metadata
  chunk_id?: string
  source_document?: string
  source_url?: string
  document_type?: string
  domain?: string
  date_added?: string
  curator?: string
  tags?: string[]
  chunk_index?: number
  word_count?: number
  last_updated?: string
}

export interface KBVector {
  id: string
  chunk_id: string
  document_id: string
  content: string
  embedding?: number[] // pgvector
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

// ============================================
// API Response Types
// ============================================

export interface DocumentWithStats extends Document {
  pending_chunks?: number
}

export interface DocumentStats {
  total: number
  approved: number
  rejected: number
  pending: number
  filtered: number
}

export interface ChunkForReview extends DocumentChunk {
  document?: {
    filename: string
    doc_type: DocType
  }
}

// ============================================
// Insert/Update Types
// ============================================

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>

export type DocumentInsert = Omit<Document, 'id' | 'upload_date' | 'approved_chunks' | 'rejected_chunks'>
export type DocumentUpdate = Partial<Omit<Document, 'id' | 'upload_date'>>

export type ChunkInsert = Omit<DocumentChunk, 'id' | 'created_at'>
export type ChunkUpdate = Partial<Omit<DocumentChunk, 'id' | 'document_id' | 'chunk_index' | 'created_at'>>

export type KBVectorInsert = Omit<KBVector, 'id' | 'approved_date'>
export type KBVectorUpdate = Partial<Omit<KBVector, 'id' | 'chunk_id' | 'document_id' | 'approved_date'>>

// ============================================
// Supabase Database Types (for type-safety)
// ============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      documents: {
        Row: Document
        Insert: DocumentInsert
        Update: DocumentUpdate
      }
      document_chunks: {
        Row: DocumentChunk
        Insert: ChunkInsert
        Update: ChunkUpdate
      }
      kb_vectors: {
        Row: KBVector
        Insert: KBVectorInsert
        Update: KBVectorUpdate
      }
    }
    Functions: {
      has_role: {
        Args: { user_id: string; required_role: string }
        Returns: boolean
      }
      is_curator_or_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      increment_approved_chunks: {
        Args: { doc_id: string }
        Returns: void
      }
      increment_rejected_chunks: {
        Args: { doc_id: string }
        Returns: void
      }
      match_documents: {
        Args: {
          query_embedding: number[]
          match_threshold?: number
          match_count?: number
          filter_doc_type?: string
          filter_use_cases?: string[]
        }
        Returns: {
          id: string
          content: string
          similarity: number
          metadata: Record<string, unknown>
        }[]
      }
    }
  }
}
