# Restricting a Source from Some Project Members

**Audience:** A curator uploading source material, or a Project owner/admin who needs a specific source visible to only part of the Project team -- not every active member.

**Status:** Documents an already-shipped capability (Project Evidence Access Controls, `docs/dev-request-project-evidence-access-controls.md`), not a new feature. This guide exists because the restriction step is easy to miss: it happens *after* upload, on a separate page, and nothing at upload time hints that it's available.

## The default: Project membership is all-or-nothing

Attaching a knowledge base to a Project (`project_knowledge_bases`) exposes every source in that knowledge base to every active member of that Project, uniformly. There is no per-member option on the attach step itself, and no visibility field on upload. If you need one source within an otherwise-shared knowledge base kept away from part of the team -- a commercially sensitive pricing sheet, a security-restricted document, a customer-confidential artifact -- membership alone can't do it. You need a second, separate step.

## Step 1: Upload the source as normal

`/upload` ("Sources & Curation", curator role required) -- pick the target knowledge base, upload the file, let it go through the ordinary parse/chunk/curator-review pipeline (`uploadAndProcessDocument`, `src/app/actions/curator.ts`). There is no classification or visibility field here, and that's deliberate: restricting access is a Project-level decision (who on *this* Project's team should see it), not a property of the source itself at ingestion time, and it's made by whoever manages the Project, not necessarily the curator who uploaded it.

Once the knowledge base is attached to a Project (or already was), the new source is visible to every active member of that Project by default -- same as everything else in that knowledge base.

## Step 2: Restrict it on the Project's Access & Evidence page

Open the Project workspace and click **Access & Evidence** (`/projects/[id]/access`). This page is owner/admin-only -- a plain member or consultant, even a Project curator who isn't the owner, is redirected back to the Project page (`can_manage_project`: platform admin or the Project's own `owner`-role member, checked in `src/app/(app)/projects/[id]/access/page.tsx`).

1. **Create an access group first if you're restricting to more than one person** -- under "Access groups," name it (suggestions like `finance_pricing`, `security_compliance`, `named_users_only` are offered, but any name works) and add the members who should retain access. Skip this if you're restricting to exactly one person -- Step 2's grant can target a single named member directly, no group needed.
2. Under **Resources**, find the source in the list (every `knowledge_source` reachable through this Project's attached knowledge bases appears here, alongside Wiki articles and workstream artifacts) and click **Classify**.
3. Pick a **Classification** other than "Project general" -- `Internal confidential`, `Commercial confidential`, `Security restricted`, `Customer confidential`, or `Customer visible`. Any non-default value is what actually restricts the resource; the label you pick doesn't otherwise change enforcement, so choose whichever reads correctly for your own audit trail.
4. Check the group(s) and/or named member(s) who should keep access. **This is required the moment you leave "Project general"** -- the save is rejected otherwise (`EvidenceAccessValidationError`, `src/lib/projects/evidence-access.ts:279-283`), because there is no owner/admin bypass on a restricted resource (see below) and a restriction with zero grants would lock out literally everyone, including you.
5. Click **Save classification**.

From that point on, only the granted groups/members (plus platform admins for AI-eligibility screening, not general read access) can retrieve or open that source -- everyone else on the Project team still sees everything else normally.

## The one rule that surprises people: no owner bypass

Once a source is restricted, **the person who restricted it is also locked out unless they explicitly granted themselves or their own group.** This isn't a bug -- `has_evidence_access()` (`supabase/migrations/20260825110001_project_evidence_access_enforcement.sql:33-63`) has no `is_admin`/owner exception on purpose: "a restricted source is restricted for everyone without an explicit grant, full stop, including its own uploader/creator." If you restrict something and then can't find it in Ember's answers or in your own source list, check whether you actually included yourself in the grant.

## Don't confuse this with "AI sensitivity"

The same Classify panel has a second dropdown, **AI sensitivity** (`Public`/`Internal`/`Confidential`/`Restricted`). It looks like another visibility control and lives on the same row -- it is not. Classification (Step 2 above) controls **which humans** can see the resource. AI sensitivity controls **which AI provider/model** is allowed to process its content at all (`src/lib/ai/sensitivity.ts`, `ai_provider_sensitivity_eligibility`), independent of who's allowed to view it. A source can be `Project general` (every member can see it) and `Restricted` sensitivity (no AI provider configured for Restricted content may process it) at the same time, or the reverse. Set both deliberately; setting one does not imply anything about the other.

## Checking or undoing a restriction

The same Access & Evidence page shows every classified resource, its current grants ("Whole project team" if unrestricted, or the specific groups/members if not), and a full **Audit history** of every classify/reclassify/grant/revoke event with actor and timestamp (`resource_access_audit_log` -- append-only, no client insert path, written only by the service layer). Click **Revoke** next to a grant to remove one group/member's access, or reopen **Classify** and set the classification back to "Project general" to lift the restriction entirely.

## Never use a restricted source as Wiki-synthesis input

`/wiki/new`'s "AI-assisted draft" mode lets a curator pick approved document chunks (or a project artifact) and has a model draft a Wiki article from them. **A published Wiki article is not restricted by its source's classification** -- restricting a `knowledge_source` and restricting the `wiki_article` later synthesized from it are two completely independent settings today (confirmed against the code, not assumed). If you feed a restricted source's chunks into a Wiki draft and approve it, the resulting article defaults to fully open -- readable by the whole Project team, or platform-wide, regardless of how carefully the source itself was locked down. Nothing in the picker currently warns you this is happening.

**Until the picker itself enforces this (tracked as a real scoped-but-not-yet-built plan, see the dev request below), it is a manual curator judgment call: before selecting chunks or an artifact for an AI-assisted draft, check whether their source is restricted (Access & Evidence's Resources table, or ask the Project owner) and do not use restricted material as synthesis input.** If a Project genuinely needs that material to reach a wider audience, restrict the *resulting* Wiki article to the same audience explicitly (Access & Evidence works on `wiki_article` resources exactly the same way it works on sources) rather than assuming the source's own restriction carries over -- it does not.

This is the deliberate alternative to trying to auto-classify derived content correctly: `EvidenceClassification` values aren't a ranked severity scale the way `InformationSensitivity` is, so "inherit the most restrictive classification" isn't well-defined without new design work, and even a correct label doesn't undo an LLM having already blended restricted and unrestricted source text into one synthesized paragraph. Keeping restricted sources out of synthesis inputs in the first place avoids that problem entirely, rather than trying to clean up after it.

## Reference

- Design doc: `docs/dev-request-project-evidence-access-controls.md`
- Enforcement: `supabase/migrations/20260825100001_project_evidence_access_schema.sql` (schema), `supabase/migrations/20260825110001_project_evidence_access_enforcement.sql` (`has_evidence_access()`, wired into the SELECT policies for `knowledge_sources`, `documents`, `kb_vectors`, `wiki_articles`, `wiki_versions`, `wiki_vectors`, `workstream_artifacts`)
- Service layer: `src/lib/projects/evidence-access.ts`
- UI: `src/app/(app)/projects/[id]/access/page.tsx`, `src/components/projects/AccessEvidenceManager.tsx`
- Upload entry point: `src/app/(app)/upload/page.tsx`, `src/app/actions/curator.ts` (`uploadAndProcessDocument`)
