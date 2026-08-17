// One-off: populate the "Grok" response to the CareCall System
// Understanding assessment, from the answers the user ran externally and
// pasted verbatim. Several of Grok's answers were HTML/markdown tables
// whose column structure was lost in the paste (cells ran together with
// no separators) -- those are reflowed into plain bullet lists below,
// preserving every fact stated, without changing Grok's own conclusions.
// All ten are backed by specific file/table/function citations, so all
// are classified CONFIRMED per the assessment's own confidence rule,
// with caveats folded into the answer text as Grok wrote them.
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
    evidence: 'clinics table; admin-manage (create_clinic); SQL helpers jwt_role()/jwt_clinic_id()/is_admin()/is_clinic_admin(); RLS policies on clinic-scoped tables; VITE_MULTI_CLINIC flag',
    answer: `Yes -- multi-clinic (tenant) isolation is implemented.

How clients are configured: rows in the clinics table. Admins create clinics via admin-manage (create_clinic). Clinic-scoped tables (patients, campaigns, providers, call_logs, etc.) carry a required clinic_id.

How isolation works: user role and clinic_id live in auth.users.app_metadata (written only by admin-manage, not client-writable). SQL helpers jwt_role(), jwt_clinic_id(), is_admin(), is_clinic_admin() back Postgres RLS policies that scope SELECT/INSERT/UPDATE by is_admin() OR clinic_id = jwt_clinic_id() (with stricter write rules for clinic admins on some tables). Edge Functions that mutate admin data check role/clinic in application code (admin-manage). Dialer/tools use the service role (bypass RLS) but thread clinic_id from campaign/call context.

Limitation: platform admin can see all clinics -- cross-clinic isolation for non-admins is the intended guard. The VITE_MULTI_CLINIC feature flag can hide the clinic switcher in the UI while the schema still supports multiple clinics.`,
  },
  {
    seq: 2,
    classification: 'CONFIRMED',
    evidence: 'assistant-tools verify_patient; telnyx-call-events (dynamic_variables); booking-api context action; booking token SHA-256 hashing',
    answer: `Controls present in code:
- DOB never sent to the model -- assistant-tools verify_patient: AI sends stated DOB; server compares and returns only match / locked / remaining_attempts.
- Dynamic variables to the AI are limited -- telnyx-call-events injects patient_first_name, campaign_context, clinic_name only, not DOB, full name, phone, or record IDs beyond call context.
- Progressive slot disclosure -- at most 3 days then 3 times, speech-ready strings, so the model should not invent times.
- Voicemail path is PHI-free -- fixed callback message + optional SMS; AI is not started on the machine-answer path.
- Booking link pre-verify minimization -- public booking-api context returns clinic name, appointment-type label, and state, not patient name/DOB, until verify succeeds (then first name only).
- Token at rest -- booking tokens stored as SHA-256 hashes.

Gaps:
- Transcripts/summaries from Telnyx Insights are stored on call_logs and shown in portal Call History -- those can contain conversational PHI after the call.
- Pre-call/voicemail SMS can include first name and clinic name (and optionally a booking link).
- Telnyx (and any recording/insights pipeline) is an external processor; BAAs are noted in the README as a production requirement, not enforced in code.
- Service-role Edge Functions can read full patient rows server-side (necessary for verify/book); the protection is "don't return PHI to the model," not "never load PHI on the server."`,
  },
  {
    seq: 3,
    classification: 'CONFIRMED',
    evidence: 'Dashboard; campaign detail (campaign_stats); Review queue; Call History; Patient detail; campaign_patients, call_logs tables; campaign_stats view; telnyx-call-events (Insights path)',
    answer: `What exists:
- Dashboard -- counts (patients on file, in campaign, needs review), live-ish activity, recent calls with result/summary.
- Campaign detail -- pulls campaign_stats (totals, pending, booked, declined, unreached, needs_human, booking_rate_pct).
- Review queue -- patients flagged for human follow-up (needs_human, verification failures, etc.) with reasons.
- Call History -- per-call result, AMD result, duration, AI summary, transcript, recording URL when present.
- Patient detail -- that patient's call history.

Where data comes from: operational tables campaign_patients (status machine) and call_logs (result, summary, transcript, amd_result, recording_url, verified, duration); the campaign_stats aggregate view (defined in migrations); and the Insights path (Telnyx Insights webhook -> telnyx-call-events -> updates call_logs summary/transcript, outcome only if the result was still empty).

There is no separate analytics/export product surface beyond these portal views and underlying tables.`,
  },
  {
    seq: 4,
    classification: 'CONFIRMED',
    evidence: 'JWT app_metadata.role/clinic_id; admin-manage role matrix; RLS on clinic-scoped tables',
    answer: `Roles (CONFIRMED): admin | clinic_admin | staff, stored in JWT app_metadata.role (+ clinic_id for non-admins).
- admin -- all clinics; create clinics; create any role; set roles; full user admin; see all clinic-scoped data via RLS.
- clinic_admin -- own clinic only; create staff only; reset/deactivate staff in own clinic; clinic-scoped config/data writes where policies allow.
- staff -- own clinic read/participate (run campaigns, patients, review within RLS); not user/clinic admin actions.

Enforcement is not UI-only: DB RLS on clinic-scoped tables; the admin-manage Edge Function's role matrix for user/clinic admin actions; the UI hides actions by role, but DB/function checks are the real boundary.

start-campaign only checks that a Bearer token is present (no role check inside that function) -- see Q8.`,
  },
  {
    seq: 5,
    classification: 'CONFIRMED',
    evidence: 'telnyx/assistant-instructions.md; telnyx/tools.json; telnyx-call-events (webhook target); dial-path AMD setting; call_logs storage',
    answer: `Configured in Telnyx: phone number, Call Control Application, and the webhook URL target (telnyx-call-events); the AI Assistant resource(s), voice, and assistant instructions (pasted from telnyx/assistant-instructions.md); tool webhook registration pointing at assistant-tools plus the shared secret header; the messaging profile (for SMS transport); the Insights/transcript webhook target (same events URL).

Configured in CareCall: campaign definitions, patient lists, DNC/active status, clinic calling hours; the premium AMD setting requested on the dial path (CareCall requests answering_machine_detection: "premium" when dialing); the queue/status machine, pre-call SMS lead time, self-booking flags, slot length, and provider calendars; which patients get SMS (consent), SMS copy assembly, and booking link minting; storage of results on call_logs and portal display.

Boundary: Telnyx owns telephony, AMD classification, AI runtime, and message transport. CareCall owns who to call, when, business rules, verification/booking truth, and persistence/reporting. CareCall starts the assistant only after AMD human-class results and supplies limited dynamic variables.`,
  },
  {
    seq: 6,
    classification: 'CONFIRMED',
    evidence: 'telnyx/assistant-instructions.md; telnyx/tools.json; dynamic_variables at assistant start; campaigns.telnyx_assistant_id; appointment_type_assistants migration',
    answer: `Primary config location: telnyx/assistant-instructions.md -- pasted into the Telnyx AI Assistant instructions in the Telnyx console (not executed from the repo at runtime). Tools: telnyx/tools.json defines webhook tools registered on that assistant.

Per-call runtime injection: patient_first_name, campaign_context, clinic_name via dynamic_variables when starting the assistant.

Per-campaign assistant override: campaigns can store telnyx_assistant_id; the dial path prefers that over the global TELNYX_ASSISTANT_ID. The schema also supports an appointment-type -> assistant mapping (appointment_type_assistants migration).

So personality/prompt can vary by clinic/campaign if you configure multiple Telnyx assistants and point campaigns at them. Variation is operational (Telnyx + campaign fields), not a free-form prompt editor inside the portal in the code reviewed.`,
  },
  {
    seq: 7,
    classification: 'CONFIRMED',
    evidence: 'supabase/functions/telnyx-call-events/index.ts; supabase/config.toml (verify_jwt=false); README hardening note; contrast with assistant-tools x-carecall-secret',
    answer: `Current implementation: endpoint POST .../functions/v1/telnyx-call-events; gateway verify_jwt = false; the function performs no Telnyx signature verification and always returns { ok: true } (200) so Telnyx does not retry forever. The README explicitly lists webhook signature verification (telnyx-signature-ed25519) as pre-production hardening.

What prevents fabricated events today? Essentially obscurity of the URL and any network controls added outside the app. An unauthorized client that can POST to that URL can inject events. This is a confirmed gap. (Contrast: assistant-tools requires x-carecall-secret.)`,
  },
  {
    seq: 8,
    classification: 'CONFIRMED',
    evidence: 'Postgres RLS (is_admin()/jwt_clinic_id()/is_clinic_admin()); admin-manage application code; start-campaign (Bearer presence only, no getCaller/role check)',
    answer: `RBAC is real, multi-layered -- with one notable hole.
- Postgres RLS -- clinic isolation and many write rules via is_admin() / jwt_clinic_id() / is_clinic_admin().
- admin-manage application code -- fine-grained admin actions (create user, set role, password reset, deactivate, create clinic).
- UI -- hides controls the role should not see.

Incomplete enforcement: start-campaign requires Authorization: Bearer … but does not call getCaller or check role. Any bearer that passes the function's presence check can trigger dialing (including intended cron/service-role use) -- this is weaker than portal role expectations. Edge Functions that use the service role bypass RLS by design; correctness depends on those functions applying clinic/patient filters themselves (they generally do for dial/tools/booking).

So: RBAC is implemented, not merely cosmetic, but not uniformly applied to every Edge Function.`,
  },
  {
    seq: 9,
    classification: 'CONFIRMED',
    evidence: 'campaign_patients.status machine; dialer selection logic (pending/callback_requested, DNC/inactive exclusion, calling hours); callback_after re-entry',
    answer: `Supported by the status machine more than by a dedicated "rerun failed only" wizard.

Each patient in a campaign has a campaign_patients.status (pending, notified, calling, booked, declined, callback_requested, no_answer, voicemail, wrong_number, verification_failed, needs_human, resolved, ...). The dialer selects pending and callback_requested (when callback_after has passed), excludes DNC/inactive, and respects calling hours. Successful booked patients are not redialed by that queue logic. Unreached outcomes (no_answer, voicemail) can be moved back into the queue by staff (e.g. status/callback adjustments in review/patient flows -- exact UI edit paths depend on page implementations). callback_requested intentionally re-enters after callback_after. A campaign can remain active or be restarted, and auto-completes when the in-flight queue empties.

Limitations: no single documented "select all failures and retry" API distinct from editing statuses and keeping the campaign active / invoking start-campaign again. Attempt counters / stale-notified recovery can force needs_human after repeated failures. Changing slots/providers/hours affects future availability; already-booked appointments are protected by DB constraints (idempotency / exclusion / one-active-per-campaign).`,
  },
  {
    seq: 10,
    classification: 'CONFIRMED',
    evidence: 'get_available_slots RPC (provider schedule + existing appointments + p_tz); assistant-tools get_appointment_slots/create_appointment; booking-api slots/book',
    answer: `Path (shared truth for voice and web): availability source is the Postgres RPC get_available_slots (provider schedule + existing appointments + clinic timezone p_tz).

Voice (AI tools): requires verify_patient success first (else 403). get_appointment_slots with granularity: "days" returns up to 3 days with spoken labels. Then granularity: "times" + on_date returns up to 3 times with spoken strings (e.g. "Tuesday, July 7th at 10:00 AM"). The patient confirms; the AI calls create_appointment with the exact slot_start. The server inserts the appointment with an idempotency key and handles slot-taken (23P01) and already-booked (23505).

Web self-booking (booking-api): after token + DOB verify, slots can show up to 10 days and all times for a chosen day (screen, not speech). book uses the same RPC rules and constraints; success flips campaign_patients to booked (removes from dialer).

Presentation principle: the model/UI should only offer slots returned by the server; progressive disclosure on voice reduces invention risk.`,
  },
]

const { data: response, error: responseError } = await admin
  .from('assessment_responses')
  .upsert(
    {
      assessment_version_id: VERSION_ID,
      project_id: PROJECT_ID,
      participant_label: 'Grok',
      external_tool: 'Grok',
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
