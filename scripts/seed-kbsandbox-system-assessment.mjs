// M5F §6: KB Sandbox System Understanding v1 -- the 19 questions verbatim
// from the design note, active immediately since this is a fresh seed.
// Soft-linked to the OpenAPI Discovery workstream as origin, scoped at the
// project level (same interpretive pattern as CareCall's assessment).
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const PROJECT_ID = 'a4107e39-f50e-41ab-83dd-6e41f4c450ac'
const WORKSTREAM_ID = '7880c681-2fd6-4d2d-8309-4cf4c2bb7ee7'

const { data: owner, error: ownerError } = await admin.from('profiles').select('id').eq('email', 'mike.aguilar@gmail.com').single()
if (ownerError || !owner) throw ownerError ?? new Error('mike.aguilar profile not found')

const instructions = `Answer each question based on evidence found in the supplied system/repository.

For each answer:

1. Answer the question directly.
2. Explain how the system implements the behavior.
3. Cite repository evidence using file:line references where possible.
4. Distinguish significant claims as:
   - CONFIRMED
   - INFERRED
   - UNKNOWN
5. Identify gaps, ambiguities or implementation concerns.
6. Do not assume functionality exists merely because it would normally be expected in an application of this type.
7. Do not use another participant's answers or artifacts.

Repository implementation evidence takes precedence over assumptions, documentation claims or expected product behavior.`

const questions = [
  { title: 'User Roles and Permissions', question: 'What user roles exist and what does each role permit?' },
  { title: 'Anonymous Access', question: 'What can anonymous users access?' },
  { title: 'Project Creation and Isolation', question: 'How are Projects created and isolated?' },
  { title: 'Project Membership', question: 'How does project membership work?' },
  { title: 'Knowledge Bases and Projects', question: 'How are Knowledge Bases related to Projects?' },
  { title: 'Wiki Approval and Versioning', question: 'How does Wiki approval/versioning work?' },
  { title: 'Workstreams and Projects', question: 'How are Workstreams related to Projects?' },
  { title: 'Workstream Artifacts', question: 'How are Workstream artifacts represented?' },
  { title: 'System Understanding Assessments', question: 'How do System Understanding assessments work?' },
  { title: 'AI Providers and Models', question: 'How are AI providers and models configured?' },
  { title: 'Independent Generation and Embedding Selection', question: 'How are generation and embedding models selected independently?' },
  { title: 'Evals', question: 'How are Evals created and executed?' },
  { title: 'Graph Runtime vs. Single-Pass', question: 'How does the Graph Runtime differ from a single-pass evaluation?' },
  { title: 'Agent Control', question: 'How are Agents controlled?' },
  { title: 'Project Guardrails', question: 'How are project guardrails represented?' },
  { title: 'Public Information', question: 'What information can be published publicly?' },
  { title: 'Provenance', question: 'How is provenance maintained?' },
  { title: 'Curator Privileges', question: 'What operations require Curator privileges?' },
  { title: 'Admin Privileges', question: 'What operations require Admin privileges?' },
]
questions.push({ title: 'External AI Tool Participation', question: 'How can external AI tools participate in a Workstream?' })
// 20 questions total, all verbatim from design-note §6.

const { data: assessment, error: assessmentError } = await admin
  .from('system_assessments')
  .insert({
    project_id: PROJECT_ID,
    workstream_id: WORKSTREAM_ID,
    name: 'KB Sandbox System Understanding',
    description:
      'Evaluate whether an engineering method understands KB Sandbox\'s own architecture, permissions, and object model after independently examining the repository -- the same discipline KB Sandbox already applies to systems it analyzes (e.g. CareCall), turned on itself.',
    created_by: owner.id,
  })
  .select('id')
  .single()
if (assessmentError || !assessment) throw assessmentError ?? new Error('Failed to create assessment')
console.log(`Created assessment ${assessment.id}`)

const { data: version, error: versionError } = await admin
  .from('system_assessment_versions')
  .insert({
    assessment_id: assessment.id,
    project_id: PROJECT_ID,
    version_number: 1,
    instructions,
    status: 'active',
    created_by: owner.id,
  })
  .select('id')
  .single()
if (versionError || !version) throw versionError ?? new Error('Failed to create version')
console.log(`Created version ${version.id}`)

const { error: questionsError } = await admin.from('system_assessment_questions').insert(
  questions.map((q, i) => ({
    assessment_version_id: version.id,
    project_id: PROJECT_ID,
    sequence: i + 1,
    title: q.title,
    question: q.question,
  }))
)
if (questionsError) throw questionsError
console.log(`Inserted ${questions.length} questions`)

const { error: pointerError } = await admin.from('system_assessments').update({ current_version_id: version.id }).eq('id', assessment.id)
if (pointerError) throw pointerError

console.log(`\nASSESSMENT_ID=${assessment.id}`)
console.log(`VERSION_ID=${version.id}`)
