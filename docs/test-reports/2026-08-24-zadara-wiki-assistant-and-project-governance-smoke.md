# Zadara Wiki, Assistant RAG, and Project Governance Smoke Test

**Date:** 24 August 2026  
**Environment:** https://kbsandbox.tech  
**Role:** Admin  

## Outcome

Partially passed. The Zadara Wiki article was created, submitted, approved, and became the current version. The intended end-to-end project-aware Assistant flow remains blocked by project-knowledge attachment and Assistant reliability gaps. The public deployment also appears to be behind the repository implementation of Project Approval Authorities Stage 1.

## Knowledge preparation

Confirmed six Zadara source documents were in the completed/approved state:

- `zadara-01-zstorage-overview.txt`
- `zadara-02-command-center-admin-guide-introduction.txt`
- `zadara-03-vpsa-user-guide-first-steps.txt`
- `zadara-04-vpsa-rest-api-reference.txt`
- `zadara-05-object-storage-user-guide-introduction.txt`
- `zadara-06-release-notes-index.txt`

## Wiki creation

Created and approved:

- **Title:** Zadara Knowledge Copilot: Helpdesk and Proposal Guidance
- **URL:** https://kbsandbox.tech/wiki/zadara-knowledge-copilot-helpdesk-proposal-guidance
- **Category:** Knowledge Engineering
- **Current approved version:** 1

The article deliberately separates documented facts, reasoned recommendations, missing evidence, and human approval boundaries. It names the six approved Zadara sources and warns against inventing client privacy, regulatory, sizing, pricing, security, or contractual requirements.

## Defects and gaps

### 1. AI-assisted Wiki generation fails

Selecting ten approved Zadara chunks and generating a draft produced:

> Minified React error #441

The workflow did not produce a recoverable draft. A manual article was created instead.

### 2. Manual source linking is not usable for curators

The manual Wiki page reported **No sources linked**. Its source controls required a raw chunk/document identifier, while the External option exposed relationship/description fields without a clear URL field. A curator should be able to select approved sources by title and version.

The article therefore contains explicit source URLs in its body, but lacks the platform's durable structured source relationships.

### 3. Project knowledge is not attached

The Sandz pilot project page still displayed:

> No project-specific knowledge base attached yet.

The Project Wizard offers **Zadara / Sandz** as a Knowledge Scope option, but the current project/Assistant flow does not expose a durable project attachment or direct project-source retrieval.

### 4. Assistant turn does not complete reliably

A Groq GPT-OSS 120B question requesting healthcare laboratory-findings discovery guidance from the approved Zadara Wiki remained at:

> This is taking longer than expected.

After **Refresh conversation**, the pending user question remained but no Assistant response or durable failure record appeared. This prevents confirmation that the newly approved article was retrieved.

### 5. Project Approval Authorities deployment mismatch

The repository's `ProjectWizard.tsx` contains a sixth **Governance & Approvals** step and Stage 1 authority logic. The public site served a five-step wizard:

1. What are you doing?
2. Define the problem
3. Knowledge scope
4. Evaluation
5. Team

For a Client / Consulting smoke scenario, the Team page offered **Create project** directly; no Governance & Approvals step was visible before creation. No project was created during this check.

This suggests the public deployment does not contain the currently reported Stage 1 build, or is serving a stale asset/version. Verify the deployed commit and build before further behavioral testing.

## Passed checks

- Admin could create a manual Wiki draft.
- Draft submission locked the relevant actions.
- Admin could approve the submitted Wiki version.
- Version history showed version 1 as current with an approval date.
- Approved content rendered on its canonical Wiki URL.
- The article included explicit operational and human-approval guardrails.

## Recommended next actions

1. Verify the production deployment commit includes Project Approval Authorities Stage 1.
2. Fix AI-assisted Wiki generation and preserve selected-source provenance across failure/retry.
3. Replace raw source-ID entry with an approved-source picker.
4. Implement project-aware knowledge associations and project-bound Assistant retrieval.
5. Make long-running Assistant turns durable and distinguish provider, tool-loop, polling, and rendering failures.
6. Repeat the Assistant RAG test and then execute the full Feature 2 live role matrix.
