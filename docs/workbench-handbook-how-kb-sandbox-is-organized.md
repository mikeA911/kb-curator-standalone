# How KB Sandbox Is Organized: Organization, Projects and Knowledge

**Proposed Wiki category:** Workbench Handbook (`platform_handbook`)
**Proposed slug:** `how-kb-sandbox-is-organized-projects-workstreams-and-knowledge`
**Proposed status:** Draft -> human review -> approved
**Proposed visibility:** Public platform guidance
**Audience:** New users, client onboarding leads, Project owners, curators, administrators and Ember

## What this article explains

This article explains how to establish an organization in KB Sandbox and how the organization relates to Projects, knowledge bases, source documents, Wiki guidance and access controls.

The short version is:

> **One KB Sandbox instance currently represents one client organization. Projects organize that client's departments, capabilities, engagements and objectives. Knowledge bases hold reusable approved evidence and may be attached to one or more authorized Projects. Access is enforced first through Project membership and again through resource-level controls for restricted sources and documents.**

For a fuller onboarding and design exercise, use the [Client Knowledge Workspace Onboarding Method](/wiki/client-knowledge-workspace-onboarding-workbench-method).

## The organization is the client served by the instance

KB Sandbox is currently deployed using a **single-client instance model**.

This means the organization is normally the client or enterprise for which that KB Sandbox instance is operated. Examples include:

- Sandz;
- a software house operating its own internal instance;
- one university;
- one government agency; or
- one enterprise customer using a dedicated deployment.

The organization is presently a deployment and operating convention, not a native Organization record that automatically owns every user, Project and policy in the database.

For example, in a Sandz instance:

- **Organization:** Sandz
- **KB Sandbox instance:** the dedicated environment operated for Sandz
- **Projects:** Sandz-HR, Sandz-Accounting, Sandz-Logistics, Sandz-Sales Funnel, Sandz-Zadara Pilot, and any other authorized area of work

Do not create a Project called “Sandz” merely to simulate an Organization object unless there is a real organization-wide body of work that needs its own Project, members, conversations and outputs.

## Projects are flexible governed workspaces

A **Project** is the primary working and collaboration boundary in KB Sandbox.

A Project may represent:

- a department, such as HR, Accounting or Logistics;
- a business capability, such as Sales Proposals or Customer Support;
- an initiative or pilot, such as the Sandz-Zadara Pilot;
- a customer engagement;
- a recurring process, such as a sales funnel;
- an investigation, assessment or experiment; or
- any other durable objective for which people, knowledge and outputs belong together.

A Project brings together:

- explicit members and Project roles;
- a business purpose and status;
- attached knowledge bases;
- project-scoped Wiki guidance;
- Workstreams, assessments, notes and artifacts;
- approval authorities;
- project-bound Ember conversations; and
- the access and information-sensitivity settings applicable to that work.

Projects should be separated when their purpose, membership, information boundary or approval authority differs materially.

Do not create a new Project merely because two documents discuss different topics. Conversely, do not combine HR, pricing, customer, security and general company work into one Project if their audiences should differ.

## Recommended Project naming convention

Use a consistent name that begins with the organization or client name:

> **`<Organization>-<Department, capability, engagement or objective>`**

Examples:

- `Sandz-HR`
- `Sandz-Accounting`
- `Sandz-Logistics`
- `Sandz-Sales Funnel`
- `Sandz-Call Center Support`
- `Sandz-Zadara Pilot`

For related Projects within a larger initiative, use a common prefix:

- `Sandz-Zadara Pilot — Governance and Evaluation`
- `Sandz-Zadara Pilot — Sales Proposals`
- `Sandz-Zadara Pilot — Call Center Support`

The shared name makes the relationship visible to people and Ember. It does **not** create a technical parent-child relationship, automatic membership inheritance or automatic knowledge sharing.

Before creating a Project during onboarding, search the existing Projects for the organization, department, capability, customer or initiative. Reuse or extend an existing Project when it already represents the intended boundary.

## Workstreams organize bounded work inside a Project

A **Workstream** is a specific activity or investigation inside a Project.

For example, `Sandz-Sales Funnel` may contain Workstreams for:

- qualifying a new opportunity;
- preparing a healthcare storage proposal;
- reviewing commercial terms;
- comparing solution alternatives; and
- producing a customer-approved handoff.

Create another Project when membership, knowledge or approval boundaries change. Create another Workstream when the boundary remains the same but the task or deliverable changes.

Workstream instructions and guardrails describe how work should be performed. They do not grant or revoke access by themselves.

## Knowledge bases hold reusable approved evidence

