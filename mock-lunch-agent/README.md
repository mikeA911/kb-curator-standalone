# Mock Lunch Agent (throwaway)

A minimal, disposable MCP server standing in for a real, externally-built Lunch Agent -- for
testing the *Agent Gateway* mechanics (propose an order, human confirms, execute, check status)
before anything real exists to call. See
[`docs/dev-request-food-outlet-ai-readiness-showcase.md`](../docs/dev-request-food-outlet-ai-readiness-showcase.md)
and the Sandz Builders Programme discussion paper for the context this stands in for.

**Not real.** One mock outlet ("Local Canteen (Test Outlet)"), no real payment, no real
credentials, no persistence (orders live in memory and vanish when the process restarts). Not
deployed anywhere, not registered against a live endpoint. Deliberately separate from the main
`kb-curator-standalone` app -- it has its own `package.json`/`node_modules` so it can be deleted
without touching anything else.

## Tools

Implements exactly the tool names from the source docs: `find_available_outlets`, `get_menu`,
`check_delivery_area`, `prepare_order`, `place_order`, `get_order_status`, `cancel_order`.
`prepare_order` only ever produces a draft -- nothing is "ordered" until `place_order` is called
with an `idempotencyKey`, and a repeated call with the same key returns the original result
instead of placing a duplicate order.

## Run it

```bash
npm install
npm start          # starts the MCP server on http://localhost:8787/mcp
npm test           # in another terminal: walks the full flow against the running server
```

## What this does and doesn't prove

Proves the MCP server side of the gateway works: tool discovery, a propose-then-confirm-then-
execute shape, and idempotent order placement. Does **not** prove anything about Ember actually
calling this server -- that's the still-unbuilt Agent Gateway piece (MCP client wiring inside
`src/lib/chat/loop.ts`, credential resolution, spending-limit enforcement, the confirm-gate UI).
This mock exists so that work has something real to call once it's built.
