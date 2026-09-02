import 'server-only'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

// Thin, stateless wrapper around the MCP SDK's client -- one connection per
// call, matching mock-lunch-agent's own stateless server design
// (StreamableHTTPServerTransport({ sessionIdGenerator: undefined })). No
// connection pooling/reuse across calls this pass -- fine at the scale of
// one or two registered integrations per Project turn; revisit if latency
// becomes a real problem once more integrations exist.

export interface McpToolSummary {
  name: string
  description?: string
  inputSchema?: unknown
}

export interface AuthHeader {
  header: string
  value: string
}

// A list, not a single pair -- some registered integrations (e.g. the live
// OrderLunch MCP Showcase) require more than one header simultaneously
// (a static gateway API key plus a per-call delegation bearer token). An
// empty array behaves exactly like the old `null` -- no auth headers sent.
async function withClient<T>(endpointUrl: string, auth: AuthHeader[], fn: (client: Client) => Promise<T>): Promise<T> {
  const headers = auth.length > 0 ? Object.fromEntries(auth.map((a) => [a.header, a.value])) : undefined
  const transport = new StreamableHTTPClientTransport(new URL(endpointUrl), headers ? { requestInit: { headers } } : undefined)
  const client = new Client({ name: 'kb-sandbox-agent-gateway', version: '0.1.0' })
  await client.connect(transport)
  try {
    return await fn(client)
  } finally {
    await client.close()
  }
}

export async function connectAndListTools(endpointUrl: string, auth: AuthHeader[]): Promise<McpToolSummary[]> {
  return withClient(endpointUrl, auth, async (client) => {
    const { tools } = await client.listTools()
    return tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
  })
}

// MCP tool results wrap structured data as a JSON-encoded text content
// block (confirmed against mock-lunch-agent/server.mjs's own handlers,
// every one of which returns `{ content: [{ type: 'text', text: JSON.stringify(...) }] }`).
// A server that returns something else (binary content, no text block)
// isn't supported by this Gateway yet -- throws rather than silently
// returning undefined.
function parseToolResultText(result: Awaited<ReturnType<Client['callTool']>>): unknown {
  const content = Array.isArray(result.content) ? result.content : []
  const textBlock = content.find((c): c is { type: 'text'; text: string } => c.type === 'text')
  if (!textBlock) throw new Error('MCP tool result did not contain a text content block this Gateway can parse')
  return JSON.parse(textBlock.text)
}

export async function connectAndCallTool(endpointUrl: string, auth: AuthHeader[], toolName: string, args: Record<string, unknown>): Promise<unknown> {
  return withClient(endpointUrl, auth, async (client) => {
    const result = await client.callTool({ name: toolName, arguments: args })
    if (result.isError) {
      let message = 'MCP tool call failed'
      try {
        const parsed = parseToolResultText(result) as { error?: string }
        if (parsed?.error) message = parsed.error
      } catch {
        // Fall through to the generic message -- an error result whose text
        // block isn't parseable JSON is still a failure, just not one this
        // Gateway can extract a specific reason from.
      }
      throw new Error(message)
    }
    return parseToolResultText(result)
  })
}
