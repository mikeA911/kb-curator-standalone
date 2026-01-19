import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  uploadDocument,
  processAndStoreDocument,
  enrichDocumentChunks,
} from '../../lib/api/curator'
import { DOC_TYPE_OPTIONS, FILTER_OPTIONS, DEFAULT_FILTERS, type DocType } from '../../types'

interface Props {
  onSuccess?: (documentId: string) => void
}

export default function DocumentUploader({ onSuccess }: Props) {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState<DocType>('fhir')
  const [selectedFilters, setSelectedFilters] = useState<string[]>(DEFAULT_FILTERS)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      validateAndSetFile(droppedFile)
    }
  }, [])

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.size > 50 * 1024 * 1024) {
      alert('File is too large. Maximum size is 50MB.')
      return
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]

    if (!allowedTypes.includes(selectedFile.type)) {
      alert('Invalid file type. Please upload PDF, DOCX, or TXT files.')
      return
    }

    setFile(selectedFile)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const toggleFilter = (filterKey: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filterKey) ? prev.filter((f) => f !== filterKey) : [...prev, filterKey]
    )
  }

  const handleProcess = async () => {
    if (!file) {
      alert('Please select a file first')
      return
    }

    setProcessing(true)
    setProgress(0)

    try {
      setStatusText('📤 Uploading to storage...')
      setProgress(20)

      const { storageUrl, documentId } = await uploadDocument(file, docType)

      setStatusText('🔄 Processing and chunking document...')
      setProgress(50)

      const chunkCount = await processAndStoreDocument(documentId, storageUrl, docType, selectedFilters)

      setStatusText('✨ Enriching chunks with AI metadata...')
      setProgress(80)

      await enrichDocumentChunks(documentId, docType, 10)

      setProgress(100)
      setStatusText(`✅ Complete! ${chunkCount} chunks ready for review.`)

      setTimeout(() => {
        if (onSuccess) {
          onSuccess(documentId)
        } else {
          navigate(`/review/${documentId}`)
        }
      }, 1500)
    } catch (error) {
      console.error('Processing error:', error)
      let errorMessage = 'Failed to process document. Please try again.'

      if (error instanceof Error) {
        if (error.message.includes('50MB')) {
          errorMessage = 'File is too large. Maximum size is 50MB.'
        } else if (error.message.includes('File type')) {
          errorMessage = 'Invalid file type. Please upload PDF, DOCX, or TXT files.'
        } else if (error.message.includes('Upload failed')) {
          errorMessage = 'Upload failed. Please check your connection and try again.'
        } else if (error.message.includes('Flowise')) {
          errorMessage = 'AI processing is not configured. Document uploaded but not processed.'
        } else {
          errorMessage = error.message
        }
      }

      alert(errorMessage)
      setStatusText('')
      setProgress(0)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Upload Document</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Choose a file</label>
        <div
          className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="space-y-1 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
              >
                <span>Upload a file</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  disabled={processing}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PDF, DOCX, or TXT up to 50MB</p>
          </div>
        </div>
        {file && (
          <p className="mt-2 text-sm text-green-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value as DocType)}
          disabled={processing}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {DOC_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          This helps AI understand the document structure and extract relevant metadata.
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Content Filters</label>
        <p className="text-sm text-gray-500 mb-3">
          AI will automatically filter these sections from the document:
        </p>
        <div className="grid grid-cols-2 gap-3">
          {FILTER_OPTIONS.map((filter) => (
            <label key={filter.key} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFilters.includes(filter.key)}
                onChange={() => toggleFilter(filter.key)}
                disabled={processing}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <span className="text-sm text-gray-700">{filter.label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleProcess}
        disabled={!file || processing}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-sm transition-colors"
      >
        {processing ? 'Processing...' : '🚀 Process Document'}
      </button>

      {processing && (
        <div className="mt-6">
          <div className="mb-2">
            <p className="text-sm text-gray-600 font-medium">{statusText}</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">{progress}%</p>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-blue-800 mb-2">What happens next?</h4>
        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
          <li>Document is uploaded to secure storage</li>
          <li>AI processes and chunks the document</li>
          <li>Unwanted sections are filtered out</li>
          <li>Each chunk gets AI-generated metadata</li>
          <li>You review and approve/reject each chunk</li>
          <li>Approved chunks are added to the RAG knowledge base</li>
        </ol>
      </div>
    </div>
  )
}
