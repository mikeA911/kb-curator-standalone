'use client'

import { useState, useEffect } from 'react'
import { getKnowledgeBases, createKnowledgeBase, deleteKnowledgeBase } from '../../lib/api/admin'
import type { KnowledgeBase } from '../../types'

export default function KBManagement() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newKb, setNewKb] = useState({ id: '', name: '', description: '' })

  useEffect(() => {
    loadKbs()
  }, [])

  async function loadKbs() {
    setLoading(true)
    try {
      const data = await getKnowledgeBases()
      setKbs(data)
    } catch (err) {
      setError('Failed to load knowledge bases')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!newKb.id || !newKb.name) return
    try {
      await createKnowledgeBase(newKb)
      setNewKb({ id: '', name: '', description: '' })
      loadKbs()
    } catch (err) {
      setError('Failed to create knowledge base')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this knowledge base?')) return
    try {
      await deleteKnowledgeBase(id)
      loadKbs()
    } catch (err) {
      setError('Failed to delete knowledge base')
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Create New Knowledge Base</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="ID (e.g. fhir)"
            className="border p-2 rounded"
            value={newKb.id}
            onChange={(e) => setNewKb({ ...newKb, id: e.target.value })}
          />
          <input
            type="text"
            placeholder="Name"
            className="border p-2 rounded"
            value={newKb.name}
            onChange={(e) => setNewKb({ ...newKb, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Description"
            className="border p-2 rounded"
            value={newKb.description}
            onChange={(e) => setNewKb({ ...newKb, description: e.target.value })}
          />
        </div>
        <button
          onClick={handleCreate}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Knowledge Base
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Existing Knowledge Bases</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {kbs.map((kb) => (
                  <tr key={kb.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{kb.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{kb.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{kb.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleDelete(kb.id)}
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
