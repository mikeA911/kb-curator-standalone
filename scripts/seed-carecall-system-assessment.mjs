// One-off: seed CareCall System Understanding v1 (the design note's own
// section 7 questions), active immediately since this is a fresh seed with
// no prior review step needed. Soft-linked to the Claude Code workstream
// as its origin, but spans both workstreams -- participants are matched by
// participant_label, not workstream_id.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const PROJECT_ID = '6c11785b-695f-4ae7-b3a8-e3183f489701'
const CLAUDE_WORKSTREAM_ID = '1263cb02-4c12-4597-a962-85464d99e7de'

const { data: owner, error: ownerError } = await admin.from('profiles').select('id').eq('email', 'test-curator@kbsandbox.local').single()
if (ownerError || !owner) throw ownerError ?? new Error('test-curator profile not found')

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
  {
    title: 'Multi-client / Tenant Isolation',
    question:
      "Does CareCall support multiple client organizations? If so, how are clients configured, and what mechanisms prevent one client from viewing or modifying another client's patients, campaigns, configuration or results?",
  },
  {
    title: 'PII / PHI Protection When Using AI',
    question:
      'CareCall handles healthcare-related information. What controls exist to prevent PII or PHI from being unnecessarily sent to an AI model or external AI service? Identify where anonymization, filtering, minimization or other safeguards are implemented, and identify any gaps.',
  },
  {
    title: 'Campaign Reporting',
    question:
      'What reporting or results functionality exists for completed or active campaigns? What campaign outcomes can a user review, and where does the underlying result data come from?',
  },
  {
    title: 'User Roles and Permissions',
    question: 'What user roles exist in CareCall? For each role, what can the user view, configure, initiate, modify or administer?',
  },
  {
    title: 'Telnyx vs. CareCall Configuration',
    question: 'Which parts of the calling workflow are configured in Telnyx, and which are configured within CareCall? Explain the boundary between the two systems.',
  },
  {
    title: 'Conversational AI Personality and Instructions',
    question: "Where and how are the conversational AI's personality, behavior, instructions or prompt configured? Can this vary by client or campaign?",
  },
  {
    title: 'Telnyx Webhook Security',
    question:
      'CareCall receives webhook/event data from Telnyx during or after calls. How are those endpoints authenticated or verified? What prevents an unauthorized party from submitting fabricated webhook events?',
  },
  {
    title: 'Role-Based Access Control',
    question:
      'Is RBAC actually implemented, or are roles primarily a UI concept? Identify where authorization is enforced—in application code, middleware, database/RLS policies or elsewhere—and highlight areas where enforcement appears incomplete.',
  },
  {
    title: 'Retrying Unsuccessful Campaign Cases',
    question:
      'After reviewing campaign results, can a user identify unsuccessful patients/cases, change relevant configuration or data, and rerun the campaign for only those cases without repeating successful ones? Describe the supported workflow and limitations.',
  },
  {
    title: 'Appointment-Slot Presentation and Selection',
    question:
      'How does CareCall determine available appointment slots, and how are those slots presented to the patient during booking? Describe the path from availability retrieval through conversational presentation to final appointment selection.',
  },
]

const { data: assessment, error: assessmentError } = await admin
  .from('system_assessments')
  .insert({
    project_id: PROJECT_ID,
    workstream_id: CLAUDE_WORKSTREAM_ID,
    name: 'CareCall System Understanding',
    description:
      "Evaluate whether an engineering method understands CareCall's architecture, security, configuration and operational workflows after independently examining the repository.",
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

console.log(`\nDone. Assessment: /projects/${PROJECT_ID}/assessments/${assessment.id}`)
