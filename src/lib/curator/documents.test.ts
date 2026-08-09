import { describe, it, expect } from 'vitest'
import { createUploadedDocument, submitDocument, DocumentValidationError } from './documents'
import { createFakeSupabase } from '@/lib/test-support/fake-supabase'

function makeFile(name: string, type: string, size: number): File {
  const bytes = new Uint8Array(size)
  return new File([bytes], name, { type })
}

describe('createUploadedDocument', () => {
  it('rejects files over the 50MB limit', async () => {
    const supabase = createFakeSupabase({}) as never
    const file = makeFile('big.pdf', 'application/pdf', 51 * 1024 * 1024)

    await expect(
      createUploadedDocument(supabase, { file, docType: 'fhir', uploadedBy: 'user-1' })
    ).rejects.toBeInstanceOf(DocumentValidationError)
  })

  it('rejects unsupported mime types', async () => {
    const supabase = createFakeSupabase({}) as never
    const file = makeFile('image.png', 'image/png', 1024)

    await expect(
      createUploadedDocument(supabase, { file, docType: 'fhir', uploadedBy: 'user-1' })
    ).rejects.toBeInstanceOf(DocumentValidationError)
  })

  it('rejects a duplicate doc_type + source_url before touching storage', async () => {
    const supabase = createFakeSupabase({
      documents: [{ data: { id: 'existing-doc' }, error: null }],
    }) as never
    const file = makeFile('doc.txt', 'text/plain', 1024)

    await expect(
      createUploadedDocument(supabase, {
        file,
        docType: 'fhir',
        sourceUrl: 'https://example.com/a',
        uploadedBy: 'user-1',
      })
    ).rejects.toThrow('already been uploaded')
  })
})

describe('submitDocument', () => {
  it('is blocked while any chunk is pending, draft, or enriching', async () => {
    const supabase = createFakeSupabase({
      document_chunks: [
        { data: [{ review_status: 'approved' }, { review_status: 'pending' }], error: null },
      ],
    }) as never

    await expect(submitDocument(supabase, 'doc-1')).rejects.toBeInstanceOf(DocumentValidationError)
  })

  it('succeeds once every chunk is approved, rejected, or filtered', async () => {
    const supabase = createFakeSupabase({
      document_chunks: [
        { data: [{ review_status: 'approved' }, { review_status: 'rejected' }, { review_status: 'filtered' }], error: null },
      ],
      documents: [{ data: null, error: null }],
    }) as never

    await expect(submitDocument(supabase, 'doc-1')).resolves.toBeUndefined()
  })
})
