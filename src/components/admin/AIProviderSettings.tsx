import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'

export default function AIProviderSettings() {
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini')
  const [processor, setProcessor] = useState<'flowise' | 'direct_gemini' | 'direct_ai'>('direct_gemini')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    async function loadSettings() {
      const supabase = createClient()
      try {
        const { data: settings } = await supabase.from('settings').select('*')
        
        const providerSetting = settings?.find(s => s.key === 'ai_provider')
        if (providerSetting) setProvider(providerSetting.value.provider)
        
        const processorSetting = settings?.find(s => s.key === 'document_processor')
        if (processorSetting) setProcessor(processorSetting.value.processor)
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  async function saveSettings() {
    setSaving(true)
    setMessage(null)
    const supabase = createClient()
    try {
      await Promise.all([
        supabase.from('settings').upsert({ 
          key: 'ai_provider', 
          value: { provider },
          updated_at: new Date().toISOString()
        }),
        supabase.from('settings').upsert({ 
          key: 'document_processor', 
          value: { processor },
          updated_at: new Date().toISOString()
        })
      ])
      setMessage({ type: 'success', text: 'Settings saved successfully' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-4">Loading settings...</div>

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">AI Provider</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                className="form-radio h-4 w-4 text-blue-600"
                name="provider"
                value="gemini"
                checked={provider === 'gemini'}
                onChange={(e) => setProvider(e.target.value as 'gemini')}
              />
              <span className="ml-2">Google Gemini</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                className="form-radio h-4 w-4 text-blue-600"
                name="provider"
                value="openai"
                checked={provider === 'openai'}
                onChange={(e) => setProvider(e.target.value as 'openai')}
              />
              <span className="ml-2">OpenAI (GPT-4o)</span>
            </label>
          </div>
          <p className="text-sm text-gray-500">
            Select which AI provider to use for document processing, enrichment, and embeddings.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Document Processor</h3>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="flex items-center">
              <input
                type="radio"
                className="form-radio h-4 w-4 text-blue-600"
                name="processor"
                value="direct_ai"
                checked={processor === 'direct_ai'}
                onChange={(e) => setProcessor(e.target.value as 'direct_ai')}
              />
              <span className="ml-2 font-medium">Direct AI (Recommended)</span>
            </label>
            <p className="ml-6 text-sm text-gray-500">
              Uses the selected AI provider directly for faster and more reliable processing.
            </p>

            <label className="flex items-center mt-2">
              <input
                type="radio"
                className="form-radio h-4 w-4 text-blue-600"
                name="processor"
                value="flowise"
                checked={processor === 'flowise'}
                onChange={(e) => setProcessor(e.target.value as 'flowise')}
              />
              <span className="ml-2 font-medium">Flowise (Legacy)</span>
            </label>
            <p className="ml-6 text-sm text-gray-500">
              Uses Flowise flows for processing. Requires a running Flowise instance.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
