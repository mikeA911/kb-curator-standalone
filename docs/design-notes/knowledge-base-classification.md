# Knowledge Base Classification

## Decision

The four knowledge-base domains inherited from Rhubarb are retained for historical reference but are no longer offered for new KB Sandbox work:

- FHIR (`fhir`)
- Billing (`billing`)
- Grants (`grants`)
- Value-Based Care (`vbc`)

They are classified as `legacy_sample`, given lifecycle status `reference`, and attributed to origin `Rhubarb`. Their stable IDs and existing references remain intact.

The active platform knowledge base for new retrieval and curation work is:

- **AI Engineering & RAG Curation** (`ai_engineering`)

It stores source documents and curated evidence supporting retrieval, RAG evaluation, agents, and wider AI engineering. Approved cross-cutting Wiki articles remain Platform Knowledge (`wiki_articles.knowledge_base_id is null`); they are not duplicated into this curation knowledge base.

`Zadara / Sandz` remains active and is classified as a partner pilot knowledge base.

## Lifecycle behavior

Only knowledge bases whose `lifecycle_status` is `active` may be selected for:

- new document uploads;
- new curation-queue entries;
- new project attachments; or
- curator knowledge-base assignments.

The application filters reference/archived records out of these choices and checks lifecycle status again at the Server Action/service boundary. Database triggers reject direct writes that attempt to create a new association to a non-active knowledge base.

Existing documents and other historical records remain accessible. Changing processing state on an existing legacy document does not create a new KB association and is therefore not blocked.

## Existing RAG material

The data audit on 2026-08-24 found no documents, vectors, Wiki articles, evaluation datasets, or curation-queue entries attached to Billing. Existing RAG and AI-engineering Wiki articles were already stored correctly as global Platform Knowledge.

Five end-to-end test uploads named `chunking-strategies.pdf` remain under the legacy FHIR knowledge base. They are test artifacts, not authoritative RAG evidence, and are deliberately not copied. Their eventual deletion is a separate cleanup decision.

## Assignment migration

Profiles previously assigned any of the four Rhubarb knowledge bases have those legacy IDs removed and receive `ai_engineering`. Any unrelated assignments are preserved.