A **knowledge base** is a reusable collection of approved source-derived knowledge.

A Project may:

- create or begin with a specialized knowledge base for its own work;
- attach an existing shared knowledge base;
- attach several complementary knowledge bases; and
- detach a knowledge base when it is no longer appropriate for that Project.

A knowledge base may also be attached to more than one explicitly authorized Project. Attaching it does not copy the documents. It makes the same governed body of knowledge available as Project context under the applicable access rules.

This supports a practical pattern:

1. maintain one authoritative shared knowledge base for organization-wide material;
2. create specialized knowledge bases for departments, capabilities, customers or sensitive domains; and
3. attach only the knowledge bases each Project is permitted and expected to use.

### Sandz example

| Knowledge base | Typical contents | Example authorized Projects |
|---|---|---|
| Sandz Shared Knowledge | Approved company profile, general services, brand guidance and organization-wide procedures | Most Sandz Projects where the information is appropriate |
| Zadara Product Knowledge | Approved product, architecture and solution information | Zadara Pilot, Sales Proposals and Call Center Support |
| Sandz HR Knowledge | Employee policies, approved HR procedures and forms | Sandz-HR only, unless a specific item is deliberately released more broadly |
| Sandz Finance and Commercial Knowledge | Pricing rules, commercial history and financial procedures | Sandz-Accounting and specifically authorized Sales Projects |
| Call Center Knowledge | Support procedures, scripts, escalation guidance and known issues | Sandz-Call Center Support |
| Customer-specific Proposal Knowledge | Customer requirements, policies, evidence and proposal material | The relevant customer or proposal Project only |

Prefer attaching one authoritative knowledge base to several permitted Projects over copying the same source documents into separate knowledge bases. Create a separate knowledge base when ownership, audience, sensitivity, lifecycle or retrieval purpose genuinely differs.

## Project knowledge can combine shared and specialized sources

The effective knowledge available to a Project may include:

- one or more attached knowledge bases;
- sources and artifacts governed for that Project;
- project-scoped Wiki articles; and
- applicable platform-wide Workbench Handbook guidance.

For example:

```text
Sandz organization / dedicated KB Sandbox instance
|
+-- Sandz-HR
|   +-- Sandz Shared Knowledge
|   +-- Sandz HR Knowledge
|
+-- Sandz-Sales Funnel
|   +-- Sandz Shared Knowledge
|   +-- Zadara Product Knowledge
|   +-- Sandz Finance and Commercial Knowledge (only where authorized)
|
+-- Sandz-Call Center Support
|   +-- Sandz Shared Knowledge
|   +-- Zadara Product Knowledge
|   +-- Call Center Knowledge
|
+-- Sandz-Zadara Pilot
    +-- Sandz Shared Knowledge
    +-- Zadara Product Knowledge
    +-- pilot-specific evidence and Wiki guidance
```

There is no automatic inheritance merely because Project names share a prefix. Every knowledge-base attachment and every Project membership must be deliberate.

## Sources, knowledge bases and Wiki articles are different

These concepts work together but are not interchangeable.

### Source document

The original evidence uploaded to KB Sandbox, such as a policy, manual, proposal, specification or report. Sources are versioned, parsed and reviewed. Updating an authoritative document should normally create a new version rather than silently replacing history.

### Knowledge base

The governed collection in which approved source-derived knowledge is organized and retrieved. It may be reused by several authorized Projects.

### Wiki article

Human-reviewed explanatory guidance. A Wiki article may summarize or interpret approved evidence, document an established Method, or explain how the platform works. A Wiki article may be public, platform guidance or Project-scoped.

In simple terms:

> **Sources preserve the evidence. Knowledge bases organize retrievable evidence. Wiki articles explain what has been established.**

Approval of a source or Wiki article does not automatically make it public or available to every Project.

## Project views depend on role, membership and authorization

KB Sandbox should present different views of the same organization without weakening its access boundaries.

| User | Primary view | What the user may see | Important boundary |
|---|---|---|---|
| Platform administrator or curator | Organization portfolio and governance view | All Project names and safe operational metadata, including purpose, owner, status, member count, attached-knowledge count, authority gaps and items needing attention | A full portfolio view is **not** unrestricted access to private source titles, document contents, artifacts or conversations |
| Project owner or Project curator | Project management view | The Projects they govern, their members, approved knowledge attachments, governance configuration and content for which they are authorized | Resource-level restrictions still apply inside the Project |
| Consultant, viewer or other Project member | Ember-first member workspace | Only Projects where they have active membership, plus sources, documents, Wiki guidance and artifacts they are separately permitted to use | Membership in one Project reveals nothing about another private Project |
| Authenticated non-member | No private Project workspace | Public material and any other explicitly granted platform content | Authentication or employment alone does not grant Project access |

