// Throwaway mock MCP server for the Lunch Agent (Food Outlet AI-Readiness
// Showcase). Purpose: give the Agent Gateway something real to call while
// testing the gateway mechanics, before any real outlet integration or
// Sandz deployment exists. NOT for production, NOT connected to any real
// outlet, NO real payment -- see README.md.
//
// Implements exactly the tool names named in
// docs/commercial/KB-Sandbox-Builders-Programme-for-Sandz.docx and
// docs/dev-request-food-outlet-ai-readiness-showcase.md: find_available_outlets,
// get_menu, check_delivery_area, prepare_order, place_order, get_order_status,
// cancel_order. One mock outlet ("Local Canteen (Test Outlet)"), matching
// the doc's own Phase 1 guidance to use "a cooperative food outlet,
// corporate canteen or simulated restaurant" rather than a live one.
import { randomUUID } from 'node:crypto'
import express from 'express'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787

// ---- Mock data --------------------------------------------------------
const OUTLET = {
  id: 'local-canteen',
  name: 'Local Canteen (Test Outlet)',
  deliveryAreas: ['project-hq', 'test-zone-1'],
}

const MENU = [
  { itemId: 'chicken-meal', name: 'Chicken Meal', price: 180, vegetarian: false },
  { itemId: 'veggie-meal', name: 'Vegetable Meal', price: 150, vegetarian: true },
  { itemId: 'rice-side', name: 'Extra Rice', price: 25, vegetarian: true },
  { itemId: 'iced-tea', name: 'Iced Tea', price: 40, vegetarian: true },
]

const DELIVERY_FEE = 100

// ---- In-memory order state ---------------------------------------------
// orderId -> { status: 'draft'|'confirmed'|'cancelled', outletId, items, subtotal, deliveryFee, total }
const orders = new Map()
// idempotencyKey -> orderId, so a retried place_order call never double-submits.
const idempotencyKeys = new Map()

function findMenuItem(itemId) {
  return MENU.find((m) => m.itemId === itemId)
}

// ---- MCP server ----------------------------------------------------------
const server = new McpServer({ name: 'lunch-agent-mock', version: '0.1.0' })

server.registerTool(
  'find_available_outlets',
  {
    description: 'List outlets available for ordering. This mock always returns exactly one test outlet.',
    inputSchema: {},
  },
  async () => ({
    content: [{ type: 'text', text: JSON.stringify({ outlets: [OUTLET] }) }],
  })
)

