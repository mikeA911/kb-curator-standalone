'use client'

import { useState, useEffect } from 'react'
import { getCurators, getKnowledgeBases, assignKBsToCurator } from '../../lib/api/admin'
import type { Profile, KnowledgeBase } from '../../types'

export default function CuratorAssignment() {
  const [curators, setCurators] = useState<Profile[]>([])
  const [kbs, setKbs] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [curatorsData, kbsData] = await Promise.all([
        getCurators(),
        getKnowledgeBases()
      ])
      setCurators(curatorsData)
      setKbs(kbsData)
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleKB(curatorId: string, kbId: string, currentKBs: string[]) {
    let newKBs: string[]
    if (currentKBs.includes(kbId)) {
      newKBs = currentKBs.filter(id => id !== kbId)
    } else {
      newKBs = [...currentKBs, kbId]
    }

    try {
      await assignKBsToCurator(curatorId, newKBs)
      loadData()
    } catch (err) {
      setError('Failed to update assignments')
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Curator KB Assignments</h2>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Curator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Knowledge Bases</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {curators.map((curator) => (
                <tr key={curator.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{curator.full_name || curator.email}</div>
                    <div className="text-sm text-gray-500">{curator.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {kbs.map((kb) => (
                        <label key={kb.id} className="inline-flex items-center bg-gray-100 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-gray-200">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={curator.assigned_kbs?.includes(kb.id)}
                            onChange={() => handleToggleKB(curator.id, kb.id, curator.assigned_kbs || [])}
                          />
                          {kb.name}
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
