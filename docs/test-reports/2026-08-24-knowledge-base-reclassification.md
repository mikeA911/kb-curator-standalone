# Knowledge Base Reclassification Verification

**Date:** 2026-08-24  
**Environment:** Local application with development Supabase  
**Result:** Pass

## Database result

- `ai_engineering` exists as **AI Engineering & RAG Curation**, classification `platform`, lifecycle `active`, origin `KB Sandbox`.
- `zadara_sandz` remains active and is classified `partner_pilot`, origin `Sandz`.
- `billing`, `fhir`, `grants`, and `vbc` retain their stable IDs and are classified `legacy_sample`, lifecycle `reference`, origin `Rhubarb`.
- Profiles that previously referenced the four Rhubarb samples now reference `ai_engineering`; unrelated assignments were preserved.
- Existing records were retained, including five `chunking-strategies.pdf` test documents under legacy FHIR and the current Zadara/Sandz source document.
- No RAG Wiki articles were copied because the audit confirmed they already belong to global Platform Knowledge and were never attached to Billing.

## Live interface result

- Administration displays two clear sections: **Active knowledge bases** and **Legacy knowledge bases**.
- Legacy rows have no Delete action and explain that they are retained for reference.
- User assignment choices contain only `ai_engineering` and `zadara_sandz`.
- Curation Queue knowledge-base choices contain only the two active records.
- Sources & Curation upload choices contain only the two active records.
- Opening `/upload?kb=billing` does not select the legacy record; it safely defaults to `ai_engineering`.
- New Project → Knowledge scope offers only None, AI Engineering & RAG Curation, and Zadara / Sandz.
- No project was created and no content was uploaded during verification.

## Enforcement

- UI queries filter reference and archived knowledge bases from new work.
- Server Actions/services independently require an active knowledge base for uploads, curation-queue entries, assignments, project creation, and project attachment.
- Database triggers reject new document, queue, assignment, or project associations to a reference/archived knowledge base, protecting against direct Data API writes.
- Existing legacy associations remain readable and can continue through their historical processing lifecycle.

## Automated verification

- Final full suite: 715/715 passed across 90 files.
- Final focused classification, project, and curator suite: 43/43 passed.
- TypeScript: passed.
- Lint: passed.
- Production build: passed before the final migration-compatibility fallback; the fallback subsequently passed the full suite, TypeScript, lint, and focused tests.
