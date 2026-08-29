// Batch seed script for the 8 new Workbench Method Handbook articles drafted
// alongside the Showcase Project Library plan
// (docs/design-notes/showcase-project-library-and-methods.md, section 5).
// Mirrors scripts/seed-mcp-architecture-handbook-article.mjs's approach --
// wiki_articles row (status='draft') + one wiki_versions row via the
// service-role client, run under plain Node -- but batched across all 8
// articles instead of one script per article, since they were authored
// together and share nothing that would benefit from separate scripts.
//
// Each article's body is read from its companion docs/workbench-handbook-*.md
// file at run time (split at "## What it is", mirroring how the existing
// short-form Workbench Method articles are structured) so the source doc and
// the seeded content can never drift apart.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const { data: owner, error: ownerError } = await admin
  .from('profiles')
  .select('id, email')
  .eq('email', 'test-curator@kbsandbox.local')
  .single()
if (ownerError || !owner) throw ownerError ?? new Error('test-curator profile not found -- run npm run db:seed-users first')

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const docsDir = path.join(scriptDir, '..', 'docs')

const ARTICLES = [
  {
    slug: 'governed-qa-and-grounded-drafting-workbench-method',
    title: 'Governed Q&A & Grounded Drafting (Workbench Method)',
    shortDescription:
      'Answer a question or draft a short document from approved company knowledge only, citing sources and flagging gaps instead of inventing an answer -- the shared method behind HR/Accounting/SOP policy copilots, sales proposal drafting, and support Q&A.',
    quickHelp:
      'Governed Q&A & Grounded Drafting answers or drafts from approved knowledge only -- it cites its source, and says so plainly when the source does not cover the question, rather than filling the gap.',
    docFile: 'workbench-handbook-governed-qa-and-grounded-drafting.md',
  },
  {
    slug: 'guided-onboarding-role-specific-guide-assembly-workbench-method',
    title: 'Guided Onboarding / Role-Specific Guide Assembly (Workbench Method)',
    shortDescription:
      'Assemble a role-specific onboarding guide from already-approved policies and processes, sequencing what applies to a given role and flagging anything that role needs but has no approved source for yet.',
    quickHelp:
      'Guided Onboarding assembles a role-specific guide from existing approved material -- it compiles and sequences, it does not author new policy.',
    docFile: 'workbench-handbook-guided-onboarding-role-assembly.md',
  },
  {
    slug: 'document-policy-comparison-workbench-method',
    title: 'Document/Policy Comparison (Workbench Method)',
    shortDescription:
      'Compare two versions of a document and classify material changes, or (Regulatory Impact mode) check a new external rule against a corpus of internal documents to see which are affected.',
    quickHelp:
      'Document/Policy Comparison classifies changes between two document versions as material, clarifying, or administrative -- or, in Regulatory Impact mode, classifies which internal documents a new rule affects.',
    docFile: 'workbench-handbook-document-policy-comparison.md',
  },
  {
    slug: 'structured-rule-based-review-workbench-method',
    title: 'Structured Rule-Based Review with Human Approval (Workbench Method)',
    shortDescription:
      'Check a submitted item -- an expense claim, a contract, supplier compliance evidence -- against a defined rule set, flagging every violation and ambiguous case for a human to approve or reject.',
    quickHelp:
      'Structured Rule-Based Review flags violations and exceptions against a defined rule set -- it never auto-approves or auto-rejects; a human always makes the final call.',
    docFile: 'workbench-handbook-structured-rule-based-review.md',
  },
  {
    slug: 'reusable-workflow-checklist-generation-workbench-method',
    title: 'Reusable Workflow/Checklist Generation (Workbench Method)',
    shortDescription:
      'Generate a step-by-step, reusable checklist from documented procedures, informed by real notes from prior runs, for recurring cycles like a month-end close.',
    quickHelp:
      'Reusable Workflow/Checklist Generation produces a checklist meant to be run again next cycle, grounded in documented procedure plus real prior-run notes -- not a one-off answer.',
    docFile: 'workbench-handbook-reusable-workflow-checklist-generation.md',
  },
  {
    slug: 'multi-document-comparative-scoring-workbench-method',
    title: 'Multi-Document Comparative Scoring (Workbench Method)',
    shortDescription:
      'Score multiple candidate documents -- vendor proposals, products, tools -- against one fixed common requirement set, so the comparison is fair rather than framed by each candidate\'s own pitch.',
    quickHelp:
      'Multi-Document Comparative Scoring ranks candidates against a fixed requirement set, not against each other\'s own framing -- it surfaces the comparison, a human makes the award decision.',
    docFile: 'workbench-handbook-multi-document-comparative-scoring.md',
  },
  {
    slug: 'structured-incident-failure-investigation-workbench-method',
    title: 'Structured Incident/Failure Investigation (Workbench Method)',
    shortDescription:
      'Investigate a reported failure using a structured framework (e.g. 8D), grounding every step in submitted evidence and flagging any step where evidence is missing rather than filling it in speculatively.',
    quickHelp:
      'Structured Incident/Failure Investigation walks a framework like 8D step by step, grounded in submitted evidence -- missing evidence becomes an open item, never a filled-in guess.',
    docFile: 'workbench-handbook-structured-incident-failure-investigation.md',
  },
  {
    slug: 'multimodal-edge-ai-architecture-placement-workbench-method',
    title: 'Multimodal/Edge AI Architecture Placement (Workbench Method)',
    shortDescription:
      'Determine where each stage of a multimodal pipeline (inference, storage, correlation) should run -- cloud, regional, or edge -- extending Local vs Cloud AI from a single decision to a per-stage one.',
    quickHelp:
      'Multimodal/Edge AI Architecture Placement extends Local vs Cloud AI to a per-pipeline-stage decision -- inference, storage, and correlation can each land in a different tier.',
    docFile: 'workbench-handbook-multimodal-edge-ai-architecture-placement.md',
  },
]

for (const spec of ARTICLES) {
  const { data: existingArticle } = await admin.from('wiki_articles').select('id').eq('slug', spec.slug).maybeSingle()
  if (existingArticle) {
    console.log(`[skip] ${spec.title} already exists (${existingArticle.id})`)
    continue
  }

  const raw = readFileSync(path.join(docsDir, spec.docFile), 'utf8')
  const splitIndex = raw.indexOf('## What it is')
  if (splitIndex === -1) throw new Error(`Could not find "## What it is" in ${spec.docFile}`)
  const content = raw.slice(splitIndex).trim()

  const { data: article, error: articleError } = await admin
    .from('wiki_articles')
    .insert({
      slug: spec.slug,
      title: spec.title,
      category: 'platform_handbook',
      short_description: spec.shortDescription,
      status: 'draft',
      created_by: owner.id,
    })
    .select('id, slug, status')
    .single()
  if (articleError || !article) throw articleError ?? new Error(`Failed to create article ${spec.slug}`)

  const { data: version, error: versionError } = await admin
    .from('wiki_versions')
    .insert({
      wiki_article_id: article.id,
      version_number: 1,
      quick_help: spec.quickHelp,
      content,
      verification_status: 'unverified',
      generated_by: 'human',
      created_by: owner.id,
    })
    .select('id')
    .single()
  if (versionError || !version) throw versionError ?? new Error(`Failed to create version for ${spec.slug}`)

  console.log(`[created] ${article.slug} (article ${article.id}, version ${version.id})`)
}

console.log('\nDone. Review and approve these through the admin Wiki queue, then run scripts/backfill-wiki-embeddings.mjs.')
