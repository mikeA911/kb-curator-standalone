# OrderLunch MCP Showcase — Live Delegation, Order Flow, and Security Matrix

**Date:** 2026-09-02
**Environment:** live remote server, `https://orderlunch-mcp-showcase-production.up.railway.app`
**Purpose:** Verify the Agent Gateway's `delegated_user_identity` auth method, the trusted REST confirmation boundary, and the golden-path order/cancel flow against the real colleague-hosted OrderLunch MCP Showcase (not a mock), per `docs/dev-request-agent-gateway-remote-mcp-delegation-and-audit.md` and the registration plan it unblocked. All calls in this pass used real HS256 delegation tokens minted by [delegation.ts](../../src/lib/mcp-gateway/delegation.ts) against `DELEGATION_HS256_SECRET`/`GATEWAY_API_KEY`; no secret values appear in this report.

## Golden path — order placement

Full chain against the live server: `list_outlets` → `browse_menu` → `prepare_quotation` → `request_order_approval` → REST `POST /approvals/{approvalId}/confirm` (trusted boundary, [orderlunch-confirmation.ts](../../src/lib/mcp-gateway/orderlunch-confirmation.ts)) → `place_order` → repeat `place_order` with the same idempotency key → `get_order_status`.

| Step | Result |
| --- | --- |
| Quotation | Real quote for 2× Chicken Bento, ₱420.00, `pay_on_delivery` |
| Approval | `pending_human_confirmation`, real `quoteHash` |
| REST confirm | Succeeded — `approvedAt` returned. The earlier-observed upstream bug (approvals expiring ~1s after creation instead of the ~10 minutes their quote implied, previously 409-CONFLICTing every real confirm attempt) no longer reproduces; a fresh approval's `expiresAt` is now minutes out |
| Place order | Real order id `fd4f87ce-6394-4af5-8b10-d26ccfda6b6d`, state `placed` |
| Idempotent retry | Same idempotency key returned the **same order id** on a second `place_order` call — confirms idempotency is enforced server-side, not just client-side discipline |
| Status check | `get_order_status` correctly reflects the placed order |

**Finding, fixed in this pass:** `confirmCancellation` (and originally `confirmApproval`, fixed in an earlier pass) assumed the REST confirmation response's identity field was named `confirmationId`. The real response is `{ id, orderId, expiresAt, confirmedAt }` — the field is `id`. `confirmCancellation` was throwing its own "did not return a confirmationId" error on every real call, even though the REST call itself succeeded. Fixed in [orderlunch-confirmation.ts](../../src/lib/mcp-gateway/orderlunch-confirmation.ts) to read `result.id`.

## Golden path — cancellation

After the fix above: `POST /orders/{orderId}/cancellation-confirmations` → real `confirmationId` (`82299650-e7f9-4ec3-ab2a-a2cb1bfb6a33` in this run) → `cancel_order` with that id → order state `cancelled`. Full chain succeeds end to end.

## Security matrix (live, against the real server)

