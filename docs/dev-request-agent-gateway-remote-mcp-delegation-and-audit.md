# Agent Gateway: Remote MCP Delegation Tokens, Confirmation Panels, and Audit Display

## Status

Ready for implementation after the colleague's OrderLunch MCP server has been built and tested locally with Docker. Not started -- this document exists to scope the work precisely now, so it can be executed as one focused pass once that server exists to point the Gateway at, per Mike's 2026-09-01 request.

## Context

`docs/commercial/ROADMAP.md`'s OR-027 ("Agent Gateway, Milestone 1") shipped a real, working Gateway -- but built and live-verified against `mock-lunch-agent/`, a local throwaway server. Before Ember can place a real order through the colleague's actual (Docker-tested, still external) MCP server, Mike named six requirements. Checking each against what OR-027 actually shipped:

| Requirement | Status |
|---|---|
| A gateway call to the remote MCP endpoint | **Already shipped.** `src/lib/mcp-gateway/client.ts` (`connectAndListTools`/`connectAndCallTool`) is transport-generic -- it already works against any reachable `StreamableHTTPServerTransport` MCP endpoint, not specifically the mock. Pointing it at a real Docker-hosted endpoint needs no new Gateway code, only a real `endpoint_url` on the registration. |
| Short-lived signed user/Project delegation tokens | **Not built.** See §1 below -- this is the one genuinely new piece of Gateway machinery this request is mostly about. |
| A trusted confirmation panel for order placement | **Already shipped.** `GatewayInvocationCard.tsx` + the propose/confirm/execute state machine in `src/lib/mcp-gateway/execute.ts` already gates any tool whose risk classification isn't `read_only` -- this generically covers `place_order` today. |
| A trusted cancellation-confirmation panel | **Structurally already covered**, needs a smaller UI refinement -- see §2. `cancel_order` doesn't match the read-like name-prefix heuristic (`src/lib/mcp-gateway/risk.ts`), so it already routes through the same confirm gate as `place_order`. What's missing is visual/copy differentiation, not a second gate mechanism. |
| Tool registration and Project permission selection | **Already shipped.** The Builder Registry (OR-019/026) + `builder_integration_project_availability` (grant/revoke UI on the integration detail page) already do exactly this. |
| Certification tests and audit display | **Partially shipped.** The certification ladder (advance/deprecate/suspend) exists and works. Two real gaps remain -- see §3 (no automated connectivity/functional testing, still a manual staff button-click) and §4 (the full `builder_integration_invocations` audit trail exists in the database with zero UI to view it). |

So this request is really four narrower pieces of work, not a rebuild.

## Design

### 1. Short-lived signed delegation tokens

**First pass: HS256, a shared signing secret.** Per Mike's own sequencing -- upgrade to a published, asymmetric JWKS only after the first real integration proves the pattern works, not before.

- New env var `MCP_DELEGATION_SIGNING_SECRET` (mirrors the existing `ai_providers.api_key_env_var` / `credentials_policy.name` reference-not-secret pattern already used everywhere else in this codebase -- the *name* of the env var is what's stored, never the secret value).
- New `src/lib/mcp-gateway/delegation.ts`: `mintDelegationToken(ctx, { integrationId, projectId })` -- builds and signs a JWT (a lightweight JWT lib, e.g. `jose`, already dependency-free of Node-version quirks and ESM-native, unlike some alternatives -- verify this doesn't repeat the `js-yaml` default-export mistake found during OR-029 before committing to an import style) with claims: `sub` (the calling user's id), `project_id`, `builder_integration_id`, `iat`, and a short `exp` -- **60-120 seconds**, generous enough for one Gateway round trip, tight enough that a leaked token is useless shortly after. No refresh mechanism needed -- a new token is minted per outbound call, not cached or reused.
- Wired into `credentials.ts`'s `resolveCredentials`: a new branch for `auth_method === 'delegated_user_identity'` that calls `mintDelegationToken` instead of resolving a static env-var value, attached the same way (`Authorization: Bearer <token>`) as today's `service_identity` path.
- **KBS's responsibility ends at minting and signing correctly, and documenting the expected claim shape** (see the companion guide, `docs/guides/building-governed-enterprise-integrations-for-ember.md`) -- verifying the token server-side is the registered integration's own responsibility, same as any delegated-identity pattern. Confirm the exact claim names/shape with the colleague before they start verifying against them, since this doc is choosing them somewhat arbitrarily absent an existing convention to match.
- **Explicitly out of scope this pass:** JWKS publication, asymmetric signing (RS256/ES256), key rotation, token revocation. All meaningful only once a second consumer exists to justify the added complexity -- premature for the first integration.

### 2. Cancellation-confirmation panel differentiation

`GatewayInvocationCard` gains a `variant` derived from the tool name (e.g. `toolName.startsWith('cancel_')`) or, more robustly, from `riskClassification` plus a new lightweight tool-name-pattern check in `risk.ts` alongside the existing read-like heuristic. Cancellation gets distinct copy ("This will cancel an order that may already be placed") and a warning color treatment (amber/red) rather than reusing the same "Confirm: place order" framing verbatim for every gated tool. No new state-machine work -- `execute.ts`'s propose/confirm/execute path is already fully generic across tool names.

### 3. Certification tests

Minimal version for this pass: a **"Test connectivity"** action on the integration detail page (curator/admin-gated, same bar as certification advancement) that calls `connectAndListTools` live against the registration's `endpoint_url` and displays the actual discovered tool list plus reachability status, before a reviewer advances certification past `experimental`. This turns "I clicked Sandbox Tested" from an unverified claim into something backed by a real, displayed connectivity check. A fuller acceptance-test harness (functional correctness, denied-access cases, idempotency-under-retry, per the concept paper's Stage 7 list) is a larger, separate future pass -- do not expand scope to build it now.

### 4. Audit display

New read-only section on the integration detail page (`/agent-registry/[id]`), visible to the same viewers who can already see Project availability (project members, the registering builder, curator/admin) -- a simple table over `builder_integration_invocations` for that integration: tool name, status, actor, correlated amount, created/executed timestamps, most recent first, paginated or capped at a reasonable count. Read-only; no new mutation surface.

## Verification

- Live-verify against the colleague's real Docker-hosted MCP server once it exists, not just `mock-lunch-agent` -- confirm the delegation token actually reaches their server and that its claim shape is genuinely useful for their own verification, not just internally self-consistent.
- Re-run the full OR-027/OR-029 live-verification script (register, certify, grant availability, discover, place, cancel, spending-limit rejection) against the real endpoint.
- New unit tests for `mintDelegationToken` (correct claims, correct short expiry, signature verifies against the same secret) and the cancellation-variant card rendering.
- Standard `tsc`/`eslint`/`vitest`/`next build` gate, as every other pass this session.

## Out of scope

- JWKS/asymmetric signing (explicitly deferred, see §1).
- A full acceptance-test harness beyond basic connectivity (§3).
- Milestone 2 (the OrderLunch external-agent variant, OR-027's own deferred scope) -- unrelated to this request.
