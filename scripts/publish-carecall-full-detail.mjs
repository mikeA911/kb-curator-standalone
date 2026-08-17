// One-off: publish the CareCall project with the curated public_profile
// summary AND the new admin-only public_full_detail opt-in (so anonymous
// visitors can also browse the real workstreams/artifacts/assessment
// answers, not just this summary). Content below is a genuine synthesis of
// the three participants' actual System Understanding Assessment answers
// and workstream summaries already in the database -- not invented.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const PROJECT_ID = '6c11785b-695f-4ae7-b3a8-e3183f489701'

const { data: owner, error: ownerError } = await admin.from('profiles').select('id').eq('email', 'mike.aguilar@gmail.com').single()
if (ownerError || !owner) throw ownerError ?? new Error('mike.aguilar profile not found')

const publicProfile = {
  title: 'CareCall — Can AI Reconstruct an API Contract From Legacy Code?',
  summary:
    'Three AI coding assistants -- Claude Code, OpenAI, and Grok -- independently analyzed the same legacy healthcare-scheduling application and tried to reconstruct its API contract from scratch, without being told what it does and without seeing each other\'s work.',
  problem:
    'Can an AI coding assistant accurately reconstruct an existing application\'s API surface, authentication model, and security posture purely from source-code evidence -- and where does it succeed, guess wrong, or honestly admit it doesn\'t know?',
  approach:
    'Each participant received the same prompt: analyze CareCall (a Supabase Edge Functions + Telnyx voice app) read-only, in a separate external session, and produce five evidence-backed deliverables -- a capability inventory, an endpoint inventory, an OpenAPI 3.1 spec, a findings report, and an evidence map linking every claim back to a file:line citation. Confidence had to be labeled CONFIRMED, INFERRED, or UNKNOWN; inventing behavior "because it would normally be expected" was explicitly disallowed. Separately, each participant also answered the same 10-question System Understanding Assessment -- covering tenant isolation, PHI handling, RBAC, webhook security, and more -- to test genuine comprehension rather than plausible-looking output.',
  findings:
    'All three independently confirmed CareCall\'s real architecture (5 Supabase Edge Functions, no traditional REST router, Telnyx-driven voice AI, clinic-scoped multi-tenancy via Postgres RLS) and converged on the same two critical security gaps: the Telnyx call-events webhook has zero signature verification, and the campaign dialer accepts any Bearer-shaped token with no role check behind it.\n\nBut they diverged in revealing ways. Claude\'s five-artifact evidence set didn\'t cover the portal UI or read the AI assistant\'s instructions file directly, so it answered UNKNOWN on Campaign Reporting and on where the AI\'s personality is configured -- OpenAI and Grok both traced into the actual page components and config file and answered confidently. OpenAI alone surfaced a real, separate gap the other two missed entirely: a later migration that lets any authenticated user read every clinic\'s configuration row across tenants. Capability counts differed by scope choice, not accuracy -- Claude counted 30 granular capabilities across 22 operations; Grok grouped the same functionality into 6 capabilities and 12 operations.',
  conclusion:
    'All three tools produced a genuinely useful, evidence-grounded hypothesis of the API contract, not a hallucinated one. But evidence-grounded isn\'t the same as complete: each tool\'s blind spots were different, and no single run caught everything the other two did. Comparing independent runs side by side -- rather than trusting any one of them -- surfaced real findings that would otherwise have been missed, and that comparison is the actual point of this exercise.',
  relatedWikiSlugs: [],
}

const { error } = await admin
  .from('projects')
  .update({
    public_profile: publicProfile,
    visibility: 'public',
    public_slug: 'carecall-openapi-discovery',
    published_at: new Date().toISOString(),
    published_by: owner.id,
    public_full_detail: true,
  })
  .eq('id', PROJECT_ID)
if (error) throw error

console.log('Published. /examples/carecall-openapi-discovery (full data exposure on)')
