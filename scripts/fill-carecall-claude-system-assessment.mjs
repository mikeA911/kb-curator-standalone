// One-off: populate the "Claude Code" response to the CareCall System
// Understanding assessment as a worked example, using evidence pulled
// directly from the five already-imported Claude workstream artifacts
// (capability inventory, endpoint inventory, openapi.yaml, findings,
// evidence map). Answers follow the assessment's own instructions:
// direct answer, implementation explanation, file:line evidence,
// CONFIRMED/INFERRED/UNKNOWN classification, and explicit gaps -- no
// assumed functionality, nothing borrowed from another participant.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const VERSION_ID = 'eb9262b4-3d73-433d-930e-f35423ced945'
const PROJECT_ID = '6c11785b-695f-4ae7-b3a8-e3183f489701'

const { data: owner, error: ownerError } = await admin.from('profiles').select('id').eq('email', 'test-curator@kbsandbox.local').single()
if (ownerError || !owner) throw ownerError ?? new Error('test-curator profile not found')

const { data: questions, error: qError } = await admin
  .from('system_assessment_questions')
  .select('id, sequence, title')
  .eq('assessment_version_id', VERSION_ID)
  .order('sequence')
if (qError) throw qError
const qId = Object.fromEntries(questions.map((q) => [q.sequence, q.id]))

