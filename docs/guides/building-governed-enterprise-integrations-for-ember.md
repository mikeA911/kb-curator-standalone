# Building Governed Enterprise Integrations for Ember

**Status:** Draft guide, not yet a Workbench Method. Candidate for promotion into the Wiki's `platform_handbook` category once one real integration (the OrderLunch MCP server, Docker-tested, pointed at by a real registration) has been carried end-to-end through everything described here -- see "When to promote this" at the bottom.

**Audience:** A Builder who has already designed an agent or MCP server (using the existing **Agent Design** and/or **MCP Architecture** Workbench Methods) and now needs to get it registered, certified, and actually callable by Ember.

## Where this fits

Two Workbench Methods already exist for the *design* side of this work, and both stop deliberately short of what happens next:

- **Agent Design** produces an agent definition -- permitted tools, permitted sources, iteration/cost limits, guardrails, an evaluation plan -- but its own stated boundary is: *"It doesn't itself deploy or run the agent."*
- **MCP Architecture** produces an MCP capability map, proposed tools, an authentication model, and an implementation backlog -- but its own stated boundary is: *"KB Sandbox designs the MCP architecture. Implementation happens separately... KB Sandbox does not build or deploy the MCP server itself."*

This guide picks up exactly where both of those leave off:

```
Agent Design / MCP Architecture (existing Methods)
        |  produces a design, an architecture document, an implementation backlog
        v
Builder implements and hosts it externally  <-- this guide starts here
        v
Register in the Builder Registry
        v
Certify (staff-reviewed)
        v
Grant Project availability
        v
Ember discovers and calls it through the Agent Gateway
        v
Every call is audited
```

Nothing in this sequence is food-ordering-specific. The OrderLunch MCP server is the first concrete example being carried through it, but the identical pattern applies to any external system a Builder wants Ember to reach through a governed MCP server -- an HR system (leave balances, org lookups), a CRM (customer records, opportunity updates), a logistics platform (shipment tracking, pickup requests), or anything else. See "Beyond OrderLunch" below.

## Step 1: Register

`/agent-registry/new`. Every field maps to a real decision, not just metadata:

- **Kind** -- `External agent` or `MCP server`. An MCP server exposes selected tools directly; an external agent adds its own reasoning/orchestration on top of one or more MCP servers (justified only when bounded tool-calling by Ember itself genuinely isn't enough -- see Agent Design's own guidance on this). Most first integrations, including OrderLunch, are `MCP server`.
- **Protocol** -- `MCP` for a real MCP server (`StreamableHTTPServerTransport` or equivalent). `HTTPS` is metadata-only today -- nothing in the Gateway actually calls a plain HTTPS endpoint yet, only real MCP servers.
- **Risk classification** -- the single most consequential field. `Read-only` means every tool the integration exposes auto-executes for Ember with no human confirmation. Anything else (`Reversible write`, `Consequential write`, `Administrative`) means every tool that doesn't look read-shaped by name (`get_`/`find_`/`check_`/`list_`/`prepare_`/`search_`) requires an explicit human Confirm/Cancel before it ever runs. Pick the classification honestly for what the *riskiest* tool the integration exposes actually does -- an integration that can place a real order or write a real HR record should never be `Read-only`.
- **Auth method** -- **read this carefully, it's easy to configure something that silently doesn't work today:**
  - `None` -- no authentication. Correct for a local Docker-tested server with nothing to protect yet.
  - `Service identity` -- a single static bearer token, resolved from an environment variable referenced by name in Credentials policy (never the secret value itself, stored in `.env.local` on the KBS side). Works today.
  - `Delegated user identity` -- **not implemented yet.** The form accepts it, but nothing mints or attaches a delegated token today. This is exactly what `docs/dev-request-agent-gateway-remote-mcp-delegation-and-audit.md` scopes -- short-lived signed tokens carrying the calling user/Project, HS256 to start. Don't select this for a real integration until that work ships, or your server will simply never receive a token to verify.
