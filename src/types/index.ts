// Re-export all types
export * from './database'

// Additional shared types

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  success: boolean
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// FlowiseAI types
export interface FlowiseChunk {
  index: number
  text: string
  filtered: boolean
  filter_reason?: string
  section_type?: string
}

export interface FlowiseMetadata {
  topic: string
  subtopic: string
  relevance_score: number
  use_cases: string[]
  key_concepts: string[]
  acronyms?: Record<string, string>
  confidence?: number
}

export interface FlowiseEmbedResult {
  success: boolean
  vector_id?: string
  error?: string
}

// Form types
export interface UploadFormData {
  file: File
  docType: 'fhir' | 'vbc' | 'grants' | 'billing'
  filters: string[]
}

export interface ReviewFormData {
  curator_notes?: string
  action: 'approve' | 'reject'
}

// Filter options
export const FILTER_OPTIONS = [
  { key: 'toc', label: 'Remove table of contents' },
  { key: 'index', label: 'Remove index/glossary' },
  { key: 'cover', label: 'Remove cover pages' },
  { key: 'boilerplate', label: 'Remove boilerplate legal text' },
  { key: 'code', label: 'Remove code examples' },
  { key: 'appendix', label: 'Remove appendices' },
] as const

export const DOC_TYPE_OPTIONS = [
  { value: 'fhir', label: 'FHIR Specification' },
  { value: 'vbc', label: 'VBC Playbook' },
  { value: 'grants', label: 'Grant Documentation' },
  { value: 'billing', label: 'Billing Guide' },
] as const

// Constants
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const

export const DEFAULT_FILTERS = ['toc', 'index', 'cover', 'boilerplate']