const answers = [
  {
    seq: 1,
    classification: 'CONFIRMED',
    evidence: 'supabase/functions/admin-manage/index.ts L113-204, L72-84; supabase/functions/start-campaign/index.ts L88-130; supabase/migrations/20260705000000_portal_roles.sql',
    answer: `CareCall's tenant unit is the "clinic," not a separate client/organization concept layered on top -- administration and RLS are scoped by clinic_id. admin-manage's create_user/reset_password/deactivate_user actions enforce clinic-admin-limited-to-staff/own-clinic checks in code (admin-manage L113-204, requireTargetInScope L72-L84). Roles and clinic_id live only in auth.users.app_metadata, written server-side. Data-layer isolation is implemented via Postgres RLS driven by helper functions such as jwt_clinic_id() referenced in the portal-roles migration, but the full RLS policy matrix was not line-by-line re-audited in this pass.

CONFIRMED that clinic scoping exists and is enforced at the admin-action layer; INFERRED (not fully re-verified) that every table's RLS policy actually enforces clinic isolation on every read/write path.

Gap: start-campaign itself performs no clinic or role check at all -- it only requires a Bearer token be present. Whether this is by design (cron uses a service-role Bearer) or a real gap is UNKNOWN from the repository evidence alone.`,
  },
  {
    seq: 2,
    classification: 'CONFIRMED',
    evidence: 'supabase/functions/assistant-tools/index.ts L82-107; supabase/functions/telnyx-call-events/index.ts L136-178; supabase/functions/booking-api/index.ts (context/verify actions)',
    answer: `Several concrete safeguards are implemented. In assistant-tools, verify_patient compares the caller-stated date of birth against the record server-side and never returns the real DOB to the model (L82-107). The Telnyx webhook's machine-answer path plays a scripted, PHI-free callback message rather than exposing patient details (L136-178). The public booking API's "context" action is intentionally PHI-minimal, and the generic {state: "expired"} response for invalid/expired tokens avoids giving an attacker an oracle to distinguish real patients from bad tokens.

Gaps: the artifacts don't establish a single, systemic PII/PHI minimization policy applied uniformly before every LLM/AI call -- the safeguards found are point checks embedded in specific handlers (verify_patient, machine-path message) rather than one enforced boundary. The AI Assistant's own prompt/instruction content (telnyx/assistant-instructions.md) was referenced as existing but its actual text controlling PHI handling in conversation was not reproduced or audited, so whether the assistant is instructed to avoid soliciting/repeating PHI beyond DOB verification is UNKNOWN from this evidence.

Classification: CONFIRMED for the specific mechanisms found; UNKNOWN for a systemic PHI-minimization policy across all AI-facing text.`,
  },
  {
    seq: 3,
    classification: 'UNKNOWN',
    evidence: 'carecall-capability-inventory.md Capability 6; supabase/functions/start-campaign/index.ts (call_logs/campaign_patients writes); web/src/lib/supabase.ts, web/src/pages/* (not further inspected)',
    answer: `This is not well covered by the five artifacts, which focus on the Edge Function API surface and explicitly decline to expand portal PostgREST access into synthetic REST operations. Capability 6 in the capability inventory states the staff portal reads/writes patients, campaigns, campaign_patients, appointments, call_logs, providers, clinics, and a review queue via the Supabase JS client under RLS, but no specific reporting screen, aggregation, or metric was inventoried -- table-level PostgREST access is explicitly called out as out of scope for inventing OpenAPI paths.

The underlying result data for any reporting view would come from call_logs, campaign_patients, and appointments, since those are the tables the Edge Functions write to during dialing (dialPatient + call_logs, hangup finalize/no_answer). But the actual reporting UI, its filters, or how outcomes are aggregated/presented were not inspected in this pass.

Classification: UNKNOWN -- evidence establishes the underlying data tables but not the reporting functionality/UI itself, which sits in frontend page components not covered by this evidence set.`,
  },
  {
    seq: 4,
    classification: 'CONFIRMED',
    evidence: 'supabase/functions/admin-manage/index.ts L34-290; supabase/functions/_shared/lib.ts L55-67; supabase/functions/start-campaign/index.ts L88-130',
    answer: `Three roles are enforced in code: admin, clinic_admin, and staff, stored only in auth.users.app_metadata. admin-manage's action dispatcher enforces a per-action matrix (L113-290): admin can set_role and create_clinic; clinic_admin can create_user/reset_password/deactivate_user/reactivate_user but scoped to staff within their own clinic via requireTargetInScope; any authenticated user can clear_force_password_change for themselves; self-deactivation is explicitly blocked (L240-244).

Beyond admin-manage, role enforcement elsewhere is inconsistent: start-campaign performs no role check at all (any Bearer is accepted), and the assistant/booking surfaces use entirely different authorization models (shared secret, opaque token) rather than the three-role system. Portal-side RLS presumably also encodes some version of this role matrix via SQL helper functions (is_admin(), jwt_clinic_id()), but that policy set was not independently re-verified in this pass.

Classification: CONFIRMED for the admin-manage role matrix; INFERRED for RLS enforcing the same roles across portal tables (not re-audited); explicitly not enforced (a gap, not an unknown) for start-campaign.`,
  },
  {
    seq: 5,
    classification: 'CONFIRMED',
    evidence: 'telnyx/tools.json; supabase/functions/telnyx-call-events/index.ts; supabase/functions/assistant-tools/index.ts',
    answer: `Telnyx owns call transport and AI voice execution -- the AI Assistant's registered tool contracts (names, URLs, parameters, the shared-secret header) are configured in telnyx/tools.json, and call routing/AMD detection is a Telnyx Call Control feature CareCall merely reacts to via webhooks. CareCall owns everything downstream of that: the campaign/dial-queue logic (start-campaign), what happens once a call connects (telnyx-call-events' event switch -- human-class vs. machine-class handling, SMS, hangup finalization), the tool implementations themselves that Telnyx's assistant calls back into (assistant-tools -- DOB verification, slot lookup, booking, outcome recording), and the public self-service booking flow (booking-api).

In short: Telnyx is configured with where to call (via webhook targets) and what tools exist (via tools.json); CareCall's Edge Functions hold all of the actual business logic, state, and data. The exact assistant prompt/personality configuration lives in telnyx/assistant-instructions.md, referenced as existing but whose content and deployment path (dashboard vs. API-managed) was not directly inspected.

Classification: CONFIRMED for the functional boundary; UNKNOWN for exactly how/where the Telnyx-side assistant configuration is deployed/versioned.`,
  },
  {
    seq: 6,
    classification: 'UNKNOWN',
    evidence: 'telnyx/assistant-instructions.md (referenced, not inspected); supabase/functions/telnyx-call-events/index.ts (dynamic variables passed at assistant start)',
    answer: `A file telnyx/assistant-instructions.md is referenced as the source for the AI assistant's behavior/instructions, but its actual contents were not reproduced or examined in any of the five artifacts -- only that the file exists and is treated as the tool/behavior source.

There is no evidence in these artifacts of a per-client or per-campaign variation mechanism (e.g. a database column or template substitution feeding different instruction text per clinic/campaign into Telnyx) -- the tool contracts in tools.json are static and global, and nothing in the discovered Edge Function code dynamically constructs or selects assistant instruction text. Dynamic variables are passed to the assistant at call start on premium AMD human-class results, which could plausibly carry per-clinic or per-campaign context into the conversation, but whether that includes personality/instruction changes versus just data variables (patient name, clinic name) is UNKNOWN from this evidence.

Classification: UNKNOWN -- the instructions file's existence and use as the tool source is CONFIRMED, but its content and whether/how it varies by client or campaign is not established by any of the five artifacts.`,
  },
  {
    seq: 7,
    classification: 'CONFIRMED',
    evidence: "supabase/functions/telnyx-call-events/index.ts (entire file, esp. L231 'always 200'); supabase/config.toml (verify_jwt=false); README hardening section (referenced)",
    answer: `telnyx-call-events has no signature verification and no authentication of any kind -- confirmed by the absence of any signature/secret check across the entire file, and the endpoint always returns HTTP 200 regardless of payload validity, specifically to avoid Telnyx retry storms. This means any party who can reach the public URL and send a POST with a plausible Telnyx-shaped JSON body can inject fabricated call events -- there is nothing in code preventing it. The gateway's verify_jwt is also false for this function, so there is no platform-level JWT gate either.

The README is cited as already documenting this as a known pre-production hardening gap, meaning the team is aware of it but it has not been remediated as of this analysis.

Classification: CONFIRMED -- the single most consistently and strongly evidenced concern across all five artifacts, verified by absence across the full file rather than inference.`,
  },
  {
    seq: 8,
    classification: 'CONFIRMED',
    evidence: 'supabase/functions/admin-manage/index.ts L113-290; supabase/functions/start-campaign/index.ts L88-130; supabase/migrations/20260705000000_portal_roles.sql (referenced, not fully re-audited)',
    answer: `RBAC is a mix of real enforcement and gaps, not purely a UI concept, but it's also not uniformly enforced. Where it is enforced: admin-manage has an explicit, code-level role matrix checked server-side per action -- genuine authorization, not merely hidden UI buttons.

Where it is not enforced: start-campaign, despite being invoked from the portal UI, performs no role or clinic check at all -- any request with an Authorization header whose value starts with a Bearer prefix is accepted. This is a concrete example of a capability that a role-gated UI exposes but which the underlying API does not actually re-enforce -- exactly the "RBAC is a UI concept" failure mode, present on at least one surface.

Database-layer RLS is asserted to encode role/clinic logic (portal-roles migration, is_admin()/jwt_clinic_id() helpers) but the full policy set was not independently re-audited row-by-row in this pass.

Classification: CONFIRMED that RBAC is real (not purely UI) for admin-manage; CONFIRMED (as a gap) that start-campaign lacks equivalent enforcement despite portal UI implying role-gating; INFERRED/not fully audited for the database RLS layer.`,
  },
  {
    seq: 9,
    classification: 'UNKNOWN',
    evidence: 'supabase/functions/assistant-tools/index.ts L239-257 (mark_outcome); supabase/functions/start-campaign/index.ts (sweep/batch logic); web/src/pages/CampaignDetail.tsx (referenced, not inspected for retry UI)',
    answer: `None of the five artifacts document a workflow for selectively identifying failed/unsuccessful patients within a campaign, editing just those cases, and re-running only that subset. What is confirmed is the underlying mechanics a retry feature would need: mark_outcome records a small enum of terminal outcomes per patient (declined, callback_requested, wrong_number, needs_human -- L239-257), and campaign_patients status is updated per-patient during dialing.

start-campaign's "sweep" mode processes all still-eligible active patients across active campaigns in a batch, but nothing in the discovered code filters that batch down to "previously unsuccessful patients only" -- sweep/campaign_id dialing appears to operate on the current queue/filter state (DNC/active filters), not on an outcome-based retry selection. Whether the portal UI offers a "retry failed only" affordance on top of these primitives is UNKNOWN -- that would live in frontend page logic these artifacts reference for the "start campaign" button but did not inspect for retry-specific controls.

Classification: UNKNOWN -- the outcome-tracking data model exists (CONFIRMED), but a specific retry-only-failed-cases workflow was not found or ruled out in the evidence gathered.`,
  },
  {
    seq: 10,
    classification: 'CONFIRMED',
    evidence: 'supabase/functions/assistant-tools/index.ts L115-233; supabase/functions/booking-api/index.ts L216-361; carecall-openapi.yaml GetSlotsArgs/CreateAppointmentArgs schemas',
    answer: `Two independent callers reach the same underlying RPC. Inside a live call, assistant-tools' get_appointment_slots requires the patient to be verified first (403 otherwise -- L115-118), then discloses availability progressively rather than dumping a full calendar: a "days" granularity call returns up to 3 candidate days, and a "times" granularity call (for a chosen day) returns up to 3 candidate times, each formatted as a speakable string suitable for the voice assistant to read aloud (L137-168).

Selection is finalized by create_appointment, which takes a single slot_start and books it idempotently -- a repeat request for the same call_control_id + slot_start is treated as the same booking rather than a duplicate, and unique/exclusion constraint violations (Postgres 23P01/23505) are handled as "slot already taken" / "already booked" rather than raw errors (L175-233).

The public booking API (booking-api?action=slots / action=book) calls the same get_available_slots RPC but is documented as offering a wider day range than the voice path, and its book action handles the identical 23P01/23505 race conditions (L216-361). So: one shared source of truth for availability, two presentation layers (speech-constrained progressive disclosure for voice; a fuller web UI) built on the same booking/idempotency guarantees.

Classification: CONFIRMED.`,
  },
]

const { data: response, error: responseError } = await admin
  .from('assessment_responses')
  .upsert(
    {
      assessment_version_id: VERSION_ID,
      project_id: PROJECT_ID,
      participant_label: 'Claude Code',
      external_tool: 'Claude Code',
      model: null,
      repository_ref: 'https://github.com/mikeA911/BAI-POP2',
      status: 'completed',
      created_by: owner.id,
    },
    { onConflict: 'assessment_version_id,participant_label' }
  )
  .select('id')
  .single()
if (responseError || !response) throw responseError ?? new Error('Failed to upsert response')
console.log(`Response ${response.id}`)

const { error: answersError } = await admin.from('assessment_answers').upsert(
  answers.map((a) => ({
    response_id: response.id,
    question_id: qId[a.seq],
    project_id: PROJECT_ID,
    answer: a.answer,
    classification: a.classification,
    evidence: a.evidence,
  })),
  { onConflict: 'response_id,question_id' }
)
if (answersError) throw answersError
console.log(`Upserted ${answers.length} answers`)
