// Robust .env.local loader + subprocess runner -- avoids shell-sourcing
// issues with values containing special characters (e.g. a Postgres
// connection string with [ ] @ : in it). Usage:
//   node scripts/run-with-env.mjs -- <command> <...args>
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const envPath = '.env.local'
const content = fs.readFileSync(envPath, 'utf-8')
const env = { ...process.env }

for (const line of content.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  const key = trimmed.slice(0, eq).trim()
  const value = trimmed.slice(eq + 1).trim()
  env[key] = value
}

const args = process.argv.slice(2)
const sepIndex = args.indexOf('--')
const cmdArgs = sepIndex === -1 ? args : args.slice(sepIndex + 1)
const [cmd, ...rest] = cmdArgs

const result = spawnSync(cmd, rest, { stdio: 'inherit', env, shell: true })
process.exit(result.status ?? 1)
