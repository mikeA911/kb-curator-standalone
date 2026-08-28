# Reusable Workflow/Checklist Generation

**Proposed Wiki category:** Workbench Handbook (`platform_handbook`)
**Proposed slug:** `reusable-workflow-checklist-generation-workbench-method`
**Proposed status:** Draft -> human review -> approved
**Audience:** Accounting, operations, and PMO practitioners running a recurring, procedure-driven
cycle

## What it is

Reusable Workflow/Checklist Generation is a Workbench method for generating a step-by-step
checklist or workflow from documented procedures, informed by relevant notes from prior runs. It
produces a reusable artifact meant to be run again next cycle, not a one-off answer to a single
question.

## Why it matters

Procedures drift from practice -- a documented month-end close process rarely mentions the specific
step that tripped up the last three closes. A checklist that folds in real prior-run notes, while
staying honestly grounded in the documented procedure rather than inventing steps to fill gaps, is
more useful than either the raw procedure document or someone's memory of how it went last time.

## Requirements

**Required:** procedure documentation to generate the checklist from.

**Optional:** prior run notes or known exceptions from previous cycles.

**Git required:** No.

## Method

Extract the procedure's steps, sequence them, and fold in lessons from prior-run notes -- for
example, a step that's commonly missed or a dependency that isn't obvious from the procedure text
alone. Produce the result as a reusable artifact or template, not a single answer.

## Deliverables

A Checklist/Workflow artifact designed to be reused each cycle; a gap list where the underlying
procedure is undocumented or ambiguous.

## Boundary

Compiled from existing approved procedure. Does not invent new procedure steps -- an undocumented
step becomes a gap flag for a human to resolve, not an assumption the method fills in on its own.
