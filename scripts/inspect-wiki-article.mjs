import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const slug = process.argv[2]
if (!slug) throw new Error('Usage: node inspect-wiki-article.mjs <slug>')

const { data: article, error } = await admin.from('wiki_articles').select('*').eq('slug', slug).single()
if (error) throw error
console.log('article:', JSON.stringify(article, null, 2))

const { data: versions } = await admin.from('wiki_versions').select('*').eq('wiki_article_id', article.id).order('version_number')
console.log('\nversions:', JSON.stringify(versions, null, 2))

const { data: vectors } = await admin.from('wiki_vectors').select('id, wiki_version_id, embedding_model, embedding_dim').eq('wiki_version_id', article.current_version_id)
console.log('\nwiki_vectors for current version:', JSON.stringify(vectors, null, 2))

const { data: logs } = await admin
  .from('ai_operation_logs')
  .select('operation, provider, model, success, latency_ms, error_message, created_at')
  .order('created_at', { ascending: false })
  .limit(10)
console.log('\nrecent ai_operation_logs:', JSON.stringify(logs, null, 2))