- **Governing project** -- which Project this registration is conceptually associated with (informational; separate from which Projects can actually *use* it, see Step 3).
- **Endpoint URL** -- leave blank until the server is actually deployed and reachable. A public HTTPS URL if hosted (e.g. on Vercel or an always-on host -- see the deployment discussion for why an in-memory-state mock doesn't survive serverless request isolation), or `http://localhost:PORT/mcp` for local Docker testing against a KBS dev server on the same machine.
- **Skills**, **Credentials policy**, **Spending limits**, **Approval policy** -- free-form JSON, deliberately unstructured scaffolding rather than a rigid schema this early. Spending limits (`perOrderMax`/`dailyMax`/`currency`) are actually enforced by the Gateway for any tool call whose input shares an id-shaped field with an earlier quote-shaped call's output -- see "How the confirm gate works" below for the exact mechanism and its limits.

Registering creates the integration in `draft` status with an initial `Experimental` certification. Nothing is visible to Ember yet.

## Step 2: Certify

Only a curator or admin can advance certification (`/agent-registry/[id]`). The ladder -- `Experimental -> Sandbox Tested -> Security Reviewed -> Outlet Accepted -> Production Approved`, plus terminal `Deprecated`/`Suspended` -- is a **recorded human judgment today, not an automated gate**: clicking a button advances the status, nothing runs a real check yet. (A minimal "Test connectivity" action -- live `tools/list` against the real endpoint before advancing -- is scoped in the same dev-request doc as the delegation tokens; not built yet.)

**Ember will not discover an integration's tools at all until it reaches at least `Sandbox Tested`.** `Experimental` and `Deprecated`/`Suspended` integrations stay invisible to ordinary conversation, reachable only for manual testing by the registering Builder or staff directly.

## Step 3: Grant Project availability

Still on the integration detail page. Certification alone doesn't make anything callable -- an integration must also be explicitly granted to each Project whose Ember conversations should be able to discover it. The registering Builder or any curator/admin can grant or revoke this per-Project. No Project availability means the integration is certified but inert everywhere.

## Step 4: Ember discovers and calls it

Once both Sandbox Tested (or higher) and granted to the current Project, Ember's tool list for that Project automatically includes every tool the integration exposes, namespaced `gw__<integration-slug>__<tool-name>`. This happens through the **Agent Gateway** -- no separate step, no separate registration for "which tools." Read-shaped tools (by the risk_classification/name-prefix rule above) execute immediately, exactly like any built-in Ember tool. Everything else stops at a **confirmation card** in the chat UI.

### How the confirm gate works

This is the first code-level "propose, then a human confirms, then execute" mechanism anywhere in KB Sandbox -- every other tool that creates something (a Project, a Workstream, a note) only has a *prompt-level* instruction telling Ember to ask first, which a model can in principle ignore. A gated Gateway tool call physically cannot execute until a human clicks Confirm:

1. Ember calls a gated tool (e.g. `place_order`).
2. The Gateway checks any declared `perOrderMax`/`dailyMax` *before* anything is shown to the user -- if a prior read/quote-shaped call in the same conversation returned a `total`/`amount`-shaped field sharing an id with this call's input, and it exceeds the limit, the call is rejected outright with no confirmation card at all.
3. Otherwise, a row is recorded as `proposed` (this is also the permanent audit trail -- see below) and a confirmation card appears in the chat, showing the tool name and its input fields. Ember is instructed to describe what it's about to do and explicitly defer to that card, never to claim the action already happened.
4. A human clicks Confirm or Cancel. Only Confirm re-checks the spending limit (in case something changed) and then actually calls the real tool on the real remote server.

Every call -- auto-executed reads and human-confirmed writes alike -- is recorded: tool name, input, output, status, actor, timestamp. There's no UI to browse this yet (also scoped in the same pending dev-request doc); today it's a direct database table (`builder_integration_invocations`).

## Beyond OrderLunch

The exact same five steps -- design (Agent Design/MCP Architecture) -> register -> certify -> grant -> Ember calls it through the Gateway with a confirm gate on anything risky -- apply to any system a Builder wants to connect, not just food ordering:

- **HR system**: read-shaped tools like `get_employee_leave_balance` or `list_org_chart` need no confirmation; a write-shaped tool like `submit_leave_request` or `update_compensation_band` should be `Consequential write` or higher and always confirmed.
- **CRM**: `get_customer_record`/`search_opportunities` read freely; `create_opportunity`/`update_deal_stage` are gated writes.
- **Logistics**: `track_shipment`/`check_delivery_area` read freely; `create_pickup_request`/`cancel_shipment` are gated writes.

The domain changes; the registration shape, the certification ladder, and the confirm-gate mechanics don't.

**A concrete near-term candidate, not a hypothetical:** an MCP server that logs into Zadara and retrieves a client's status/data. Zadara is already a real Sandz pilot relationship in KB Sandbox (`Sandz–Zadara Pilot` Projects, a `Zadara / Sandz` knowledge base already holding Zadara product/admin/API documentation) -- this is exactly the kind of integration this whole pattern exists for, and it's the first one where "login" makes the auth-method choice concrete rather than abstract: a `get_client_status`/`get_client_data`-style tool is naturally `Read-only` and would auto-execute for Ember, but "logging in" as a specific Zadara account is precisely what `Delegated user identity` is for -- the remote server should see *which KBS user* is asking, not one shared service credential everyone's calls look identical under. That's a second concrete reason (beyond the pending dev request) to hold off registering a real Zadara integration until delegated tokens actually exist.

## When to promote this

This guide becomes a candidate for an actual Workbench Method (curator-drafted, reviewed, approved into the Wiki's `platform_handbook` category, positioned as the natural sequel to Agent Design/MCP Architecture in the Method catalogue) once:

1. The real OrderLunch MCP server (Docker-tested locally by the Builder) has been registered against a real, reachable endpoint -- not `mock-lunch-agent`.
2. Delegated-user-identity tokens are implemented and actually verified by that real server (`docs/dev-request-agent-gateway-remote-mcp-delegation-and-audit.md`).
3. A real order has been placed and cancelled through the full confirm-gate flow against that real server, live-verified end to end.

Until then, this stays a doc in `docs/guides/`, not Wiki content -- the Wiki's approval ceremony exists to gate content whose trustworthiness is already established, and this pattern hasn't finished proving itself against anything beyond a local mock yet.
