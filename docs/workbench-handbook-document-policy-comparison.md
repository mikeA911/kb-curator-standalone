# Document/Policy Comparison

**Proposed Wiki category:** Workbench Handbook (`platform_handbook`)
**Proposed slug:** `document-policy-comparison-workbench-method`
**Proposed status:** Draft -> human review -> approved
**Audience:** HR, legal, compliance, and PMO practitioners comparing document versions or assessing
regulatory impact

## What it is

Document/Policy Comparison is a Workbench method for comparing two versions of the same document
and identifying material changes. It has a second mode -- Regulatory Impact -- for the related but
distinct question of which internal documents or processes a new external rule affects. Both modes
share the same underlying shape: hold one thing fixed (the prior version, or the new rule) and
assess a set of candidates against it.

## Why it matters

Two documents that differ in wording aren't necessarily different in substance, and "we updated the
policy" is not the same statement as "here is exactly what changed and why it matters." Classifying
each change by how material it actually is -- rather than presenting every diff with equal weight --
is what makes the output usable by someone who needs to decide whether to re-communicate the policy
to staff.

## Requirements

**Required (Comparison mode):** two document versions; comparison criteria for what counts as
material.

**Required (Regulatory Impact mode):** the new rule/regulation text; the corpus of internal
policies or processes to check it against.

**Optional:** change rationale; prior similar impact assessments.

**Git required:** No.

## Method

Comparison mode: diff at clause or section level, classify each change (material, clarifying, or
administrative), and summarize the practical effect of each material change in plain terms.

Regulatory Impact mode: for each candidate internal document, assess relevance and potential
conflict against the new rule, and classify the impact (must change, should review, or no impact).

## Deliverables

Comparison mode: a Change Summary, a Material Changes list, and an Evidence Map back to the specific
clauses compared. Regulatory Impact mode: an Affected-Documents list with an impact classification
per document.

## Boundary

Findings for human review -- legal, HR, or compliance decides what actually changes. No automatic
adoption of new policy text, and no automatic re-classification of a document's impact rating
without a human confirming it.
