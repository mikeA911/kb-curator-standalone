# Structured Rule-Based Review with Human Approval

**Proposed Wiki category:** Workbench Handbook (`platform_handbook`)
**Proposed slug:** `structured-rule-based-review-workbench-method`
**Proposed status:** Draft -> human review -> approved
**Audience:** Accounting, procurement, legal, and quality/compliance practitioners reviewing claims,
contracts, or supplier evidence against defined rules

## What it is

Structured Rule-Based Review with Human Approval is a Workbench method for checking a submitted
item -- an expense claim, a contract, a supplier's compliance evidence -- against a defined rule or
requirement set, and flagging exceptions for a human to decide. The same shape covers an expense
claim against a reimbursement policy, a contract's terms against company standard terms, and a
supplier's audit evidence against supplier requirements (with a Corrective Action Plan as an
additional deliverable in that last case).

## Why it matters

A rule-checking method is only trustworthy if it never quietly approves or rejects on its own --
the value is in surfacing every violation and ambiguous case clearly enough that a human approver
can make the actual call quickly, not in replacing that approval.

## Requirements

**Required:** the item(s) to review; the rule, policy, or requirement set to check against; a
defined approval authority.

**Optional:** prior exception history; a Corrective Action Plan template, for compliance-audit use.

**Git required:** No.

## Method

Extract the item's relevant structured fields or claims, evaluate each one against the applicable
rule, and flag violations or ambiguous cases explicitly rather than silently approving or rejecting.
For compliance-audit use, draft a Corrective Action Plan against each flagged gap.

## Deliverables

Findings; flagged Exceptions; a Recommendation; for compliance-audit use, a draft Corrective Action
Plan; an Approval record once a human has decided.

## Boundary

KB Sandbox flags and recommends. A human approves or rejects every exception -- this method should
never auto-approve or auto-reject on its own, which matters equally for an expense claim, a
contract deviation, and a supplier audit finding.
