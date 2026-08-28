// Walks the full Lunch Agent flow against the running mock server (npm start
// in another terminal first): discover outlets -> menu -> prepare an order
// -> place it -> check status -> confirm the idempotency key prevents a
// duplicate order on a retried place_order call. This is the "at least to
// test" proof that the gateway mechanics (propose -> human-confirm-shaped
// call -> execute -> audit) work end-to-end against a real MCP server.
import { randomUUID } from 'node:crypto'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const BASE_URL = process.env.MOCK_LUNCH_AGENT_URL ?? 'http://localhost:8787/mcp'

function parse(result) {
  return JSON.parse(result.content[0].text)
}

async function main() {
  const client = new Client({ name: 'lunch-agent-test-client', version: '0.1.0' })
  const transport = new StreamableHTTPClientTransport(new URL(BASE_URL))
  await client.connect(transport)

  const { tools } = await client.listTools()
  console.log(
    'Discovered tools:',
    tools.map((t) => t.name)
  )

  const outlets = parse(await client.callTool({ name: 'find_available_outlets', arguments: {} }))
  console.log('\nfind_available_outlets ->', outlets)
  const outletId = outlets.outlets[0].id

  const menu = parse(await client.callTool({ name: 'get_menu', arguments: { outletId } }))
  console.log('\nget_menu ->', menu)

  const area = parse(await client.callTool({ name: 'check_delivery_area', arguments: { outletId, destination: 'project-hq' } }))
  console.log('\ncheck_delivery_area ->', area)

  const prepared = parse(
    await client.callTool({
      name: 'prepare_order',
      arguments: {
        outletId,
        items: [
          { itemId: 'chicken-meal', quantity: 6 },
          { itemId: 'veggie-meal', quantity: 2 },
        ],
        destination: 'project-hq',
      },
    })
  )
  console.log('\nprepare_order (draft, NOT yet submitted) ->', prepared)

  // Simulates the human confirmation gate: only after this would a real
  // gateway call place_order at all.
  console.log('\n[Simulated human confirmation: "Confirm order" clicked]')

  const idempotencyKey = randomUUID()
  const placed = parse(await client.callTool({ name: 'place_order', arguments: { orderId: prepared.orderId, idempotencyKey } }))
  console.log('\nplace_order ->', placed)

  const status = parse(await client.callTool({ name: 'get_order_status', arguments: { orderId: prepared.orderId } }))
  console.log('\nget_order_status ->', status)

  // Retry with the SAME idempotency key -- must return the same result, not
  // place a second order.
  const retried = parse(await client.callTool({ name: 'place_order', arguments: { orderId: prepared.orderId, idempotencyKey } }))
  console.log('\nplace_order retried with same idempotencyKey ->', retried)
  if (retried.deduplicated !== true) throw new Error('Idempotency check failed -- retry was not deduplicated')

  console.log('\nAll checks passed.')
  await client.close()
}

main().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
