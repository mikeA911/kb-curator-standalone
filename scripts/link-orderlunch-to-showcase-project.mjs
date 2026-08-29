// One-off: annotate the earlier standalone "OrderLunch Agent (Lunch Agent)"
// placeholder (scripts/seed-showcase-projects.mjs) to point at the broader
// "Food Outlet AI-Readiness Showcase" project (scripts/seed-food-outlet-showcase-project.mjs)
// created from Mike's follow-up dev request, 2026-08-27 -- the Lunch Agent is
// now Phase 1's concrete deliverable within that broader project, not a
// separate initiative. Does not delete or merge the row, just cross-references it.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const { data: lunchAgent, error: lunchAgentError } = await admin
  .from('projects')
  .select('id, details')
  .eq('name', 'OrderLunch Agent (Lunch Agent)')
  .single()
if (lunchAgentError || !lunchAgent) throw lunchAgentError ?? new Error('OrderLunch Agent project not found')

const { data: showcase, error: showcaseError } = await admin
  .from('projects')
  .select('id')
  .eq('name', 'Food Outlet AI-Readiness Showcase')
  .single()
if (showcaseError || !showcase) throw showcaseError ?? new Error('Food Outlet AI-Readiness Showcase project not found')

const { error: updateError } = await admin
  .from('projects')
  .update({
    details: {
      ...lunchAgent.details,
      superseded_or_folded_into:
        `This standalone placeholder is now Phase 1's concrete deliverable ("Lunch Agent" + "One Outlet Skill") within the broader "Food Outlet AI-Readiness Showcase" project (${showcase.id}), per Mike's 2026-08-27 dev request (docs/dev-request-food-outlet-ai-readiness-showcase.md). Prefer that project for further work; this one is kept for traceability, not duplicated effort.`,
    },
  })
  .eq('id', lunchAgent.id)
if (updateError) throw updateError

console.log(`Updated OrderLunch Agent project (${lunchAgent.id}) to cross-reference Food Outlet AI-Readiness Showcase (${showcase.id})`)
