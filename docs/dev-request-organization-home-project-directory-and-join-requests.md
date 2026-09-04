# Organization Home Project, Project Directory, and Join Requests

## Context

`Sandz General` currently exists as a Knowledge Base (`sandz-general`), not as a Project. It is
attached to `Sandz Pilot Feedback and Q&A`, but there is no clear organization-level Project that
acts as Sandz's home, explains the rest of the Project structure, or helps a user find and request
access to an appropriate Project.

The distinction must remain explicit:

- A **Project** organizes people, purpose, conversations, work, permissions, and attached knowledge.
- A **Knowledge Base** contains governed source evidence and can be attached to one or more Projects.
- A Knowledge Base does not attach another Knowledge Base.

The desired structure is therefore a `Sandz — Organization Home` Project that attaches the
`Sandz General` Knowledge Base and any other approved organization-wide Knowledge Bases, such as a
separate Sandz public-information KB. The Project—not the KB—provides the directory and membership
request experience. It is also Sandz's deliberately public-facing KB Sandbox entry point: selected
content can be reached from outside the organization through the website and the platform MCP,
without making private Projects or sources public.

## Goal

Give every single-client KB Sandbox instance a clear organization entry point where authorized
users can:

1. understand the organization and its KB Sandbox structure, including as an approved external
   visitor;
2. use Ember against approved organization-wide knowledge;
3. see Projects that are safe for them to discover;
4. identify each Project's owner/curator contact;
5. request membership without automatically receiving access; and
6. navigate from a Knowledge Base synopsis to a useful, permission-safe destination.
7. expose explicitly published organization knowledge and Project-discovery metadata through the
   KB Sandbox MCP for approved external consumers.

## Phase 1 scope

### 1. Establish an Organization Home Project pattern

Seed or create a normal Project named:

> Sandz — Organization Home

Recommended characteristics:

- Project type: `Internal Transformation` or a future explicit `Organization Home` type.
- Status: active.
- Purpose: the main governed entry point for Sandz users and approved external visitors.
- Owner: the designated Sandz platform owner or lead curator.
- Starter prompt: “Ask about Sandz, find the right Project, or request access to a team workspace.”
- Attached Knowledge Bases:
  - `Sandz General`;
  - the recently approved Sandz public-information Knowledge Base, once its exact identifier is
    confirmed;
  - other KBs only when they are intentionally organization-wide.

Do not attach restricted departmental, customer, pricing, HR, contract, or support Knowledge Bases
to the Organization Home Project merely to make them discoverable.

The Project must have an explicit public-facing configuration. Public-facing does not mean that
all attached knowledge becomes public. Each Project description, Wiki article, source, artifact,
and MCP capability must still pass its own publication and access checks.

### 2. Organization Project directory

Add a read-only **Projects at Sandz** section to the Organization Home Project.

Each discoverable entry should show only safe metadata:

- Project name;
- short purpose/description;
- category or business function;
- status where appropriate;
- Project owner;
- designated Project curator(s) or access contact;
- the current user's membership state;
- **Open Project** when the user is already an active member;
- **Request to join** when the Project is discoverable but the user is not a member;
- **Request pending** after a request has been submitted.

The directory must not expose source names, Knowledge Base contents, conversations, artifacts,
notes, member lists, customer details, or other protected Project information to a non-member.

### 3. Project discoverability

Membership and discoverability are different concepts. A user may be allowed to know that a
Project exists without being allowed to open it.

Add or reuse an explicit Project-level discoverability policy with at least:

- `public` -- safe, explicitly published Project metadata may be viewed outside the organization
  and exposed through authorized public MCP discovery;
- `organization` -- authenticated users in this single-client instance may see safe directory
  metadata and request access;
- `members_only` -- only active members and specifically authorized platform functions may know
  the Project exists.

Default new Projects to `members_only` unless their creator deliberately makes them organization-
discoverable. The onboarding wizard should explain the difference. Never infer discoverability
from an attached shared Knowledge Base alone.

For the pilot, Projects such as Sandz HR, Sales Proposals, Call Center Support, and Pilot Feedback
may be organization-discoverable if their names and descriptions are safe. Customer-confidential,
pricing, legal, security, and investigation Projects should normally remain members-only.

Only the Organization Home Project and other deliberately selected showcase or public-information
Projects should normally use `public`. Publishing a Project directory entry must never publish the
Project workspace or any attached KB automatically.

### 4. Request-to-join workflow

Create a durable Project membership request rather than sending an informal note.

Minimum record:

- requester;
- Project;
- optional short reason;
- status: `pending`, `approved`, `declined`, `cancelled`;
- requested timestamp;
- deciding user and timestamp;
- optional decision note.

Rules:

- Only an authenticated active user may request access for themselves.
- A user cannot request access to a non-discoverable Project they cannot already see.
- Existing active members cannot create duplicate requests.
- Only one pending request per user and Project.
- The Project owner or a Project curator may approve or decline the request.
- Approval creates or activates Project membership at the lowest ordinary Project role (`viewer`,
  displayed to users as Member if that terminology is adopted).
- Approval must not grant platform `curator` or `admin` authority.
- A higher Project role requires a separate explicit assignment by an authorized person.
- Declining a request reveals no protected Project information.
- Every decision is auditable.

### 5. Owner/curator review experience

On the Project page and/or Members page, show pending membership requests to the Project owner and
curators. Allow them to review the requester, reason, and existing safe profile details before
choosing **Approve as Member** or **Decline**.

