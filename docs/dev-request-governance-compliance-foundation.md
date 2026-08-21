# Development Request: Governance & Compliance Foundation (M7 pilot slice)

**Status:** Proposed -- ideas sketch, not yet scoped for a build  
**Created:** 21 August 2026  
**Area:** Administration / Governance  
**Priority:** Planning input for Milestone 7 ("Govern: Risk + controls + guardrails + approvals")

## Summary

`docs/governance/TOGAF-ALIGNED-ARCHITECTURE-GOVERNANCE.md` is a full architecture-governance framework, explicitly not yet approved and explicitly recommending a narrow pilot before a full build (its own §21 "Implementation sequence" and §22 "Minimum viable governance pilot"). This document sketches what a **first, pilot-sized slice** of that framework could look like as real KB Sandbox functionality, so it can inform how Milestone 7 gets scoped -- it is not itself a request to build anything yet.

The core idea: KB Sandbox already has most of what the framework calls a gap (§19's own "capability mapping" table agrees). A pilot should be a **thin governance layer that references existing data** -- providers/models, Agents, projects, evaluations, `ai_operation_logs`, RLS, versioned Wiki/Agent/Graph content -- rather than a parallel system that re-describes what already exists elsewhere in the app.

## Why this shape

Two things about this codebase specifically make a "thin layer" approach unusually cheap:

1. **The Journal feature (`src/lib/journal/`) is already the exact shape "give management an evidence-backed export" needs.** Gather live data server-side, synthesize it, render to DOCX, stream it as a download -- nothing persisted, nothing new to operate. A "Compliance Snapshot" export is the same three-function shape (`gather.ts` / `docx.ts` / a Route Handler) with different inputs.
2. **This app already has several "dashboard card" and "admin list" precedents** (`UnpublishedWikiWidget`, `SharedLinksWidget`, the AI Config admin page's `ModelAssignmentsSummary`) that a Governance card/page can follow directly -- no new UI pattern to invent.

## Scope of this pilot slice

Matches the governance doc's own §22 pilot recommendation: **one governed system** (the Workbench Assistant is the obvious first candidate -- it already has model/provider identity, tool bounds, and `search_wiki` retrieval to point at), with the minimum schema needed to make that pilot real rather than a spreadsheet exercise.

### In scope

- A `governed_systems` registration: pointer to an existing record (an Agent, a model/provider pairing, or a project) plus the fields that don't exist anywhere yet -- accountable owner, business purpose, risk tier.
- A manual compliance review: an admin/curator works through the governance doc's own §15 checklist against one governed system and records findings -- no automated gate enforcement yet.
- A Compliance Snapshot DOCX export per governed system, pulling in current model/provider config, recent evaluation results, `ai_operation_logs` activity, and any recorded findings/exceptions -- the governance doc's §16 Architecture Compliance Record template, generated instead of hand-written.
- A small admin "Governance" dashboard card: count of governed systems, open findings by severity, exceptions nearing expiry.
- A basic exception record: what's not conformant, why, owner, expiry -- no automated revocation yet.

### Explicitly deferred

- The full Gate 0-5 lifecycle as enforced workflow states.
- The Architecture Board / RACI process as software (that's an organizational decision first; the governance doc's own §23 says the framework isn't even effective until an authority approves it).
- `architecture_principles` / `architecture_standards` / `governance_controls` as separate governed records -- premature with only one pilot system; a free-text "applicable standards" field on the review is enough until there's more than one system to actually need shared, reusable standards across.
- Automated re-evaluation triggers (§13) -- start by making change-worthy events (a default model swap, an Agent version bump) *visible* on the governed system's page; automatic re-review can follow once the manual version is trusted.
- Any binding of guardrails directly into Agent/tool execution (the governance doc's own Phase 4 "Executable governance") -- that's real, but a later phase once the review process itself is validated.

## Sketch: data model

Five tables, not the twelve in the governance doc's §20 -- enough to run one real pilot end to end:

```
governed_systems          -- pointer + owner + purpose + risk_tier
compliance_reviews        -- one review pass against a governed_system
compliance_findings       -- per-checklist-item status/severity/evidence/owner
governance_decisions      -- the review's outcome: status, rationale, approver, date
governance_exceptions     -- non-conformance accepted with scope/owner/expiry
```

Design rules carried over directly from the governance doc's own §20 (they're good regardless of how much of the framework gets built):

- `governed_systems` references an existing agent/model/project by id -- it does not copy that record's fields.
- Approvals and exceptions are append-only, not editable in place.
- No single free-text "compliant" flag -- status comes from the recorded findings, not a manual toggle.

## Sketch: Compliance Snapshot export

Same shape as `src/lib/journal/`:

- `src/lib/governance/gather.ts` -- pulls a governed system's current model/provider identity, recent eval scores, relevant `ai_operation_logs` activity, and its recorded findings/exceptions into a bounded evidence set.
- `src/lib/governance/docx.ts` -- renders that evidence into the governance doc's §16 template (Identification / Accountability / Review basis / Findings / Exceptions / Decision).
- `src/app/(app)/admin/governance/[id]/snapshot/route.ts` -- same "generate in memory, stream as a download, nothing persisted" Route Handler pattern as `/profile/journal`.

This gives management something concrete to take to a meeting without building any new reporting UI -- the export *is* the report.

## Sketch: dashboard/admin surface

- An admin-only "Governance" section (new AdminTabs entry, matching the existing `ai` / `branding` tab pattern) listing governed systems with owner, risk tier, latest compliance status, and open finding counts -- the "at a glance" view for the AdminTabs page.
- Each governed system's detail view shows its findings/exceptions and a "Download Compliance Snapshot" action.
- A compact dashboard card (same convention as `SharedLinksWidget`) summarizing counts, shown only to admins, so this doesn't require visiting the Admin area to notice something needs attention.

## Open questions for scoping this properly

1. Which existing "thing" should the first governed system actually point at -- the Assistant as a whole (an abstract concept, not a single DB row today) or a specific Agent/model pairing? This affects whether `governed_systems.subject` needs a polymorphic reference or can be a plain foreign key.
2. Who fills out a compliance review in this pilot -- is it always an admin, or should curators be able to propose findings for an admin to decide (mirroring the Wiki draft/review/approve split)?
3. Does risk tier start as a fixed three-value enum (per the governance doc's §14), or does it need to be configurable per organization from day one?
4. Should the Compliance Snapshot be requestable by anyone with visibility into the governed system, or admin-only like the Remove action on Shared Links?

## Implementation note

Nothing here should be built until the governance framework itself has at least informal buy-in to pilot (per its own §23), and until the open questions above have real answers -- this document exists to make that conversation concrete, not to skip it.
