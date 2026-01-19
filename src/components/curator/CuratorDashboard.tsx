import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Document, ProcessingStatus } from '../../types'
import { getDocuments, getDashboardStats } from '../../lib/api/curator'

interface DashboardStats {
  totalDocuments: number
  completedDocuments: number
  totalChunks: number
  approvedChunks: number
  pendingReview: number
}

export default function CuratorDashboard() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    completedDocuments: 0,
    totalChunks: 0,
    approvedChunks: 0,
    pendingReview: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [docs, dashStats] = await Promise.all([getDocuments(), getDashboardStats()])
        setDocuments(docs)
        setStats(dashStats)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const getStatusColor = (status: ProcessingStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'review':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDocTypeColor = (docType: string) => {
    switch (docType) {
      case 'fhir':
        return 'bg-purple-100 text-purple-800'
      case 'vbc':
        return 'bg-blue-100 text-blue-800'
      case 'grants':
        return 'bg-green-100 text-green-800'
      case 'billing':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 font-medium mb-2">Error loading dashboard</div>
        <p className="text-sm text-gray-600">{error}</p>
      </div>
    )
  }

  const completionRate =
    stats.totalChunks > 0 ? Math.round((stats.approvedChunks / stats.totalChunks) * 100) : 0

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Curator Dashboard</h2>
        <p className="text-gray-600">Monitor and manage knowledge base curation</p>
      </div>

      {/* Aggregate Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase">Total Documents</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalDocuments}</p>
            </div>
            <div className="text-4xl">📄</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{stats.completedDocuments} completed</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase">Total Chunks</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalChunks}</p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Across all documents</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase">Approved Chunks</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.approvedChunks}</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Ready for RAG queries</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase">Completion Rate</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{completionRate}%</p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{stats.pendingReview} pending review</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Link
          to="/upload"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Upload Document
        </Link>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600 font-medium mb-2">No documents uploaded yet</p>
            <p className="text-sm text-gray-500">Upload your first document to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => {
                  const progress =
                    doc.total_chunks && doc.total_chunks > 0
                      ? ((doc.approved_chunks || 0) / doc.total_chunks) * 100
                      : 0

                  return (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {doc.original_filename}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getDocTypeColor(doc.doc_type)}`}
                        >
                          {doc.doc_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(doc.processing_status)}`}
                        >
                          {doc.processing_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">
                              {doc.approved_chunks || 0} / {doc.total_chunks || 0}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                          <span className="ml-2 text-xs text-gray-500">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(doc.upload_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {doc.processing_status === 'review' && (
                          <button
                            onClick={() => navigate(`/review/${doc.id}`)}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            Review →
                          </button>
                        )}
                        {doc.processing_status === 'completed' && (
                          <span className="text-green-600 font-medium">Complete ✓</span>
                        )}
                        {doc.processing_status === 'processing' && (
                          <span className="text-gray-500">Processing...</span>
                        )}
                        {doc.processing_status === 'pending' && (
                          <span className="text-gray-500">Pending</span>
                        )}
                        {doc.processing_status === 'failed' && (
                          <span className="text-red-500">Failed</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