The administrator/curator portfolio is an operational overview. It may identify that a Project exists and requires action without exposing the names, snippets, contents or conversation history of restricted evidence. Where exceptional access is ever needed, it should be a separate, explicit and audited process rather than an implicit platform-role bypass.

For ordinary members, the intended primary experience is increasingly **Ember-first**. The user should be able to:

1. choose from only the Projects they are allowed to use;
2. see which Project currently scopes the conversation;
3. ask Ember for help using that Project's permitted knowledge;
4. follow safe links to relevant pages, sources and artifacts; and
5. switch Project context without carrying private evidence from one Project into another.

Ember must apply both access layers before retrieving or citing evidence. If a user may enter a Project but may not view a particular restricted source, Ember must not retrieve, summarize, cite or reveal the existence of protected source content.

This role-aware, Ember-first experience is the near-term product direction. The current application already supports access-scoped Project listings and project-bound Ember conversations, but the dedicated staff portfolio and simplified Ember-first member home remain product work rather than completed behavior.

## Access control operates at two levels

KB Sandbox applies access controls at both the Project and resource levels.

### Level 1 — Project access

A user must be an active member of a Project to enter its private workspace and use its project-bound context.

Project access governs participation in the Project, including its:

- pages and work areas;
- Project-bound Ember entry point;
- Workstreams and Project artifacts; and
- attached knowledge, subject to the second access layer below.

Authentication alone does not grant access to every Project. A platform role such as admin, curator, consultant or viewer must not be treated as automatic customer authorization. Users should be added explicitly to each Project they are permitted to use.

### Level 2 — Resource, document and source access

Membership in a Project does not necessarily grant access to every source or document associated with it.

Resource-level access policies can restrict particular:

- knowledge sources;
- Wiki articles;
- Workstream artifacts; and
- other supported evidence resources.

This is useful when most Project members may use general evidence but only a smaller group may access pricing, customer-confidential, HR, security or other restricted material.

For example, a Sales Project may include ten members, while historical customer pricing is available only to the sales manager and authorized commercial staff. The Project permits participation; the resource policy restricts the sensitive evidence inside it.

The strictest applicable rule continues to apply. Attaching a knowledge base to a Project does not override a source's resource-level restriction.

## Human access and AI-processing sensitivity are separate

KB Sandbox also distinguishes between:

1. **who may see or retrieve the information**; and
2. **which AI provider, model or environment may process the information**.

A user might be authorized to read a Restricted engineering document while a public cloud model is not authorized to receive it.

Information sensitivity therefore does not replace Project or resource access. It adds another control at the AI-processing boundary.

Ember must not describe a Project as restricted, isolated or secured merely because its name or Workstream guardrail says so. Those descriptions are true only when the relevant membership, resource policies and information-sensitivity controls have actually been configured.

## Knowledge attachment does not change ownership or visibility

When a knowledge base is attached to another Project:

- its sources are not copied;
- its version history is not reset;
- its source owner does not change;
- its resource restrictions remain in force;
- its information sensitivity remains in force;
- the receiving Project does not automatically gain permission to administer it; and
- detaching it removes that Project context without deleting the knowledge base.

This allows reusable organizational knowledge without weakening provenance or access controls.

## Example: establishing Sandz

A practical initial topology could be:

| Project | Purpose | Attached knowledge | Important exclusions or restrictions |
|---|---|---|---|
| Sandz-HR | Employee policy and HR operations | Sandz Shared Knowledge; Sandz HR Knowledge | HR membership; personal and employee sources restricted |
| Sandz-Accounting | Finance procedures and accounting work | Sandz Shared Knowledge; Finance and Commercial Knowledge | Financial and customer records limited to authorized staff |
| Sandz-Logistics | Delivery, inventory and operational coordination | Sandz Shared Knowledge; Logistics Knowledge | Customer or supplier-specific evidence restricted as required |
| Sandz-Sales Funnel | Opportunities, proposals and sales progression | Sandz Shared Knowledge; approved product knowledge; selected commercial knowledge | Pricing and customer history restricted to sales/commercial authorities |
| Sandz-Call Center Support | Grounded support and escalation | Sandz Shared Knowledge; Zadara Product Knowledge; Call Center Knowledge | No HR, unrelated pricing or other-customer evidence |
| Sandz-Zadara Pilot | Governance, evaluation and pilot delivery | Sandz Shared Knowledge; Zadara Product Knowledge; pilot evidence | Membership limited to the pilot team and named authorities |

