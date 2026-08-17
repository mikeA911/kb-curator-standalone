// One-off: replace the paraphrased project.goal (written before the actual
// prompt was available) with the verbatim CareCall OpenAPI Discovery
// workstream prompt the user gave every participant (Claude Code, OpenAI,
// Grok). Content is unchanged from what was pasted; only the "==== N.
// TITLE ====" ASCII dividers and the doc-wide numbered-list artifact
// (section headers and their body items sharing one incrementing counter)
// are cleaned into proper markdown headings/lists for readability.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const PROJECT_ID = '6c11785b-695f-4ae7-b3a8-e3183f489701'

const goal = `# CareCall — OpenAPI Discovery Workstream

You are performing an external engineering workstream for an existing application called CareCall. This repository is the authoritative implementation evidence for this exercise. Your task is to analyze the existing CareCall codebase and produce an evidence-backed OpenAPI 3.1 specification plus supporting engineering artifacts.

This is **NOT** a refactoring task. Do not modify the CareCall application unless explicitly asked to later. The purpose of this exercise is also to evaluate how accurately an AI coding assistant can reconstruct an API contract from an existing application. Therefore:

- inspect before concluding;
- distinguish evidence from inference;
- do not invent capabilities because they seem logical;
- record uncertainty explicitly;
- preserve traceability back to source code.

## 1. Operating Mode

Treat the repository as READ-ONLY for this workstream. You MAY:

- inspect files;
- search the repository;
- trace routes/controllers/services;
- inspect schemas/types/models;
- inspect authentication and authorization logic;
- inspect tests;
- inspect configuration;
- inspect database access where relevant;
- run existing safe tests/static analysis if appropriate;
- create the deliverable files listed below.

You MUST NOT:

- modify existing application code;
- refactor the application;
- change dependencies merely to make analysis easier;
- modify infrastructure;
- modify database schemas;
- access production systems;
- use production credentials;
- expose secrets;
- "fix" endpoints while documenting them;
- invent undocumented behavior.

If you discover a defect, inconsistency, missing validation, security concern, or questionable implementation, document it in the findings rather than fixing it.

## 2. Important Experiment Rule

Do not ask what CareCall is supposed to do before performing discovery. Part of this experiment is determining what you can independently discover from the implementation. Do not optimize findings to match assumptions about what an appointment, healthcare, calling, scheduling, or campaign application would normally contain. Repository evidence wins over domain expectations.

## 3. Evidence Classification

For significant findings, classify confidence as:

- **CONFIRMED** — directly supported by implementation evidence.
- **INFERRED** — strongly suggested by the implementation but not completely established.
- **UNKNOWN** — cannot be reliably determined from the repository.

Do not silently convert INFERRED behavior into CONFIRMED behavior in the OpenAPI specification. When OpenAPI requires a concrete representation but implementation evidence is ambiguous, choose the most defensible representation and document the uncertainty in the findings/evidence map.

## 4. Discovery Order

Perform the work in this order. Do NOT start by generating openapi.yaml.

**Phase 1 — Architecture Orientation.** First understand the repository. Identify, where applicable: application structure; frontend/backend boundaries; API framework; route registration; controllers/handlers; services/business logic; data models; validation; authentication; authorization; external integrations; asynchronous/background operations; tests; existing API documentation; any existing OpenAPI/Swagger material. Do not treat existing API documentation as automatically correct — if a spec already exists, report it but still validate it against implementation evidence.

**Phase 2 — Capability Discovery.** Identify externally meaningful application capabilities. Think in terms of "what can the system actually do?" rather than "what routes exist?" A capability may involve multiple endpoints. For every discovered capability record: capability name; description; implementation evidence; relevant endpoints if known; confidence classification; important dependencies; important constraints; uncertainty. Do not use hypothetical CareCall capabilities supplied in previous discussions as ground truth — discover them independently from this repository.

**Phase 3 — Endpoint Discovery.** Identify implemented API endpoints/routes. For each endpoint determine, where evidence permits: HTTP method; route/path; purpose; authentication; authorization; path parameters; query parameters; request headers where significant; request body; request schema; response schema; response status codes; validation; errors; side effects; important external dependencies; implementation evidence; confidence. Trace beyond the route declaration when necessary (route → handler/controller → service → validation/business logic → data/external service). Do not infer a request or response schema solely from a function name if the implementation provides stronger evidence elsewhere.

**Phase 4 — Security Discovery.** Specifically inspect authentication and authorization. Determine where evidence permits: authentication mechanism; bearer/API/session/etc. security; protected vs. public endpoints; role/permission enforcement; tenant/project/user scoping if applicable; relevant security headers or requirements. Pay particular attention to the difference between authentication ("who is calling?") and authorization ("what are they allowed to do?"). Do not mark an endpoint unauthenticated merely because authentication is implemented in middleware outside the route file.

**Phase 5 — OpenAPI Generation.** Only after completing capability and endpoint discovery, generate an OpenAPI 3.1 specification representing what the implementation actually supports. Use reusable components/schemas where appropriate. Include: info; servers only if safely supported by repository evidence; paths; operations; parameters; request bodies; responses; schemas; securitySchemes; operation-level/global security where supported; useful operationIds where appropriate. Do not expose secrets or production credentials. Do not fabricate example PHI/PII or real patient information — use obviously synthetic values.

**Phase 6 — Validation.** After generating the specification, perform a second pass comparing it back to the repository. Look specifically for: missing endpoints; invented endpoints; wrong HTTP methods; incorrect paths; incorrect parameters; incorrect request schemas; incorrect response schemas; missing authentication; incorrect authorization assumptions; missing errors; unsupported inferred behavior; duplicated capabilities; undocumented uncertainty. Treat this as an adversarial review of your own work — do not assume the first-pass OpenAPI specification is correct.

## 5. Required Deliverables

Create exactly these five primary deliverables. Place them in an appropriate analysis/output directory that does not interfere with the application's runtime source tree. If no suitable documentation/output directory exists, create \`docs/openapi-discovery/\`.

**A. carecall-capability-inventory.md** — artifact type in KB Sandbox: \`capability_inventory\`. Markdown. Include: methodology; discovered capabilities; descriptions; confidence; implementation evidence; relevant endpoints; dependencies; uncertainties. Prefer a readable table plus additional notes where necessary.

**B. carecall-endpoint-inventory.md** — artifact type in KB Sandbox: \`endpoint_inventory\`. Markdown, using a table where practical: \`| Method | Route | Purpose | Auth | Evidence | Confidence |\`. Add detail below the table where request/response/security behavior needs more explanation.

**C. carecall-openapi.yaml** — artifact type in KB Sandbox: \`openapi_spec\`. Standard OpenAPI 3.1 YAML. The file should be syntactically valid and, where tooling is available locally, validated using an appropriate OpenAPI parser/validator. Do not install a large toolchain solely for validation unless necessary.

**D. carecall-openapi-findings.md** — artifact type in KB Sandbox: \`findings\`. Markdown. Include at minimum: (1) Executive summary; (2) Architecture observations; (3) API discovery observations; (4) Authentication/authorization observations; (5) OpenAPI validation findings; (6) Missing or ambiguous implementation information; (7) Potential defects/inconsistencies discovered; (8) Security concerns discovered; (9) Limitations of this analysis; (10) Recommended human-review areas. Separate IMPLEMENTATION FINDINGS from LIMITATIONS OF AI DISCOVERY — those are not the same thing.

**E. carecall-evidence-map.md** — artifact type in KB Sandbox: \`evidence_map\`. Markdown. This is especially important: map significant capabilities/OpenAPI operations to implementation evidence. Suggested structure: \`| Capability / Operation | Evidence | What Evidence Establishes | Confidence |\`. Evidence should preferably use relative/file/path:line-range where line references can be established reliably. The objective is to allow another engineer to verify important claims without rediscovering the entire repository.

## 6. Do Not Create the Benchmark

Do NOT create an "expected CareCall capability benchmark." That will be created independently by a human who knows the application. This separation is intentional — it prevents the system performing discovery from also defining the answers against which it will be evaluated. Later, KB Sandbox will compare human-expected capabilities (ground truth) against AI-discovered capabilities / the generated OpenAPI, and feed that comparison into a KB eval.

## 7. Evaluation-Friendly Output

Make the artifacts structured enough that they can later be evaluated. Capability names should be concise and stable. Avoid combining many unrelated capabilities into one enormous capability — prefer distinct Capability A / Capability B / Capability C over "manage the entire application." Likewise, avoid artificially splitting every implementation function into its own business capability. Use the application's meaningful functional boundaries.

## 8. Future MCP Use

A later workstream may use the approved OpenAPI specification as one input for building an MCP server. Do NOT build the MCP server now. However, in the findings report include a short "MCP Readiness" section assessing: whether the discovered API is sufficiently documented to expose selected capabilities as MCP tools; which ambiguities would need resolution first; which capabilities appear unsuitable for direct AI tool exposure; where additional authorization/guardrails would likely be required. This is an assessment only — do not design or implement the MCP server.

## 9. Safety / Healthcare Data

CareCall may contain healthcare-related functionality. Do not reproduce: real patient information; PHI; credentials; API keys; tokens; secrets; production URLs containing sensitive information. If such material exists in the repository, note its existence appropriately without copying the sensitive value into the deliverables. Use synthetic examples where examples are required.

## 10. Working Style

Work incrementally. Before generating the deliverables: (1) inspect the repository; (2) summarize the architecture discovered; (3) identify where routes/API behavior appear to live; (4) explain the planned discovery approach. Then proceed with the analysis. Do not stop to ask routine questions that can be answered from the repository — if genuinely critical information cannot be determined from the repository, record it as UNKNOWN rather than asking for the answer. That uncertainty is useful experimental data.

## 11. Final Report

When complete, report: (1) number of capabilities discovered; (2) number of API operations discovered; (3) number classified CONFIRMED / INFERRED / UNKNOWN; (4) authentication mechanism(s) discovered; (5) whether the OpenAPI document validates; (6) major ambiguities; (7) major security/implementation concerns; (8) the five files created; (9) anything that requires human verification. Do not claim the OpenAPI specification is correct merely because it validates syntactically — the next step is human ground-truth comparison and KB Sandbox evaluation.

## 12. Success Criterion

Success is **NOT** "I generated an OpenAPI specification." Success is: "I produced a traceable hypothesis of CareCall's API contract, grounded in implementation evidence, with uncertainty explicitly identified, which an independent human/evaluation process can now test."`

const { error } = await admin.from('projects').update({ goal }).eq('id', PROJECT_ID)
if (error) throw error
console.log('Replaced project.goal with the verbatim workstream prompt.')
