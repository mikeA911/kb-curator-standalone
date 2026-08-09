import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const KBS = [
  { id: 'fhir', name: 'FHIR', description: 'FHIR / healthcare interoperability standards' },
  { id: 'vbc', name: 'Value-Based Care', description: 'Value-based care models and programs' },
  { id: 'grants', name: 'Grants', description: 'Grant funding and program documentation' },
  { id: 'billing', name: 'Billing', description: 'Healthcare billing and claims' },
]

const { error } = await admin.from('knowledge_bases').upsert(KBS, { onConflict: 'id', ignoreDuplicates: true })
if (error) {
  console.error('Failed to seed knowledge bases:', error.message)
  process.exit(1)
}
console.log(`Seeded ${KBS.length} knowledge bases.`)
