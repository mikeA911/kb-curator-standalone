'use client'

import { useState } from 'react'
import KBManagement from '../components/admin/KBManagement'
import CuratorAssignment from '../components/admin/CuratorAssignment'
import CurationQueueManager from '../components/admin/CurationQueueManager'

type Tab = 'stats' | 'kbs' | 'curators' | 'queue' | 'settings'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('stats')

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'stats', label: 'Statistics', icon: '📊' },
    { id: 'kbs', label: 'Knowledge Bases', icon: '📚' },
    { id: 'curators', label: 'Curators', icon: '👥' },
    { id: 'queue', label: 'Curation Queue', icon: '📥' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <p className="text-gray-600 italic">System statistics and document status breakdown coming soon...</p>
          </div>
        )}

        {activeTab === 'kbs' && <KBManagement />}
        
        {activeTab === 'curators' && <CuratorAssignment />}
        
        {activeTab === 'queue' && <CurationQueueManager />}

        {activeTab === 'settings' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">AI Provider Settings</h2>
            <p className="text-gray-600 italic">Settings component to be migrated...</p>
          </div>
        )}
      </div>
    </div>
  )
}
