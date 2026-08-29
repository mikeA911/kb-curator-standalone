# Governed Q&A & Grounded Drafting

**Proposed Wiki category:** Workbench Handbook (`platform_handbook`)
**Proposed slug:** `governed-qa-and-grounded-drafting-workbench-method`
**Proposed status:** Draft -> human review -> approved
**Audience:** HR, Accounting, Sales, Support, and Operations practitioners; anyone answering a
question or drafting a short document from approved company knowledge

## What it is

Governed Q&A & Grounded Drafting is a Workbench method for answering a practitioner's question, or
drafting a short document, using only approved organizational knowledge -- never inventing a
policy, number, or capability that isn't in an approved source. It covers the shared shape behind
what otherwise look like several different tools: an HR policy question, an accounting rule
question, an SOP lookup, a sales proposal draft, or a support answer are all the same method applied
to a different knowledge domain.

## Why it matters

The failure mode this method exists to prevent is a confident-sounding answer that's actually
invented -- a leave policy detail that isn't in the handbook, a discount that was never approved, a
capability the product doesn't have. Grounding every claim in a cited, approved source, and saying
so plainly when the source doesn't cover the question, is what makes this safe to point at real
employees and (for Sales Proposal Copilot) at customers.

## Requirements

**Required:** a question or drafting request; at least one approved knowledge source (policy Wiki,
procedure document, product/pricing sheet).

**Optional:** prior similar Q&A or precedent notes; a target audience or format for drafting
requests (e.g. "a two-paragraph proposal section," not "everything we know").

**Git required:** No.

## Method

Retrieve from approved knowledge only, in the platform's existing retrieval order (Approved Project
Knowledge, then Platform Knowledge). Ground every claim in a specific cited source rather than a
paraphrase from memory. If the source is silent, ambiguous, or conflicting, say so explicitly
instead of filling the gap with a plausible-sounding answer -- and for support-style use, escalate
to a human rather than guess at an answer the practitioner might act on.

## Deliverables

A grounded answer or draft, with citations back to the specific source used; an explicit
ambiguity/gap flag wherever the approved knowledge doesn't fully cover the question; an escalation
flag where the method is being used for customer-facing support.

## Boundary

KB Sandbox answers and drafts from approved knowledge only. A human owns anything the knowledge
base doesn't already settle -- this method should refuse to speculate rather than sound confident
and be wrong, which matters most for a sales proposal (never invent pricing or capabilities) and a
support answer (escalate rather than bluff).
