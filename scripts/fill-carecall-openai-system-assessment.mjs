// One-off: populate the "OpenAI" response to the CareCall System
// Understanding assessment, from the answers the user ran externally and
// pasted verbatim. Content/wording is the participant's own -- only
// reformatted into the answer/evidence split the schema expects, and
// classified per the assessment's own CONFIRMED/INFERRED/UNKNOWN rule
// (OpenAI didn't label each answer explicitly; all ten are backed by
// specific file:line citations, so all are classified CONFIRMED, with
// caveats/gaps folded into the answer text exactly as OpenAI wrote them).
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
  .select('id, sequence')
  .eq('assessment_version_id', VERSION_ID)
  .order('sequence')
if (qError) throw qError
const qId = Object.fromEntries(questions.map((q) => [q.sequence, q.id]))

const answers = [
  {
    seq: 1,
    classification: 'CONFIRMED',
    evidence: 'supabase/migrations/20260705000000_portal_roles.sql:120; supabase/migrations/20260706140000_single_clinic_read.sql:17; web/src/App.tsx:59',
    answer: `CareCall has a multi-clinic data model that can represent multiple client organizations, with each clinic acting as a tenant. Each clinic has its own patients and clinicians; campaigns and campaign results; calling hours and timezone; callback number and SMS settings; appointment-type-to-Telnyx-assistant mappings; and users assigned through app_metadata.clinic_id.

Tenant identity and role are stored in the user's Supabase JWT metadata. PostgreSQL Row-Level Security generally restricts patients, campaigns, providers, appointments, call logs, audit records, and assistant mappings to the user's clinic. Platform Admins can access all clinics (portal_roles.sql:120).

Important limitations:
- The latest migration deliberately lets every authenticated user read every clinics row using using (true). This exposes clinic configuration across tenants, although not necessarily their patients or campaigns (single_clinic_read.sql:17).
- The UI is currently configured as a single-clinic build. The Admin clinic switcher is disabled unless VITE_MULTI_CLINIC is enabled (App.tsx:59).
- Edge Functions use the Supabase service-role key and therefore bypass RLS.
- start-campaign neither validates the bearer token nor checks tenant/role ownership. Anyone able to reach it can supply a campaign ID -- or request a global sweep -- with any bearer-prefixed value. This is a serious cross-tenant authorization weakness.
- Tenant isolation has not been verified through automated multi-tenant tests; no such tests were found.

Conclusion: the schema and most database policies support multiple tenants, but the current build and some privileged endpoints are not safely production-ready for strong multi-client isolation.`,
  },
  {
    seq: 2,
    classification: 'CONFIRMED',
    evidence: 'supabase/functions/assistant-tools/index.ts:62; telnyx/assistant-instructions.md:24',
    answer: `There are several deliberate minimization controls:
- The AI is not given the patient's DOB on file. It receives the DOB stated by the patient, and CareCall compares it server-side. Only match/lockout status is returned (assistant-tools/index.ts:62).
- Slot and booking tools derive the patient and campaign from the call's server-side call_control_id; the AI does not choose a patient ID.
- Before verification, scheduling tools return 403.
- The prompt explicitly says not to reveal DOB, partial matches, medical details beyond the appointment reason, or scheduling information after verification failure (assistant-instructions.md:24).
- Voicemail messages are designed to be PHI-free.
- Public booking context exposes clinic name, appointment-type label, timezone, and link state -- not DOB or full patient identity.
- Booking-link tokens are stored only as SHA-256 hashes.

However, this is minimization rather than anonymization. Telnyx and its AI service still receive: patient phone number to place the call; patient first name; clinic name; free-text campaign context; the DOB spoken by the patient; and the conversation and potentially its transcript/insights.

Important gaps:
- There is no automated PHI redaction or filtering of campaign_context. A staff member could put sensitive clinical information into that free-text field, which is then injected into the AI prompt.
- There is no transcript or summary redaction before storage.
- No code-level data-loss-prevention classifier or minimum-necessary field validator was found.
- Stored audit entries can contain complete patient row JSON, duplicating PHI.
- Vendor BAA, retention, model-training, recording, and regional-processing controls are operational matters and are not enforced by this repository.
- The privacy restrictions in the prompt are partly behavioral instructions to a hosted AI, not deterministic enforcement.`,
  },
  {
    seq: 3,
    classification: 'CONFIRMED',
    evidence: 'web/src/pages/CampaignDetail.tsx:119; web/src/pages/CallHistory.tsx:18',
    answer: `CareCall provides several reporting views.

The campaign detail page shows: total assigned patients; booked; pending (including patients awaiting a pre-call SMS delay); unreached; needs review; booking-rate percentage; patient-level status; attempt count; last attempt time; flag/review reason. It also provides a debug call-log view showing answering-machine result, whether identity was verified, verification-attempt count, call result, and call duration (CampaignDetail.tsx:119).

Call History adds patient, campaign, result, duration, AI-generated summary, and stored transcript (CallHistory.tsx:18).

Possible result/status values include: booked, declined, callback_requested, no_answer, voicemail, wrong_number, verification_failed, needs_human, transferred, error, and operational states such as pending, notified, calling, and resolved.

The data comes from three main sources: (1) campaign_patients, updated by the dialer, assistant tools, booking link, webhooks, and review UI; (2) call_logs, populated at dial time and updated by Telnyx events, assistant tools, and Insights payloads; (3) campaign_stats, a PostgreSQL aggregate view over campaigns and campaign-patient statuses.

The Insights-derived summary, transcript, and fallback outcome are less certain because the code accepts several possible Telnyx payload shapes without a checked-in authoritative schema.`,
  },
  {
    seq: 4,
    classification: 'CONFIRMED',
    evidence: 'web/src/lib/session.tsx:80',
    answer: `CareCall has three internal roles.

Admin -- a platform-wide administrator can: view data across clinics; create and configure clinics; select clinic context when multi-clinic mode is enabled; create Admin, Provider/Clinic Admin, and Staff accounts; change roles and clinic assignments; reset, deactivate, and reactivate users; view platform-wide reporting and audit data; and perform all Clinic Admin functions.

Clinic Admin, displayed as "Provider" -- the internal role is clinic_admin, but the UI label is "Provider" (session.tsx:80). Within their clinic this role can: view patients, campaigns, results, call history, and appointments; add and modify patients; create and edit campaigns; assign patients to campaigns; start, pause, and resume campaigns; configure clinicians and availability; configure clinic calling hours, timezone, callback/SMS settings, and assistant mappings; create Staff accounts; reset/deactivate/reactivate own-clinic Staff accounts; and review audit activity. It cannot create Admin or peer Clinic Admin accounts or modify other clinics.

Staff can generally: view their clinic's dashboard; view patients and patient details; view campaigns and results; view call history, summaries, and transcripts; use the human review queue; mark flagged cases resolved; requeue flagged cases; remove a patient from a campaign; and mark a patient do-not-call. Staff are restricted by RLS from editing patients, providers, clinic settings, and campaigns.

One significant exception is campaign initiation: the campaign detail UI shows "Start calling" without checking canManage, and start-campaign has defective server authorization. Therefore Staff -- and potentially unauthenticated parties -- may be able to initiate an already-active campaign despite the intended role model.`,
  },
  {
    seq: 5,
    classification: 'CONFIRMED',
    evidence: 'telnyx/tools.json:1',
    answer: `Configured in Telnyx: purchased telephone number; Call Control Application; Call Control webhook destination; AI Assistant definitions; assistant voice/model settings; the assistant's system instructions/personality; registered webhook tools; tool shared-secret header configuration; Messaging Profile; post-call Insights/transcript webhook configuration. The repository includes instructions and tool definitions that an operator must copy/register in Telnyx (tools.json:1).

Configured in CareCall: clinics and users; patients, phone numbers, consent, and do-not-call status; providers and weekly availability; campaign membership; appointment type, slot length, provider, schedule, and greeting context; calling hours and timezone; pre-call SMS lead time and fallback behavior; appointment-type-to-Telnyx-assistant ID mapping; per-campaign snapshot of the selected assistant ID; call queue state and retry timing; identity-verification result; slot generation and appointment creation; reporting, review, and audit records.

At call time, CareCall asks Telnyx to place the call with premium AMD. When Telnyx reports a live human, CareCall tells Telnyx which assistant to start and provides dynamic variables. Telnyx runs the conversation; its tools call back into CareCall for verification, slots, booking, and outcomes.`,
  },
  {
    seq: 6,
    classification: 'CONFIRMED',
    evidence: 'telnyx/assistant-instructions.md:1',
    answer: `The primary prompt is assistant-instructions.md:1. It defines the assistant as "Sarah," with a warm, professional, concise scheduling style. It specifies greeting behavior; mandatory identity verification; progressive slot presentation; explicit booking confirmation; non-pressuring decline handling; human escalation; privacy restrictions; and call-duration guidance.

This file is not loaded dynamically by CareCall. Its instructions say to paste the content into the Telnyx Assistant's Instructions field.

Variation is possible in two ways: a clinic can map each appointment type to a different Telnyx Assistant ID; and a campaign snapshots the matching assistant ID when it is created and supplies a campaign-specific greeting_context.

Therefore personality and full prompt behavior can vary by clinic and appointment type if different Telnyx assistants are configured. A campaign can vary the reason/context, but CareCall has no editor for the assistant's complete prompt or personality. Campaign-specific prompt changes beyond greeting_context require selecting or changing a Telnyx assistant.`,
  },
  {
    seq: 7,
    classification: 'CONFIRMED',
    evidence: 'supabase/functions/_shared/lib.ts:35; supabase/functions/telnyx-call-events/index.ts:49',
    answer: `There are two different security postures.

AI tool webhooks: assistant-tools requires an x-carecall-secret header equal to the TOOL_WEBHOOK_SECRET environment value -- a static shared secret (_shared/lib.ts:35). It provides basic authentication but has no visible cryptographic request signature, timestamp/replay protection, per-assistant credentials, rotation workflow, rate limit, or constant-time comparison.

Call-event and Insights webhook: telnyx-call-events performs no authentication or signature verification. It parses the submitted JSON and processes it (telnyx-call-events/index.ts:49). Nothing in the implementation prevents an unauthorized party from submitting fabricated events. Depending on the payload and known identifiers, forged submissions could change call logs or patient campaign states; inject transcripts or summaries; trigger assistant start, speech, SMS, or hangup actions; or cause incorrect no-answer/voicemail results.

The README itself identifies Telnyx Ed25519 signature verification as required hardening. This is a confirmed security gap.`,
  },
  {
    seq: 8,
    classification: 'CONFIRMED',
    evidence: 'supabase/functions/admin-manage/index.ts; supabase/functions/start-campaign/index.ts',
    answer: `RBAC is real and is not only a UI concept. Enforcement exists at several layers: (1) UI route and control guards -- roleAtLeast hides or redirects management screens; (2) database RLS -- PostgreSQL policies use JWT app_metadata.role and clinic_id to control table operations; (3) admin-manage handler -- revalidates the JWT using Supabase Auth and applies action-specific role and target-scope checks; (4) Supabase gateway -- JWT verification is enabled for admin-manage; (5) service-layer checks -- assistant tools require verification before slot discovery or booking.

Incomplete or concerning areas include: start-campaign only checks that the header begins with "Bearer "; Telnyx event ingestion is unauthenticated; Staff can write campaign_patients by design, including deletion and status changes; appointments_write RLS does not require Clinic Admin -- any authenticated user with provider-scope access could write through PostgREST, although the current frontend does not do so; all authenticated users can read all clinic rows under the latest single-clinic migration; Avatar Storage write policies check the bucket but not ownership/path; UI controls cannot compensate for the privileged endpoint defects because Edge Functions use service-role access and bypass RLS.`,
  },
  {
    seq: 9,
    classification: 'CONFIRMED',
    evidence: 'web/src/pages/Review.tsx:40',
    answer: `There is a supported selective retry workflow, but it is incomplete.

For needs_human and verification_failed cases, the Review Queue lets a user: inspect the patient, campaign, and reason; edit patient information through the patient page if their role permits it; requeue only that patient by changing their status to pending; mark the issue resolved; remove the patient from the campaign; mark the patient do-not-call and remove them from active campaigns. The requeue implementation affects only the selected campaign-patient row -- patients already marked booked, declined, or otherwise successful are not reset, so they are not called again (Review.tsx:40). Callbacks also re-enter the dial queue automatically after callback_after.

Limitations: the Review Queue includes only needs_human and verification_failed; no_answer, voicemail, wrong_number, and general errors are not surfaced there for one-click requeue. There is no bulk "retry all unsuccessful" filter/action. Requeue does not reset the attempts counter. No explicit maximum-attempt policy is enforced for ordinary retries. If the campaign has auto-completed, a Clinic Admin must reactivate it before the requeued patient can be processed. Staff can requeue cases but normally cannot change campaign/provider/clinic configuration. Editing the assistant mapping does not automatically change an existing campaign's snapshotted assistant ID. There is no transactional workflow combining "fix data, requeue, and restart" -- those are separate actions.`,
  },
  {
    seq: 10,
    classification: 'CONFIRMED',
    evidence: 'get_available_slots (PostgreSQL function, referenced); assistant-tools get_appointment_slots / create_appointment',
    answer: `The intended path: provider weekly availability is stored in provider_availability; CareCall's get_available_slots PostgreSQL function generates candidate slots for upcoming dates; it removes times overlapping existing booked or confirmed appointments; the provider comes from the campaign, falling back to the patient's assigned provider; after identity verification, the AI calls get_appointment_slots; for voice calls, CareCall returns at most three available days; after the patient chooses a day, it returns at most three concrete times with speech-ready text; the prompt requires the AI to present only returned times and obtain explicit confirmation; the AI sends the exact slot_start to create_appointment; CareCall creates the appointment and updates the campaign-patient and call-log results to booked.

The public booking-link path uses the same conceptual slot engine but presents up to ten days and all available times for the selected day.

Concurrency protections include: idempotency keys for retrying the same booking request; a PostgreSQL exclusion constraint preventing provider time overlap; a unique constraint preventing one patient from holding multiple active appointments for the same campaign; conflict responses that cause the AI/UI to fetch fresh options.

Two implementation concerns are material: the Edge Functions pass p_tz, but the only checked-in SQL definition of get_available_slots does not accept that parameter -- a referenced timezone migration is missing, so slot retrieval may fail unless the deployed database contains an untracked overload; and create_appointment accepts a submitted slot_start but does not independently verify that it was one of the generated availability options -- database constraints prevent overlap, but they do not prove the time falls within configured provider availability.`,
  },
]

const { data: response, error: responseError } = await admin
  .from('assessment_responses')
  .upsert(
    {
      assessment_version_id: VERSION_ID,
      project_id: PROJECT_ID,
      participant_label: 'OpenAI',
      external_tool: 'ChatGPT / OpenAI',
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