This is an example, not a mandatory template. The organization may create Projects for any durable department, capability, engagement or objective it needs.

## Establishing the structure during onboarding

Use the following sequence:

1. **Confirm the organization/client name.** In the current model this is the organization served by the dedicated KB Sandbox instance.
2. **Search existing Projects.** Do not create a duplicate merely because the user described the same work differently.
3. **Agree the naming convention.** Default to `<Organization>-<Purpose>` and use a shared programme prefix for related Projects.
4. **Identify departments, capabilities, engagements and objectives.** Create Projects only where a durable work or access boundary exists.
5. **Identify shared knowledge.** Decide which approved evidence is genuinely reusable across the organization.
6. **Identify specialized knowledge.** Separate HR, finance, commercial, customer, security and other narrow domains where appropriate.
7. **Map knowledge bases to Projects.** Attach rather than copy reusable knowledge.
8. **Assign explicit Project members and roles.** Do not infer membership from employer, email domain or platform role.
9. **Apply resource-level restrictions.** Protect sensitive documents and sources inside otherwise shared Projects.
10. **Set AI-processing sensitivity.** Ensure only eligible AI environments can process the Project and evidence.
11. **Assign approval authorities.** Name the humans responsible for pricing, customer release, security acceptance, HR decisions or other consequential outcomes.
12. **Test both permitted and denied access.** Include Project members, non-members and users who belong to a different department.

## What Ember should do

When helping establish an organization or onboard a department, Ember should:

- explain that the client organization is represented by the dedicated instance, not by a native Organization object;
- search existing Projects before proposing a new one;
- ask which department, capability, engagement or objective the Project represents;
- use the agreed organization-prefixed naming convention;
- distinguish a Project from a Workstream;
- recommend shared and specialized knowledge bases;
- explain that knowledge-base attachment does not override source restrictions;
- distinguish Project membership from resource-level access;
- show or confirm the Project currently governing the conversation;
- offer only Projects the user is authorized to enter when switching context;
- avoid carrying retrieved private evidence across Project contexts;
- distinguish human access from AI-processing sensitivity;
- state clearly which configuration she actually completed and which action still requires a human; and
- use the live navigation guide before directing the user to a specific page.

Ember should not claim that naming, a written guardrail or knowledge-base attachment has secured the Project.

## Common mistakes

- Creating a duplicate Project without searching existing Projects.
- Creating one Project called after the organization and putting every department's work inside it.
- Treating Project names as a technical hierarchy or inheritance system.
- Assuming Projects with the same prefix automatically share members or knowledge.
- Copying the same authoritative source into several knowledge bases.
- Attaching a knowledge base without reviewing whether every source in it is appropriate for the receiving Project.
- Assuming Project membership grants access to every restricted document inside the Project.
- Treating a platform administrator as automatically authorized for customer-private evidence.
- Using a Workstream guardrail as though it were an enforced access policy.
- Saying information is Restricted without applying a real classification or sensitivity control.
- Confusing source approval, Wiki approval, Project attachment and public publication.
- Asking Ember from general chat and expecting project-private evidence to be retrieved.

## Current implementation boundary

Available today:

- a dedicated single-client deployment convention;
- Projects as governed workspaces;
- explicit Project membership and Project roles;
- many-to-many Project-to-knowledge-base attachment;
- versioned source documents and reviewed source content;
- Project-scoped and platform Wiki guidance;
- Project and resource-level evidence access controls;
- separate AI-processing information sensitivity;
- named Project approval authorities; and
- access-scoped Project listings; and
- project-bound Ember retrieval with access-controlled evidence.

Not currently automatic:

- a native Organization record or shared multi-tenant SaaS boundary;
- parent-child Project hierarchy;
- membership inheritance between related Projects;
- knowledge-base inheritance based on Project naming;
- organization-wide policy inheritance; or
- a dedicated administrator/curator portfolio that exposes safe governance metadata without private content;
- a simplified Ember-first home for ordinary Project members; or
- fully automated workspace provisioning from an onboarding conversation.

Until those capabilities are deliberately implemented and tested, organization and Project names document the structure for people and Ember; they do not replace explicit membership, attachment and policy configuration.

## Quick reminder

> **Organization = the client served by the KB Sandbox instance.**
>
> **Project = a governed workspace for a department, capability, engagement or objective.**
>
> **Knowledge base = reusable approved evidence attached to authorized Projects.**
>
> **Project membership controls entry to the workspace. Resource policies control sensitive sources inside it. Information sensitivity controls which AI environments may process it.**
