# Structured Incident/Failure Investigation

**Proposed Wiki category:** Workbench Handbook (`platform_handbook`)
**Proposed slug:** `structured-incident-failure-investigation-workbench-method`
**Proposed status:** Draft -> human review -> approved
**Audience:** Quality and process owners investigating a manufacturing, operational, or service
failure

## What it is

Structured Incident/Failure Investigation is a Workbench method for investigating a reported
failure or incident using a defined structured framework -- for example, 8D: Team, Problem
Description, Containment, Root Cause, Corrective Action, Implementation, Prevention, Closure --
grounded in submitted evidence rather than speculation.

## Why it matters

A root-cause investigation that fills gaps with plausible-sounding narrative is worse than one that
honestly says "we don't have the data to determine this yet" -- the former gets signed off and the
real cause recurs. This method exists to keep every step of the framework tied to evidence that was
actually submitted, and to make missing evidence visible rather than quietly papered over.

## Requirements

**Required:** the incident/failure report; the relevant process/quality data; the investigation
framework to use (e.g. 8D).

**Optional:** historical records of similar incidents.

**Git required:** No.

## Method

Walk the structured framework step by step. Ground each step's content in the evidence actually
submitted, and explicitly flag any step where the evidence needed to complete it is missing, rather
than filling it in speculatively.

## Deliverables

A Structured Investigation Report, organized by framework step; an Evidence Map; an explicit list of
open items still needing further data or a human decision.

## Boundary

KB Sandbox drafts the structured investigation. The quality/process owner approves the root-cause
finding and the corrective action before the investigation is closed -- root-causing a
manufacturing failure is exactly the kind of judgment call this method should surface evidence for,
not make unilaterally.