server.registerTool(
  'get_menu',
  {
    description: 'Get the menu, prices, and availability for an outlet.',
    inputSchema: { outletId: z.string() },
  },
  async ({ outletId }) => {
    if (outletId !== OUTLET.id) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown outlet: ${outletId}` }) }], isError: true }
    }
    return { content: [{ type: 'text', text: JSON.stringify({ outletId, currency: 'PHP', items: MENU }) }] }
  }
)

server.registerTool(
  'check_delivery_area',
  {
    description: 'Check whether a delivery destination is within an outlet\'s serviceable area.',
    inputSchema: { outletId: z.string(), destination: z.string() },
  },
  async ({ outletId, destination }) => {
    const serviceable = outletId === OUTLET.id && OUTLET.deliveryAreas.includes(destination)
    return { content: [{ type: 'text', text: JSON.stringify({ serviceable, deliveryFee: serviceable ? DELIVERY_FEE : null }) }] }
  }
)

server.registerTool(
  'prepare_order',
  {
    description:
      'Prepare a proposed order (not yet submitted) from outlet + line items. Returns an itemized breakdown and a draft orderId for a human to review before place_order is ever called.',
    inputSchema: {
      outletId: z.string(),
      items: z.array(z.object({ itemId: z.string(), quantity: z.number().int().positive() })),
      destination: z.string(),
    },
  },
  async ({ outletId, items, destination }) => {
    if (outletId !== OUTLET.id) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown outlet: ${outletId}` }) }], isError: true }
    }
    const lines = []
    for (const { itemId, quantity } of items) {
      const menuItem = findMenuItem(itemId)
      if (!menuItem) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown item: ${itemId}` }) }], isError: true }
      }
      lines.push({ itemId, name: menuItem.name, quantity, unitPrice: menuItem.price, lineTotal: menuItem.price * quantity })
    }
    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0)
    const deliveryFee = OUTLET.deliveryAreas.includes(destination) ? DELIVERY_FEE : null
    if (deliveryFee === null) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: `Destination not serviceable: ${destination}` }) }], isError: true }
    }
    const total = subtotal + deliveryFee

    const orderId = randomUUID()
    orders.set(orderId, { status: 'draft', outletId, destination, items: lines, subtotal, deliveryFee, total })

    // Deliberately the whole point: this is a PROPOSAL. Nothing has been
    // submitted. The caller must show this to a human and get explicit
    // confirmation before ever calling place_order with this orderId.
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ orderId, status: 'draft', outlet: OUTLET.name, destination, items: lines, subtotal, deliveryFee, total, currency: 'PHP' }),
        },
      ],
    }
  }
)

server.registerTool(
  'place_order',
  {
    description:
      'Submit a previously prepared order. Requires an idempotencyKey -- calling this again with the same key returns the original result rather than placing a duplicate order.',
    inputSchema: { orderId: z.string(), idempotencyKey: z.string() },
  },
  async ({ orderId, idempotencyKey }) => {
    const existingOrderId = idempotencyKeys.get(idempotencyKey)
    if (existingOrderId) {
      const order = orders.get(existingOrderId)
      return { content: [{ type: 'text', text: JSON.stringify({ orderId: existingOrderId, status: order.status, deduplicated: true }) }] }
    }
    const order = orders.get(orderId)
    if (!order) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown orderId: ${orderId}` }) }], isError: true }
    }
    if (order.status !== 'draft') {
      return { content: [{ type: 'text', text: JSON.stringify({ error: `Order ${orderId} is not in draft status (${order.status})` }) }], isError: true }
    }
    order.status = 'confirmed'
    order.confirmedAt = new Date().toISOString()
    idempotencyKeys.set(idempotencyKey, orderId)
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ orderId, status: 'confirmed', receipt: { total: order.total, currency: 'PHP', confirmedAt: order.confirmedAt } }),
        },
      ],
    }
  }
)

server.registerTool(
  'get_order_status',
  { description: 'Check the status of a previously prepared or placed order.', inputSchema: { orderId: z.string() } },
  async ({ orderId }) => {
    const order = orders.get(orderId)
    if (!order) return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown orderId: ${orderId}` }) }], isError: true }
    return { content: [{ type: 'text', text: JSON.stringify({ orderId, status: order.status, total: order.total }) }] }
  }
)

server.registerTool(
  'cancel_order',
  { description: 'Cancel a draft or confirmed order, where permitted.', inputSchema: { orderId: z.string() } },
  async ({ orderId }) => {
    const order = orders.get(orderId)
    if (!order) return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown orderId: ${orderId}` }) }], isError: true }
    if (order.status === 'cancelled') {
      return { content: [{ type: 'text', text: JSON.stringify({ orderId, status: 'cancelled', alreadyCancelled: true }) }] }
    }
    order.status = 'cancelled'
    return { content: [{ type: 'text', text: JSON.stringify({ orderId, status: 'cancelled' }) }] }
  }
)

// ---- HTTP hosting (stateless mode, one transport per request) ------------
const app = express()
app.use(express.json())

app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  res.on('close', () => transport.close())
  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
})

app.listen(PORT, () => {
  console.log(`Mock Lunch Agent MCP server listening on http://localhost:${PORT}/mcp`)
  console.log('Throwaway/test only -- no real outlet, no real payment. See README.md.')
})
