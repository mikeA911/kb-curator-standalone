// Applies specific migration files directly via the Postgres connection
// string (SUPABASE_DB_URL), instead of asking the user to paste SQL into
// the Supabase SQL Editor. Idempotent-safe migrations (create table/function
// if not exists or create-or-replace) can be re-run; `create policy` cannot,
// so pass only the files you actually need applied.
//
// Usage: node --env-file=.env.local scripts/run-migrations.mjs <file1.sql> [file2.sql ...]
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('Usage: node scripts/run-migrations.mjs <migration-file.sql> [...]')
  process.exit(1)
}

const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) throw new Error('Missing SUPABASE_DB_URL')

const client = new pg.Client({ connectionString })
await client.connect()

try {
  for (const file of files) {
    const filePath = path.join(process.cwd(), 'supabase', 'migrations', file)
    const sql = fs.readFileSync(filePath, 'utf-8')
    console.log(`Applying ${file}...`)
    await client.query(sql)
    console.log(`  OK`)
  }
} finally {
  await client.end()
}
