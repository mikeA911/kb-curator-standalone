import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ProcessingStatus, CurationQueueItem } from '../../types'
import { getDashboardStats, deleteDocument } from '../../lib/api/curator'
import { getCurationQueue } from '../../lib/api/admin'
import { useDocuments } from '../../hooks/useCurator'
import { useAuth } from '../../hooks/useAuth'

interface DashboardStats {
  totalDocuments: number
  completedDocuments: number
  totalChunks: number
  approvedChunks: number
  pendingReview: number
  inQueue: number
  draftDocuments: number
  submittedDocuments: number
}

interface Props {
  onSelectQueueItem?: (item: CurationQueueItem) => void
}

export default function CuratorDashboard({ onSelectQueueItem }: Props) {
  const navigate = useNavigate()
  const { profile, isAdmin, isCurator } = useAuth()
  const { documents, refresh: refreshDocuments } = useDocuments()
  const [queue, setQueue] = useState<CurationQueueItem[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    completedDocuments: 0,
    totalChunks: 0,
    approvedChunks: 0,
    pendingReview: 0,
    inQueue: 0,
    draftDocuments: 0,
    submittedDocuments: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Track viewed sources
  const [viewedSources, setViewedSources] = useState<string[]>([])

  useEffect(() => {
    // Load viewed sources from localStorage
    const saved = localStorage.getItem('viewedSources')
    if (saved) {
      setViewedSources(JSON.parse(saved))
    }
  }, [])

  const markSourceAsViewed = (url: string) => {
    if (!viewedSources.includes(url)) {
      const newViewed = [...viewedSources, url]
      setViewedSources(newViewed)
      localStorage.setItem('viewedSources', JSON.stringify(newViewed))
    }
  }

  useEffect(() => {
    async function loadData() {
      if (!profile) return
      
      try {
        const [dashStats, queueData] = await Promise.all([
          getDashboardStats(),
          getCurationQueue()
        ])
        setStats(dashStats)
        
        if (profile?.role === 'curator') {
          setQueue(queueData.filter(item => profile.assigned_kbs?.includes(item.kb_id)))
        } else {
          setQueue(queueData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [profile?.id, profile?.assigned_kbs?.join(',')])

  const getStatusColor = (status: ProcessingStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'submitted':
        return 'bg-purple-100 text-purple-800'
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
              <p className="text-sm font-medium text-gray-600 uppercase">In Queue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.inQueue}</p>
            </div>
            <div className="text-4xl">📥</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Documents awaiting curation</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase">Working On</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.draftDocuments}</p>
            </div>
            <div className="text-4xl">📝</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Drafts in progress</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase">Submitted</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.submittedDocuments}</p>
            </div>
            <div className="text-4xl">📤</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Awaiting admin approval</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.completedDocuments}</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Fully processed documents</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
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
          Document Input
        </Link>

        {isCurator && (
          <button
            onClick={() => alert('Profile update functionality will be implemented soon.')}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Update Profile
          </button>
        )}

        {isAdmin && (
          <Link
            to="/admin"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Admin Settings
          </Link>
        )}
      </div>

      {/* Curation Queue */}
      {queue.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
            <h3 className="text-lg font-semibold text-yellow-900">Available for Curation</h3>
            <p className="text-sm text-yellow-700">View these docs, download or copy and paste then start curating.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KB</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {queue.filter(item => item.status !== 'completed').map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getDocTypeColor(item.kb_id)}`}>
                        {item.kb_id.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.title}</div>
                      <div className="flex items-center gap-2">
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-blue-600 hover:underline"
                          onClick={() => markSourceAsViewed(item.url)}
                        >
                          View Source ↗
                        </a>
                        {viewedSources.includes(item.url) && (
                          <span className="text-green-600 text-xs flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Viewed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onSelectQueueItem?.(item)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Curate →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                        <div className="flex items-center justify-end gap-3">
                          {doc.processing_status === 'review' && (
                            <button
                              onClick={() => navigate(`/review/${doc.id}`)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              Review →
                            </button>
                          )}
                          {doc.processing_status === 'submitted' && isAdmin && (
                            <button
                              onClick={async () => {
                                if (confirm('Approve this document? This will mark it as completed.')) {
                                  try {
                                    const { approveDocument } = await import('../../lib/api/admin')
                                    await approveDocument(doc.id)
                                    refreshDocuments()
                                  } catch (err) {
                                    alert('Failed to approve document')
                                  }
                                }
                              }}
                              className="text-green-600 hover:text-green-900 font-medium"
                            >
                              Approve ✓
                            </button>
                          )}
                          {doc.processing_status === 'submitted' && !isAdmin && (
                            <span className="text-purple-600 font-medium">Submitted</span>
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

                          <button
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this document? This will also delete all associated chunks and vectors. This action cannot be undone.')) {
                                try {
                                  await deleteDocument(doc.id)
                                  refreshDocuments()
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : 'Failed to delete document')
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete Document"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
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
