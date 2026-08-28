# Sandz Edge Deployment — Requirements & Info Needed (Lunch Agent)

**Purpose:** discussion-prep checklist for Mike's conversation with Sandz about hosting the Lunch
Agent (and, longer-term, KB Sandbox + Supabase) on their edge/regional infrastructure. Not a build
spec — a list of what we need to *ask them* before any real deployment can happen.

**Scope note:** this is written for the Lunch Agent specifically, but most of it generalizes to
"any registered agent on Sandz infrastructure" and to the bigger "KBS + Supabase on Sandz edge"
work item Mike flagged as separate. Marked inline where something is Lunch-Agent-specific vs.
general-platform.

## 1. Compute & runtime environment

- What's actually available: VM, container runtime (Docker/Kubernetes), or bare-metal/edge box?
- Node.js support confirmed (both the main KBS app and the Lunch Agent mock are Node/Express) --
  or do we need a container image instead of a native runtime assumption?
- Minimum spec for a single agent instance (CPU/RAM) -- the mock is trivial, but a real
  implementation calling an outlet's POS/API will need more headroom.
- Process supervision / auto-restart on crash (systemd, Docker restart policy, PM2, k8s) so the
  agent doesn't silently stay down.
- **Environment separation**: does Sandz offer distinct sandbox/staging vs. production tiers?
  The Agent Registry's whole certification ladder (Experimental -> Sandbox Tested -> Security
  Reviewed -> Outlet Accepted -> Production Approved) assumes a version can run isolated from
  anything real before promotion -- need to know if that maps to two actual Sandz environments or
  one environment we have to simulate isolation within.

## 2. Networking & the MCP endpoint

- A stable, KBS-reachable **public endpoint URL** for the registered agent -- this becomes
  `external_agents.endpoint_url` in the registry. Does Sandz provide a subdomain/static
  IP/hostname, or do we bring our own domain and they route to it?
- **TLS**: who terminates HTTPS and manages certificate renewal -- a Sandz-managed
  load-balancer/reverse-proxy, or do we provision certs ourselves?
- **Inbound firewall**: does KBS need to be allowlisted by source IP to reach the agent? What IP
  range(s) would our calls originate from, and is that even how Sandz's firewall works?
- **Streaming/MCP compatibility**: MCP's Streamable HTTP transport can use SSE-style streaming
  responses -- does anything in Sandz's network path (proxy, load balancer, WAF) buffer or block
  chunked/streaming HTTP? Worth confirming before we assume a plain POST endpoint just works
  behind their infra.
- **Outbound access from the agent**: once this connects to a real outlet's POS/API (or GrabFood's
  API later), does the agent's environment allow outbound internet calls, or is egress locked down
  and needs explicit allowlisting per external API?
- **Inbound webhooks**: real outlet/POS integrations often push order-status updates via webhook --
  that's a different requirement (a public endpoint that receives, not just one that we call).
  Does Sandz's environment support that, or does everything have to be polling-based?
- Region/physical location of the actual hosting -- affects latency for both
  KBS-to-agent and agent-to-outlet calls, and matters for the data-residency question below.

## 3. Credentials & secrets

- Both source docs are explicit that "customer credentials and transactional data remain in the
  appropriate region," in a "Sandz-managed secret store." Concretely: **does Sandz offer an actual
  secrets-management service** (Vault-style, or a managed secret store), and what's the interface
  to it -- API, dashboard, env-var injection at deploy time?
- Support for short-lived/rotatable tokens, or only static long-lived secrets?
- Who actually holds real outlet/merchant credentials once this moves past the mock stage --
  Sandz, or does the builder/KBS still manage them, with Sandz just hosting the runtime?

## 4. Data residency & storage

- Confirmation of which country/region the physical infrastructure sits in -- matters for
  PH-specific data handling given this is a Philippines-focused pilot.
- Does Sandz provide a database/storage service for the agent to persist order state? The mock
  uses in-memory storage (deliberately, since it's throwaway) -- a real deployment needs real
  persistence. Options to raise: our own Supabase, a Sandz-provided DB, or agent-local storage.
- Backup/retention policy for whatever storage is used.

## 5. Observability & operations

- Logging/monitoring: does Sandz provide log aggregation and alerting, or do we bring our own (and
  if so, is outbound shipping to an external log service even allowed under their egress rules)?
- Expected health-check convention (e.g., does their load balancer expect a `/health` route with a
  specific response shape)?
- **First-line support**: the doc's own operating model says "Sandz: provide first-line
  infrastructure support" -- need the actual specifics: SLA, response time, escalation path, who
  gets paged when the agent goes down.
- **Deployment mechanism**: how do we ship a new version -- CI/CD pipeline access, manual
  artifact upload, git-based deploy? Does Sandz support side-by-side/blue-green deployment, or is
  it stop-old-start-new? This matters directly for the certification model -- ideally a new
  version can run at "Sandbox Tested" without disrupting whatever's already "Production Approved."

## 6. Compliance & policy boundary

- Any restriction on what workloads/data are allowed on their infra, even for a sandbox/mock
  agent -- the Sandz Schools Hackathon appendix already anticipates Sandz defining "prohibited
  workloads and data" for that program; the same question applies here.
- Does any agreement (DPA, security review, sign-off) need to be in place before even a
  sandbox-tier deployment goes on their infrastructure?

## 7. Cost & commercial terms

- Actual pricing for the compute/hosting tier this would run on -- the doc leaves "Sandz
  infrastructure: quoted separately," so this is the concrete quote to request.
- Whether Sandz will donate or discount hosting specifically for the Phase 1 showcase, per the
  doc's own suggested arrangement ("ask Sandz to provide a limited showcase environment at no cost
  or a documented promotional rate").

## Suggested order to raise these in

1. **Environment + endpoint basics** (1, 2) -- without a real reachable URL and a runtime target,
   nothing else can be tested for real.
2. **Credentials + data residency** (3, 4) -- these shape the security review before anything
   handles even test data seriously.
3. **Ops/support model** (5) -- needed before committing to anything beyond a demo.
4. **Compliance sign-off + cost** (6, 7) -- gates whether this can actually go live, even at
   showcase scale.

Once these are answered, the next KBS-side step is filling in `external_agents.endpoint_url` for
the Lunch Agent registration with Sandz's real endpoint, and building the still-missing Agent
Gateway (MCP client + credential resolution + spending-limit enforcement + confirm-gate UI) against
it -- see `mock-lunch-agent/README.md` for exactly what that gateway still needs to do.
