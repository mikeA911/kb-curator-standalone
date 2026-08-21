# KB Sandbox Deployment and Server Options

## From a managed cloud service to a private enterprise deployment

KB Sandbox is currently well suited to Vercel and managed Supabase, but its architecture does not require it to remain there. The application can also be deployed to Microsoft Azure, Amazon Web Services (AWS), a customer's private cloud, or an organisation's own infrastructure.

This document explains the principal deployment choices, their trade-offs, and a recommended path for making KB Sandbox portable without slowing current product development.

> **Publication note:** This document is written so that its explanatory sections can be adapted into an article for the `kbsandbox.tech` website. Operational details and estimates should be reviewed before publication.

## Executive summary

KB Sandbox has relatively little dependency on Vercel-specific services. It is primarily a Next.js application connected to Supabase for its database, authentication, and file storage, with external AI providers selected through configuration.

There are two levels of migration:

1. **Move only the KB Sandbox application.** Keep managed Supabase and the existing AI providers. This is a comparatively straightforward deployment change.
2. **Move the complete platform.** Deploy KB Sandbox together with a self-hosted Supabase stack. This provides greater data control and supports private or isolated installations, but transfers substantial operational responsibility to KB Sandbox or the customer.

For the present public service, Vercel and managed Supabase remain the lowest-maintenance choice. In parallel, KB Sandbox should develop and regularly test a container-based private deployment package.

## Deployment options at a glance

| Option | Best suited to | Principal advantage | Principal trade-off |
| --- | --- | --- | --- |
| Vercel with managed Supabase | Public service and rapid product development | Simplest Next.js deployment and lowest operational burden | Platform runtime limits and less infrastructure control |
| Azure with managed Supabase | Organisations already standardised on Microsoft Azure | Enterprise networking, governance, identity, and regional controls | More configuration and operational responsibility |
| AWS with managed Supabase | Organisations already standardised on AWS | Broad infrastructure choice, regions, security, and scaling controls | More infrastructure components and operational complexity |
| Azure or AWS with self-hosted Supabase | Private enterprise installations | Application and customer data can remain inside the customer's cloud boundary | KB Sandbox or the customer must operate the database platform |
| On-premises or isolated deployment | Regulated, sovereign, or disconnected environments | Maximum control over data location and external connectivity | Highest support, upgrade, backup, and availability burden |

## Option 1: Vercel and managed Supabase

Vercel provides the most direct operational experience for a Next.js application. Deployment previews, application builds, routing, image handling, and server functions require comparatively little infrastructure work.

Managed Supabase separately provides the PostgreSQL database, authentication, storage, backups, and platform administration.

This combination is a strong fit while KB Sandbox is evolving quickly because engineering effort can remain focused on product capability. Its principal limitation is that application execution remains subject to Vercel plan, memory, and duration constraints. Long-running work such as journal generation, document assessment, and AI evaluations should therefore move toward background jobs regardless of the eventual hosting platform.

## Option 2: Microsoft Azure

KB Sandbox can run as an ordinary Node.js application or as a container in Azure.

Likely services include:

- **Azure App Service** for the simplest managed Node.js or container deployment.
- **Azure Container Apps** when container scaling, private networking, managed secrets, or background workers are important.
- **Azure Database, storage, and identity services** only if a future edition replaces Supabase rather than self-hosting it.

Azure is particularly attractive when customers already use Microsoft enterprise identity, networking, governance, and security tooling. A container deployment also avoids tying the application to an Azure-specific application framework.

## Option 3: Amazon Web Services

On AWS, the application should likewise be deployed as a standard container.

Likely services include:

- **AWS App Runner** for a relatively simple managed container service.
- **Amazon ECS with Fargate** when more control over networking, scaling, and supporting services is required.
- **Amazon RDS, S3, and Cognito** only if a future edition replaces Supabase with AWS-native components.

AWS Amplify should not be the initial target for the current application without a fresh compatibility review. At the time of writing, AWS's published managed SSR support identifies Next.js versions through version 15, while KB Sandbox uses Next.js 16. A normal container deployment provides a clearer compatibility boundary.

## Option 4: A complete private KB Sandbox deployment

A private installation would package KB Sandbox and self-hosted Supabase as one deployable product while keeping them as separate services.

```text
Users
  |
Reverse proxy and HTTPS
  |-- kbsandbox.example.com --> KB Sandbox container
  `-- data.example.com ------> Supabase API gateway
                                      |
                                      |-- Authentication
                                      |-- REST API
                                      |-- Realtime
                                      |-- File storage
                                      |-- PostgreSQL
                                      `-- Administration Studio
```

The distinction is important: deployed together does not mean placed in one container. Supabase is itself a collection of cooperating services. Docker Compose is Supabase's documented self-hosting approach and provides a practical first packaging format for a single-server private installation.

This model offers:

- Control over the physical and legal location of customer data.
- Deployment within a customer's Azure or AWS account.
- Deployment on an organisation's own Linux infrastructure.
- The possibility of an isolated environment with no public application access.
- A reduced dependency on Vercel and the managed Supabase platform.
- A credible private-cloud offering for regulated organisations.

External AI providers remain a separate data-processing consideration. A fully isolated installation would require approved outbound connectivity or a compatible locally hosted AI model.

## Proposed product editions

### KB Sandbox Cloud

The public service, operated using Vercel and managed Supabase. This edition provides the lowest administration burden and supports rapid releases.

### KB Sandbox Private Cloud

KB Sandbox and a self-hosted Supabase stack deployed inside a customer's Azure or AWS account. The customer controls the cloud boundary, data region, network policies, and access to external AI providers.

### KB Sandbox Local or Isolated

