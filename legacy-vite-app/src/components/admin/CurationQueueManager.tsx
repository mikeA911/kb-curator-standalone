'use client'

import { useState, useEffect } from 'react'
import { getCurationQueue, addToCurationQueue, deleteFromCurationQueue, getKnowledgeBases } from '../../lib/api/admin'
import type { CurationQueueItem, KnowledgeBase } from '../../types'

export default function CurationQueueManager() {
  const [items, setItems] = useState<CurationQueueItem[]>([])
  const [kbs, setKbs] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newItem, setNewItem] = useState({ kb_id: '', title: '', url: '' })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [queueData, kbsData] = await Promise.all([
        getCurationQueue(),
        getKnowledgeBases()
      ])
      setItems(queueData)
      setKbs(kbsData)
      if (kbsData.length > 0) {
        setNewItem(prev => ({ ...prev, kb_id: kbsData[0].id }))
      }
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!newItem.kb_id || !newItem.title || !newItem.url) return
    try {
      await addToCurationQueue(newItem)
      setNewItem({ ...newItem, title: '', url: '' })
      loadData()
    } catch (err) {
      setError('Failed to add to queue')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFromCurationQueue(id)
      loadData()
    } catch (err) {
      setError('Failed to delete item')
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Add to Curation Queue</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            aria-label="Select Knowledge Base"
            className="border p-2 rounded"
            value={newItem.kb_id}
            onChange={(e) => setNewItem({ ...newItem, kb_id: e.target.value })}
          >
            {kbs.map(kb => (
              <option key={kb.id} value={kb.id}>{kb.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Document Title"
            className="border p-2 rounded"
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
          />
          <input
            type="text"
            placeholder="URL"
            className="border p-2 rounded"
            value={newItem.url}
            onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
          />
        </div>
        <button
          onClick={handleAdd}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add to Queue
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Curation Queue</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KB</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {kbs.find(k => k.id === item.kb_id)?.name || item.kb_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {item.title}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        item.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
