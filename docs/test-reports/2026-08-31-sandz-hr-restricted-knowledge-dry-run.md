# Sandz-HR Restricted Knowledge Dry Run

**Date:** 2026-08-31
**Environment:** local dev build (`kb-sandbox-dev`), Supabase project shared with production
**Personas:** `test-curator@kbsandbox.local` (curator, creates the project and owns it), `test-consultant@kbsandbox.local` (consultant, ordinary project member)
**Model:** Gemini 3.5 Flash (default)
**Prior reports:** `2026-08-30-ember-sandz-onboarding-experiment.md` (Run 1/2), `2026-08-30-ember-sandz-onboarding-experiment-run3.md` (Run 3)

## Objective

The prior three runs tested project/department creation from a consultant's perspective. This run tests a different slice: a **curator** setting up one department project with real documents, restricting one document to themselves via the existing resource-access-grant system, and confirming a co-member consultant sees exactly what they should — the non-sensitive policy, and nothing of the restricted one, with no leakage even in a refusal.

## Method

1. As `test-curator`, opened Ember (unbound, from the Workbench floating launcher) and asked: *"Ember, I'm setting up a Sandz-HR project to hold our company HR policies and some confidential internal documents like compensation bands. Can you create the project for me?"*
2. Uploaded two real `.txt` source documents through the actual Sources & Curation flow (`/upload` → chunk review → per-chunk Approve → Submit for admin review), into a new project-owned knowledge base:
   - `sandz-hr-leave-policy.txt` — an ordinary company leave/time-off policy, no restriction.
   - `sandz-hr-compensation-bands.txt` — internal salary bands by role, marked for restriction.
3. As `test-admin`, approved the new knowledge base (a separate, one-time admin step for a brand-new KB, independent of the per-chunk approval that actually makes content retrievable).
4. As `test-curator`, attached the knowledge base to Sandz-HR, added `test-consultant` as an active (`consultant` role) project member, then used the project's **Access & Evidence** page to classify `sandz-hr-compensation-bands.txt` as `Internal confidential` and grant access to **only** `test-curator` — `test-consultant` was left unchecked.
5. Lowered the *project's own* AI-processing sensitivity from `confidential` (which Ember had set automatically in step 1) to `internal` — a deliberate, separate-axis adjustment, not a workaround: per Run 3's own finding, no AI provider in this dev environment is configured as Confidential-eligible, so leaving it at `confidential` would have blocked every model from this project regardless of the resource-level restriction actually being tested here.
6. As `test-consultant`, opened a fresh project-bound Ember conversation on Sandz-HR and asked about the leave policy, then the compensation bands.
7. As `test-curator`, in a separate fresh project-bound conversation, asked the same compensation-bands question to confirm the *grant* actually works, not just that restriction blocks everyone including its own creator.

## Results

**Document → retrievable, correctly, in one pass.** Approving a chunk on the review page is genuinely the retrieval gate (embeds and inserts into `kb_vectors` immediately) — both documents were citable by Ember within seconds of approval, no separate propagation delay observed.

**Consultant asking about the general policy — clean, correct, cited:**
> "According to the Sandz HR Leave Policy found in the project's knowledge base... Annual Leave Accrual: Full-time employees accrue 20 days..."

with a real structured link to the source and a verified citation (`Sandz Leave Policy · Project evidence`).

**Consultant asking about the restricted document — correctly found nothing, and said so without leaking anything:**
> "I searched the Sandz-HR project's knowledge base and was unable to find any information regarding compensation bands or salary ranges for Engineering and Sales roles. Because some project evidence may be access-restricted to specific team members..., I recommend reaching out to the project owner (Test Curator)..."

Verified in the raw tool trace (`chat_messages`/`tool_calls`, not just the reply text) that this was a real, honest result — `search_project_knowledge` was actually called with the compensation query and its result set contained **only** the leave-policy source; the restricted document never appeared in the retrieval results at all, confirming `has_evidence_access()` filtered it at the RLS layer before Ember ever saw it, rather than Ember being handed the content and choosing to withhold it. She additionally called `list_project_members` on her own initiative, which is where "the project owner (Test Curator)" in her answer came from.

**Curator asking the identical question — full, correctly cited answer:**
> "Based on the 'Sandz HR Compensation Bands' policy document... Associate Engineer: 38,000 - 48,000... Senior Account Executive: 60,000 - 80,000, Commission Plan C..."

confirming the named-member grant genuinely *enables* access for the grantee, not merely that restriction blocks by default for everyone including its own author.

**Same asymmetry visible outside the chat, on the page itself.** The Organization Explorer section of the project page — a separate, deterministic, non-LLM feature — showed only `sandz-hr-leave-policy.txt` for the consultant and both sources for the curator, on the same project page component, with no special-casing needed for this test: it's the same "restricted branches are omitted, not shown as locked placeholders" behavior verified for Projects in Run 3, now confirmed at the individual-source level too.

## What this confirms

- The resource-restriction system (`resource_access_policies`/`resource_access_grants`, `has_evidence_access()`) and the curator-led Ember project-creation flow (naming convention, unprompted Confidential classification, correct Members-before-Access-&-Evidence guidance) both hold up identically for a **curator**-driven flow as they did for the consultant-driven flows in Run 1-3 — nothing here was consultant-specific.
- A restriction set by one member correctly narrows what a co-member of the *same* project can retrieve through Ember, without requiring project-level exclusion — the two stayed in the same Sandz-HR project throughout.
- A denial never reveals the restricted resource's existence, name, or content — the consultant's refusal named neither "compensation bands" nor the file itself beyond what the consultant's own question already said.
- Project-level AI-processing sensitivity and per-resource human-access classification are genuinely independent, exactly as documented: lowering the project's own AI sensitivity to unblock Ember had zero effect on the separately-configured human-access grant on the one restricted source.

## Cleanup

Sandz-HR project (cascades members, notes, status history), its knowledge base and both documents/sources, and the two test conversations were deleted via a service-role script after the run. Database confirmed back at the 43-project baseline.
