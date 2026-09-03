# Development Request — Governed Agent Creation Workbench Method

**Status:** Ready for implementation  
**Priority:** P1 — content seeding and Method discovery  
**Source Method:** [`docs/workbench-method-governed-agent-creation.md`](workbench-method-governed-agent-creation.md)  
**Related:** [`docs/hackathon/PSHS-Filipino-Street-Food-AI-Hackathon-Proposal.docx`](hackathon/PSHS-Filipino-Street-Food-AI-Hackathon-Proposal.docx)

## Objective

Create a reviewable Workbench Handbook article titled:

**Governed Agent Creation (Workbench Method)**

Use the repository source Method without silently removing its evidence, security, student-safety,
human-approval, external-build or current-implementation boundaries. This is a content and Method
discovery request, not a new wizard, project-cloning feature or executable agent graph.

## Required implementation

1. Seed/import the source Method into the existing Workbench Handbook category.
2. Use the next safe Method identity and the established slug convention. Suggested slug:
   `governed-agent-creation-workbench-method`.
3. Leave it as draft or submitted for review so Mike can inspect, edit and approve it through the
   normal Wiki workflow. Do not auto-approve it.
4. Preserve the full procedure, requirements, deliverables, evaluation criteria, student
   guardrails, failure modes and Filipino street-food example.
5. Add it to the established Method discovery/catalogue mechanism without renumbering or replacing
   an existing Method.
6. Update `docs/ember/KB-SANDBOX-CAPABILITY-AND-NAVIGATION-CATALOGUE.md` only as needed so Ember can
   recommend the approved Method and guide a user to it.
7. Follow existing approval rules: Ember must not treat an unapproved article as approved guidance.

## Ember discovery examples

After approval, Ember should be able to recommend this Method for prompts such as:

- “Help our student team create a food-ordering agent.”
- “We want to expose this business process as an MCP server.”
- “How do we design, build and test an agent safely?”
- “Can we create an agent outside KB Sandbox and connect it back to Ember?”
- “What documents do we need before asking Codex to build the service?”

Ember should explain that the user can build in an approved external coding environment and return
the implementation and evidence to the Project. It must not claim that selecting the Method creates,
deploys, registers or approves the agent automatically.

## Verification

### Automated

- Seed/import is idempotent and does not duplicate the article or slug.
- All required Method sections are present.
- Existing Wiki/Method tests pass.
- Typecheck, lint, full tests and production build pass.

### Live

1. Confirm the article appears in the normal review queue and remains unapproved.
2. Mike reviews and approves it.
3. Start a new Ember conversation from an appropriate Project.
4. Ask Ember how a student team should build a food-ordering agent.
5. Confirm Ember recommends and cites the approved Method.
6. Confirm the rendered article contains the complete lifecycle, external-build boundary, student
   guardrails and worked example.
7. Confirm Ember does not copy or propose reuse of an existing MCP registration or credential.

## Acceptance criteria

1. One reviewable Handbook article exists from the repository source.
2. Mike can edit and approve it using the normal workflow.
3. Existing Method identities and articles are unchanged.
4. After approval, Ember can discover, cite and apply it conversationally.
5. The Method accurately separates agent, MCP server, connector, skill and client interface.
6. It clearly preserves human confirmation, least privilege and external implementation review.
7. It does not promise autonomous coding, deployment, certification or production approval.

## Explicitly deferred

- Project duplication or template cloning
- Automated Method execution graphs
- Autonomous code generation or deployment by Ember
- Automatic MCP registration or certification
- Real merchant, payment or delivery integration
- Public student accounts, competition administration and judging UI