The same application stack deployed on an organisation's server or approved local infrastructure. This edition may restrict internet connectivity and use locally available AI services.

The three editions should share the same application code. Environment configuration should select public URLs, Supabase endpoints, storage behaviour, AI providers, mail delivery, and optional platform capabilities.

## Self-hosted Supabase responsibilities

Self-hosting Supabase provides control, but it is not equivalent to receiving the managed Supabase service inside a Docker container. The operator becomes responsible for:

- Server provisioning and operating-system maintenance.
- PostgreSQL maintenance and version upgrades.
- Supabase service upgrades and compatibility testing.
- Database and file-storage backups.
- Point-in-time recovery or an agreed alternative.
- Restore testing and disaster recovery.
- Security hardening, firewall rules, and TLS certificates.
- Secret generation, storage, and rotation.
- Monitoring, logs, alerts, capacity, and uptime.
- High availability and scaling where required.
- Authentication email delivery and OAuth configuration.

Supabase distinguishes its development CLI stack from a production self-hosted deployment. The local development stack must not simply be exposed to the internet. Production should use the official self-hosted distribution with durable volumes, HTTPS, secure secrets, monitoring, and tested backups.

Supabase currently recommends at least four CPU cores, 8 GB of RAM, and 80 GB of SSD storage for a small-to-medium self-hosted installation. Actual KB Sandbox sizing must be established through load, document-storage, and AI-workload testing.

## Application portability work

The following work would keep KB Sandbox portable across Vercel, Azure, AWS, and private infrastructure:

1. Produce a versioned production container image using the Next.js standalone server output.
2. Add application and dependency health endpoints.
3. Maintain a deployment-independent inventory of required environment variables and secrets.
4. Keep database schema changes in repeatable, versioned migrations.
5. Move long-running journals, evaluations, and large document operations into durable background jobs.
6. Store all persistent files in Supabase Storage or another configured durable store, never in the application container.
7. Add centralised logs, metrics, and operational alerts.
8. Test authentication redirects, cookies, Server Actions, route revalidation, uploads, signed downloads, and image delivery in every supported environment.
9. Automate backups and regularly prove that both PostgreSQL data and stored files can be restored.
10. Publish a supported-version matrix for KB Sandbox, Supabase, PostgreSQL, and container images.

## Migrating the existing managed Supabase project

Moving an existing installation to self-hosted Supabase requires more than copying the database. The migration plan must cover:

- PostgreSQL schema, data, extensions, functions, and triggers.
- Row-level security policies and database permissions.
- Authentication users, identities, providers, templates, and redirect URLs.
- Storage buckets, policies, metadata, and stored files.
- Scheduled processes and database jobs.
- Application secrets, public keys, and service-role credentials.
- A reconciliation step confirming counts, ownership, and isolation after migration.

The managed deployment should remain available during migration testing. Production cutover should use a rehearsed data-freeze, final synchronisation, DNS change, validation, and rollback procedure.

## Availability profiles

A first private release can reasonably target a single Linux server, but its service level must be described honestly.

### Entry private deployment

- One server or virtual machine.
- Docker Compose application stack.
- Durable encrypted storage.
- Automated off-machine backups.
- Documented restoration and upgrade procedures.
- Planned maintenance windows.

### High-availability private deployment

- Multiple KB Sandbox application instances.
- Highly available or managed PostgreSQL architecture compatible with the chosen Supabase design.
- Replicated or durable object storage.
- Load balancing and health-based replacement.
- Centralised monitoring and alerting.
- Tested recovery objectives and operational ownership.

High availability should be a later, separately engineered profile rather than an implied property of the initial single-server package.

## Indicative migration effort

These estimates are planning assumptions, not commitments:

- Moving only the KB Sandbox application while retaining managed Supabase: **one to three days for a proof of concept**, followed by approximately **one to two weeks of production hardening**.
- Producing a supported private deployment with self-hosted Supabase: a larger product initiative requiring installation automation, migration tooling, backup and restore procedures, monitoring, security guidance, upgrade testing, and support documentation.

The private deployment should therefore be planned as a product capability rather than treated as a change of hosting address.

## Recommendation

Continue operating the public KB Sandbox service on Vercel and managed Supabase while product development remains rapid. At the same time, create a tested **KB Sandbox Private** distribution consisting of:

- A production KB Sandbox container.
- A pinned and supported self-hosted Supabase distribution.
- A reverse proxy with HTTPS.
- Durable database and storage volumes.
- Secure environment and secret templates.
- Automated off-machine backup procedures.
- Health checks, monitoring, and recovery documentation.
- A migration and validation process for existing installations.

The first target should be a single Linux server in a non-production environment. Once installation, upgrades, backup restoration, authentication, storage, and AI-provider configuration work reliably, the same package can be qualified for Azure, AWS, and customer-controlled infrastructure.

## References

- [Supabase self-hosting overview](https://supabase.com/docs/guides/self-hosting)
- [Self-hosting Supabase with Docker](https://supabase.com/docs/guides/self-hosting/docker)
- [Restoring a managed Supabase project to self-hosted Supabase](https://supabase.com/docs/guides/self-hosting/restore-from-platform)
- [Updating a self-hosted Supabase deployment](https://supabase.com/docs/guides/self-hosting/updating)
- [Configuring HTTPS for self-hosted Supabase](https://supabase.com/docs/guides/self-hosting/self-hosted-proxy-https)
- [Vercel function duration configuration](https://vercel.com/docs/functions/configuring-functions/duration)
- [Azure App Service for Node.js](https://learn.microsoft.com/en-us/azure/app-service/quickstart-nodejs)
- [Azure Container Apps overview](https://learn.microsoft.com/en-us/azure/container-apps/overview)
- [AWS Amplify support for Next.js features](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html)
