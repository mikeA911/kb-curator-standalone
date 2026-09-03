# Managing Multiple Dedicated Client Deployments

## Decision summary

KB Sandbox should use:

> **One shared product codebase, one isolated deployment per client, configuration and knowledge per client, external integrations per client, and reusable improvements merged into the shared product.**

Do not maintain a permanent Git branch for each customer. Long-lived customer branches eventually become separate products: fixes must be merged repeatedly, database migrations diverge, testing multiplies, and upgrades become increasingly risky.

This note applies the dedicated-instance-first direction recorded in [ADR-0001](../architecture-decisions/ADR-0001-dedicated-instance-first-deployment.md).

## Deployment model

```text
Shared KB Sandbox product repository
        |
        +-- Sandz deployment
        |   +-- separate database and storage
        |   +-- Sandz branding and settings
        |   +-- Sandz users, Projects and knowledge
        |   +-- approved Sandz connectors, MCP servers and agents
        |
        +-- Client B deployment
        |   +-- separate database and storage
        |   +-- Client B configuration and policies
        |   +-- Client B integrations
        |
        +-- Client C deployment
            +-- independently configured environment
```

Each client receives a separate application environment and separate data boundary. The deployments may use the same software version while retaining different users, Projects, knowledge, AI providers, policies, branding and registered integrations.

## Where customization belongs

| Customer difference | Preferred location |
|---|---|
| Organization name, logo, colors and terminology | Deployment/branding configuration |
| Users, Projects, knowledge bases, sources and Wiki content | Client's database and storage |
| Access policies and approval authorities | Client's governed application data |
| Enabled AI providers and models | Per-deployment administration and secrets |
| Optional product capabilities | Feature flags or capability configuration |
| Customer workflows | Workbench Methods, Projects and configuration |
| Knowledge connectors and MCP servers | External services registered for that client |
| Specialized external agents | Versioned external-agent registrations |
| Generally useful product improvement | Shared product code merged into `main` |

Secrets, production credentials and sensitive client configuration must remain in the deployment platform or approved secret manager. They must not be committed to Git.

## Git strategy

Use short-lived branches for product development:

```text
short-lived feature/fix branch
        ↓ review and automated tests
main
        ↓ immutable release build
versioned client deployments
```

Recommended rules:

- `main` is the shared product source of truth.
- Features and fixes use short-lived branches and merge back promptly.
- Each release receives an immutable version or image tag.
- Client deployments record the exact product version in use.
- A client-specific defect is fixed in the shared product whenever possible.
- A feature may initially be enabled only for one client through a safe feature flag, but its code remains part of the tested shared product.
- Database migrations remain forward-compatible and shared across deployments.
- Do not create client-only migration histories that make future upgrades dependent on merge order.

## Release and promotion process

1. Develop and review the change in a short-lived branch.
2. Merge it into `main` after automated tests and human review.
3. Build one immutable release artifact, for example `v1.8.0` or a container image digest.
4. Deploy it to an internal development/test environment.
5. Promote it to a pilot or early-adopter instance such as Sandz.
6. Run migration, access-control and smoke tests.
7. Promote the same artifact to other eligible clients according to their maintenance schedule.
8. Record the version, deployment time and migration result for every instance.
9. Retain a tested rollback or recovery procedure appropriate to the database change.

Clients do not have to upgrade simultaneously, but the supported-version policy should limit how far deployments may lag behind security and schema updates.

## Configuration rather than forks

Before accepting customer-specific code, ask in this order:

1. Can the difference be expressed through client data or policy configuration?
2. Can a feature flag enable a reusable capability for selected deployments?
3. Can a Workbench Method or Project configuration describe the workflow?
4. Can an external connector or MCP server provide the integration?
5. Can a specialized external agent provide the behavior?
6. Can the capability become an optional reusable product module?

Only after these options are exhausted should client-specific application code be considered.

## External integrations are the main extension boundary

The Builders Programme should customize client capability primarily through external, versioned integrations rather than forks of KB Sandbox.

For example, different customers may register:

- HR-policy or payroll connectors;
- sales-proposal tools;
- call-center and ticketing tools;
- food-ordering and delivery MCP servers;
- invoice-processing services;
- operational log and metrics collectors; or
- specialized external agents.

These services may be implemented and hosted by a builder, Sandz or the customer. KB Sandbox records their contracts, intended Projects, evaluation evidence and approval state without requiring their implementation code to become part of the KB Sandbox repository.

This boundary allows rapid customer customization while keeping the core platform upgradeable.

## Suggested configuration shape

A future deployment manifest may contain non-secret settings such as:

```yaml
deployment:
  client_key: sandz
  display_name: Sandz
  region: southeast-asia
  release_channel: pilot

branding:
  logo_asset: sandz-logo
  accent_theme: sandz

capabilities:
  project_explorer: true
  external_agent_registry: true
  controlled_mcp_execution: false
```

This is illustrative rather than a required schema. Secret values, provider credentials, endpoints containing sensitive information and production identifiers must not be stored in a public or shared configuration file.

## Client-specific extension exception

If a requirement genuinely cannot be represented through configuration, a feature flag, a connector, an MCP server, an external agent or a reusable module, create a documented exception before writing client-only code.

The exception should identify:

- why existing extension mechanisms are insufficient;
- whether the behavior belongs in the product long term;
- code ownership and maintenance responsibility;
- security and data implications;
- testing required for shared releases;
- how database compatibility will be preserved; and
- the plan for removal, generalization or migration to a stable extension interface.

Prefer a versioned plugin or extension contract over a permanent customer branch. A branch may be used temporarily during development, but it should not become the customer's indefinite production source of truth.

## Operational considerations

Managing multiple dedicated deployments requires a small deployment inventory containing at least:

- client/deployment identifier;
- hosting environment and region;
- current application version;
- database migration version;
- release channel;
- deployment status and last successful verification;
- backup and recovery status;
- responsible operator;
- maintenance window; and
- enabled capability flags.

Do not put client source contents, user details, credentials or private URLs into a broadly accessible inventory.

As the number of customers grows, deployment automation should provision, upgrade, test and report on each instance consistently. Dedicated deployments provide stronger isolation, but they should not require entirely manual operations for every customer.

## Relationship to a future shared SaaS edition

This approach does not prevent a future multi-tenant SaaS edition. It provides a clean operating model while customer requirements, security boundaries and deployment preferences are still being learned.

The shared codebase and configuration discipline preserve that option. Client branches and divergent schemas would make a later SaaS edition substantially harder.

## Practical rule

> **Customize the deployment, knowledge, policies and external capabilities—not the core product branch.**

When a customer request improves KB Sandbox generally, merge it into the shared product. When it is specific to the customer's business systems, implement it through a governed connector, MCP server or external agent wherever possible.
