# Ember Test: Client Knowledge Workspace Onboarding Method

**Date:** 2026-08-28  
**Environment:** `https://kbsandbox.tech`  
**User:** Signed-in admin  
**Model displayed:** Gemini 3.5 Flash

## Objective

Ask Ember to design a complete Workbench Method for onboarding a client into shared, departmental, and customer-specific Projects and knowledge bases.

## Result

Ember produced a well-structured initial Method proposal with purpose, applicability, terminology, requirements, procedure, Sandz topology, deliverables, acceptance criteria, risks, feature-gap analysis, and a recommended next action.

The first response contained several material product-knowledge errors:

1. It described an Organization tenant as an implemented platform boundary although no native Organization object exists.
2. It described Ember conversations as temporary although conversation history is durable per user and project-bound conversations preserve project context.
3. It classified many-to-many Project-to-knowledge-base attachment as future functionality although it is already implemented.
4. It implied organization colleagues could collaborate without first stating the explicit Project-membership requirement.
5. It exposed internal database terminology and used the untestable phrase "zero hallucination."
6. Its proposed project navigation label had no actual `href`.

A corrective follow-up identified those facts explicitly. Ember then corrected the conceptual organization boundary, knowledge-base attachment, durable conversation history, explicit membership, role/authority separation, and user-facing terminology.

## Remaining defect

The corrected response displayed `/projects` but the rendered link target was:

`https://kb-sandbox.example.com/projects`

The expected target is:

`https://kbsandbox.tech/projects`

This is a navigation/artifact-link construction defect. Ember should generate stable internal relative routes or use the configured canonical application origin. It should never substitute an example hostname in a user-facing navigation action.

## Assessment

- **Method reasoning:** Good after correction.
- **Initial product-state accuracy:** Failed; several important current/future distinctions were wrong.
- **Responsiveness to correction:** Passed.
- **Role and authority distinction:** Passed after correction.
- **Navigation link:** Failed because of incorrect hostname.
- **Artifacts:** The conversation's existing Artifacts count did not provide clear evidence that the new Method was saved as a distinct artifact.

## Recommended follow-up

1. Add the committed Capability and Navigation Catalogue to Ember's product-navigation tool as planned.
2. Require current/future capability claims to cite that catalogue or another approved product source.
3. Resolve internal routes against the configured KB Sandbox origin rather than an example hostname.
4. Add a regression test for `/projects` navigation produced from an Ember Method response.
5. Add a regression test for Project-to-knowledge-base attachment being described as current functionality.
6. Add a regression test for durable and project-bound conversation history.