Do not make platform administrators automatic content viewers. A platform administrator may
operate or route the request only within the existing security design; platform authority must not
silently become customer authorization to Project evidence.

### 6. Ember support

When invoked from the Organization Home Project, Ember should be able to:

- explain the purpose of visible Projects using safe directory metadata;
- help the user identify the most relevant Project;
- navigate an existing member to that Project;
- offer **Request to join** for a discoverable Project;
- explain that approval is controlled by the Project owner/curator;
- report that a request is pending without inventing an expected approval time.

Ember must not retrieve or summarize the target Project's private knowledge for a non-member. Safe
directory metadata is not Project evidence and must not be presented as though access has already
been granted.

### 7. Public website and MCP access

Expose the Organization Home as a controlled external entry point through both:

- a stable public web route suitable for sharing with customers, partners, and prospective users;
- the KB Sandbox MCP, so approved external AI clients can discover and read the same published
  organization information.

The externally available representation may include only explicitly published fields and content,
such as:

- organization name and public description;
- approved public contact or access-request route;
- public Project name, purpose, category, and public owner/contact label where deliberately set;
- public Wiki guidance and public-information sources;
- links to public blog posts, Methods, showcases, or other approved resources.

MCP requirements:

- provide a resource or read-only tool for retrieving the public Organization Home;
- provide a resource or read-only tool for listing public/discoverable Projects using only their
  safe directory metadata;
- return stable identifiers, canonical web links, publication timestamps, and provenance;
- use the same authorization and publication service as the web experience rather than a separate
  permissive query;
- support anonymous read only if the material is explicitly public; require an authenticated or
  scoped access token for partner-only external access;
- do not expose membership lists, join-request records, private source metadata, conversations,
  artifacts, credentials, or unpublished content;
- do not provide mutation tools in this phase.

An external visitor may be offered **Sign in to request access**, but the actual membership request
must occur only after authentication. A public page or MCP consumer cannot create membership or
infer whether a particular person is already a member.

### 8. Repair the Knowledge Base synopsis dead end

The `/wiki` Knowledge Bases synopsis currently displays Knowledge Base names and descriptions but
provides no useful navigation.

For each KB card, provide a permission-aware destination:

- authorized curator/admin: open a KB summary showing safe metadata, approved source inventory,
  attached Projects, and the existing curation route;
- ordinary member: show only Projects through which that member is authorized to use the KB, with
  links to those Projects;
- user with no authorized route: do not expose source inventory; show a neutral explanation or no
  link.

A KB summary is not a second Project page and must not become an access-control bypass.

## Suggested organization-home content

The Sandz Organization Home Project should explain:

- what Sandz does and the approved public/company context;
- how Sandz uses KB Sandbox;
- that Projects represent departments, engagements, pilots, or defined work;
- that Knowledge Bases provide the evidence attached to those Projects;
- that Project membership and source-level permissions control what Ember can use;
- who owns or curates each discoverable Project;
- how to request access or ask for a missing Project/FAQ.

Clearly divide this content into **Public information**, **Organization-only guidance**, and
**Member-only Project knowledge**. Ember and the MCP must preserve those boundaries in every
response.

## Acceptance criteria

1. `Sandz General` remains a Knowledge Base and is attached to a real Sandz Organization Home
   Project.
2. The Organization Home Project can attach more than one approved organization-wide KB.
3. An ordinary member sees a directory containing only Projects marked organization-discoverable
   plus Projects where they are already a member.
4. A non-member sees safe metadata for a discoverable Project but cannot open its private workspace
   or retrieve its knowledge.
5. A non-member cannot discover a members-only Project through the directory, Ember, search, direct
   API calls, or KB synopsis pages.
6. **Request to join** creates exactly one pending request and grants no immediate access.
7. The Project owner/curator can approve the request as an ordinary member or decline it.
8. Approval activates Project membership without elevating the user's platform role.
9. Ember can guide and navigate the user through the directory and request flow without exposing
   private Project evidence.
10. KB synopsis cards provide useful permission-aware navigation rather than remaining dead ends.
11. Existing strict Project, source, Wiki, conversation, artifact, and Knowledge Base retrieval
    permissions remain intact.
12. An unauthenticated visitor can open only the Organization Home content explicitly marked
    public and cannot see organization-only or member-only metadata.
13. A scoped external MCP client receives the same public information, canonical links, and
    provenance as the web route, with no broader access.
14. Publishing the Organization Home or a Project directory entry does not implicitly publish its
    attached Knowledge Bases, sources, members, conversations, or artifacts.
15. An external visitor must authenticate before submitting a Project membership request.

## Non-goals

- `parent_project_id` or a formal Project hierarchy.
- Automatic membership based on department, email domain, or attached Knowledge Base.
- Allowing an Organization Home Project to retrieve every departmental KB.
- Exposing all Project names to all users.
- Replacing Project membership with a social-network-style open directory.
- Public write or mutation operations through MCP.
- Treating possession of an MCP endpoint URL as authorization to restricted content.
- Multi-tenant organization support; the current deployment remains one client per KBS instance.

## Documentation and roadmap

When implemented:

- add the Organization Home pattern to the client-onboarding Method;
- update the KB Sandbox Vocabulary and organization-structure Wiki;
- teach Ember through the capability/navigation catalogue;
- document the public web and MCP Organization Home contracts, including field-level publication
  rules and example responses;
- add the feature to the private owner roadmap/change register; and
- include a regression matrix covering anonymous visitor, scoped external MCP client, member,
  non-member, curator, owner, and platform-admin views.
