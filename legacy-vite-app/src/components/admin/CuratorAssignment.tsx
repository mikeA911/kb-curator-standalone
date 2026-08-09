'use client'

import { useState, useEffect } from 'react'
import { getAllProfiles, getKnowledgeBases, assignKBsToCurator, updateUserRole } from '../../lib/api/admin'
import type { Profile, KnowledgeBase, UserRole } from '../../types'

export default function CuratorAssignment() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [kbs, setKbs] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      console.log('[CuratorAssignment] Loading data...')
      const [profilesData, kbsData] = await Promise.all([
        getAllProfiles(),
        getKnowledgeBases()
      ])
      console.log('[CuratorAssignment] Data loaded:', { profiles: profilesData.length, kbs: kbsData.length })
      setProfiles(profilesData)
      setKbs(kbsData)
    } catch (err) {
      console.error('[CuratorAssignment] Load error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    try {
      await updateUserRole(userId, newRole)
      loadData()
    } catch (err) {
      setError('Failed to update role')
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
      <h2 className="text-xl font-semibold mb-4">User Roles & KB Assignments</h2>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Knowledge Bases</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500 italic">
                    No users found in the profiles table.
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => (
                  <tr key={profile.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{profile.full_name || profile.email}</div>
                      <div className="text-sm text-gray-500">{profile.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={profile.role}
                        onChange={(e) => handleRoleChange(profile.id, e.target.value as UserRole)}
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        aria-label="Change user role"
                      >
                        <option value="user">User</option>
                        <option value="curator">Curator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {(profile.role === 'curator' || profile.role === 'admin') ? (
                        <div className="flex flex-wrap gap-2">
                          {kbs.map((kb) => (
                            <label key={kb.id} className="inline-flex items-center bg-gray-100 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-gray-200">
                              <input
                                type="checkbox"
                                className="mr-2"
                                checked={profile.assigned_kbs?.includes(kb.id)}
                                onChange={() => handleToggleKB(profile.id, kb.id, profile.assigned_kbs || [])}
                              />
                              {kb.name}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm italic">Assign as curator to manage KBs</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