| Check | Result |
| --- | --- |
| Forged delegation JWT (wrong signing secret) | **Rejected.** `-32001 Authentication failed` |
| Expired delegation JWT (`exp` in the past) | **Rejected.** `-32001 Authentication failed` |
| Missing `x-gateway-api-key` (valid bearer only) | **Rejected.** `-32001 Gateway authentication failed` |
| Wrong `x-gateway-api-key` value | **Rejected.** `-32001 Gateway authentication failed` |
| Valid credentials (control) | Succeeds — confirms the above rejections are the auth check, not a broken request |
| Trusted confirmation endpoints unreachable via tool dispatch | **Confirmed.** `tools/list` returns exactly 9 tools (`list_outlets`, `browse_menu`, `check_availability`, `prepare_quotation`, `request_order_approval`, `place_order`, `get_order_status`, `cancel_order`, `advance_order_state`) — no tool name matching `confirm`, so `POST /approvals/{id}/confirm` and `POST /orders/{id}/cancellation-confirmations` are genuinely only reachable from KBS's own server-side [orderlunch-confirmation.ts](../../src/lib/mcp-gateway/orderlunch-confirmation.ts), never from the model's tool-call path |
| Cross-user/cross-project order read (`get_order_status` on User A's order using User B's own valid delegation) | **Rejected**, and correctly indistinguishable from a nonexistent order: `NOT_FOUND` / "Order was not found" (not a 403 that would confirm the order's existence) |
| Owner reading their own order (control) | Succeeds |
| `advance_order_state` called with a non-`test_operator` role | **Rejected server-side**, `"Test-operator role is required"` |

**Finding on tool discovery vs. tool authorization:** `tools/list` returns all 9 tools regardless of what the delegation token's `tools` claim requested — the remote server does not filter tool *discovery* by that claim. The real enforcement boundary is the `roles` claim, checked at *call* time (confirmed directly above: `advance_order_state` without `test_operator` in `roles` is rejected by the server itself). KBS's own client-side omission of `advance_order_state` from a non-admin's tool list (`computeDelegationRoles`/`isTestOperatorOnlyTool` in [delegation.ts](../../src/lib/mcp-gateway/delegation.ts)) is real defense-in-depth on top of a real server-side check, not the only thing standing between a non-admin and that tool — both layers hold.

**Finding, fixed in this pass — real bug, not scratch-only:** [client.ts](../../src/lib/mcp-gateway/client.ts)'s `connectAndCallTool` assumed a failed tool call's `error` field was always a bare string. This server (like its own REST confirmation endpoints) nests it as `{ code, message, details }`. The old code assigned the whole object to `message` and passed it to `new Error(message)`, which stringifies a plain object to the literal text `"[object Object]"` — so every such failure (the `NOT_FOUND` cross-tenant check above was the one that surfaced it) would have shown `"[object Object]"` in `GatewayInvocationCard` and to Ember, instead of the real reason. Fixed to extract `error.message` when `error` is an object, falling back to the bare-string case. Regression-covered in [client.test.ts](../../src/lib/mcp-gateway/client.test.ts) (nested-object shape, bare-string shape, no-usable-field fallback, and the success path).

## Checks covered by existing unit tests rather than re-derived live

- **Unbound conversation / non-Project-member cannot reach the gateway's tools** — `gatewayDiscovery`'s Project-binding requirement is exercised in `discovery.test.ts` (7 tests, passing); not integration-specific, so not re-tested live here.
- **A Project member's tool/role grant is computed correctly (admin-vs-non-admin `test_operator` gating)** — `delegation.test.ts`'s `computeDelegationRoles` tests (10 tests, passing) cover the gating logic directly; the live `advance_order_state` check above additionally confirms the *server* enforces it independently.

## Secrets/token hygiene

No delegation JWTs, the `DELEGATION_HS256_SECRET` value, or the `GATEWAY_API_KEY` value appear in this report, in `builder_integration_invocations` rows written during this pass, or in any client-side test scaffolding — all such scaffolding (temporary `src/app/api/scratch-orderlunch-*` routes used only to drive these live calls) was deleted immediately after use and never committed.

## Test progress

| Stage | Status |
| --- | --- |
| Delegation token minting, multi-header transport | Passed (existing unit coverage + live auth-rejection matrix above) |
| Trusted REST confirmation boundary (approve + cancel) | Passed live, end to end, both branches |
| `place_order` idempotency | Passed live — repeated call with the same key returned the same order |
| Cross-tenant order isolation | Passed live |
| `advance_order_state` role gating | Passed live (server-side) |
| GatewayInvocationCard order-specific confirmation UI | Implemented (outlet/items/total/fulfilment/payment/expiry fields, distinct cancellation styling) — not re-verified in-browser this pass, only via the underlying data flow |
