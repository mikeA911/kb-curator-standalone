# Private AI Deployment Is an Operating Model, Not a Docker File

## Moving an AI application into a customer-controlled cloud changes ownership, not just hosting

“Can we deploy it privately?” sounds like an infrastructure question. The first answer is often reassuring: package the application in a container, deploy its database alongside it, configure a domain, and start the services.

That may produce a working installation. It does not yet produce a supported private service.

Private deployment changes who is responsible for security, upgrades, backups, recovery, monitoring, identity, data location, and external AI connections. It is an operating model—not merely a different destination for the same application build.

## There are several meanings of private

Organisations may use “private AI” to describe very different arrangements:

- The application runs in the vendor’s cloud but uses isolated customer data
- The application runs in the customer’s Azure or AWS account
- The full application and data platform run on customer-controlled infrastructure
- The system operates in an isolated network with restricted internet access
- The AI model itself also runs locally

These options provide different boundaries. Hosting an application inside a private cloud does not make it fully private if prompts and documents are still sent to an external model provider.

The deployment description should identify every material processing location: application, database, file storage, identity, logs, backups, email, analytics, and AI inference.

## “Deployed together” should not mean one container

A modern application may rely on a web service, database, authentication, object storage, queues, monitoring, and supporting APIs. These can be packaged as one deployable stack while remaining separate services.

That separation supports durable storage, independent upgrades, health checks, scaling, and recovery. A database should not disappear when an application container is replaced.

Self-hosted platforms such as Supabase illustrate the distinction. Supabase documents a multi-service Docker deployment and makes clear that operators assume responsibility for provisioning, maintenance, security, PostgreSQL operations, backups, disaster recovery, monitoring, availability, and scaling. [Supabase self-hosting overview](https://supabase.com/docs/guides/self-hosting)

## Managed features become operational duties

When moving away from managed platforms, teams must replace capabilities they may not realise they were receiving:

- Automated backups and point-in-time recovery
- Security updates
- Managed certificates and routing
- Availability monitoring
- Capacity management
- Secret storage and rotation
- Database upgrades
- Tested restoration procedures
- Incident response and support

A backup that has never been restored is only an assumption. A private deployment needs documented recovery objectives, off-machine copies, restoration tests, and named operational owners.

## Portability should be designed before it is needed

Applications remain easier to move when they:

- Use standard production containers
- Keep persistent data outside the application container
- Maintain repeatable database migrations
- Expose health endpoints
- Document all required configuration and secrets
- Send logs and metrics to configurable destinations
- Run long work as durable background jobs
- Avoid unnecessary dependencies on a single hosting provider

Portability does not mean refusing useful managed services. It means understanding which services are being used and maintaining a credible replacement path.

## External AI remains part of the architecture

A customer may control the application and database while allowing approved calls to an external AI provider. Another customer may require all inference to remain inside its network.

These are separate product profiles. A locally hosted model introduces its own requirements for compute, model lifecycle, evaluation, security, and performance. It should not be described as a simple configuration toggle unless it has genuinely been tested and supported.

## Start with an honest availability profile

A first private release may reasonably run on one Linux server with durable encrypted volumes and automated off-machine backups. That can be useful, but it is not automatically highly available.

High availability requires separate engineering: multiple application instances, resilient data services, replicated storage, load balancing, monitoring, failover, and rehearsed recovery.

The service description should state which profile is being offered rather than allowing “private cloud” to imply enterprise resilience by default.

## The real product is operational confidence

The container image is important. The more difficult deliverables are installation automation, version compatibility, security guidance, migration tooling, monitoring, upgrade procedures, backup restoration, and support ownership.

That is why private deployment should be planned as a product capability. The technical stack gets the application running. The operating model keeps customer data and work available, secure, and recoverable after the installation team has left.

---

*Suggested Substack note:* Private AI deployment is not complete when the containers start. The real product includes backups, upgrades, recovery, monitoring, and clarity about where inference happens.

*This article provides general information and does not constitute security, legal, or compliance advice.*

