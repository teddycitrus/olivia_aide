import { z } from 'zod'
import { TOOL_DEFS, callTool, type McpContext } from './tools'

// Minimal JSON-RPC 2.0 handler implementing the MCP methods a client needs to
// discover and invoke tools over Streamable HTTP: initialize, tools/list,
// tools/call (plus ping / notifications).

const jsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: z.string().min(1),
  params: z.unknown().optional(),
})

type JsonRpcResponse = { jsonrpc: '2.0'; id: string | number | null; result?: unknown; error?: { code: number; message: string } }

const PROTOCOL_VERSION = '2024-11-05'

export async function handleMcpRequest(rawBody: unknown, context: McpContext): Promise<JsonRpcResponse | null> {
  // Every request body is validated against a zod schema before it touches
  // any business logic — a malformed envelope gets a clean JSON-RPC error,
  // never an unhandled crash from reading `.method` off `undefined`.
  const parsed = jsonRpcRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    const idGuess = rawBody && typeof rawBody === 'object' && 'id' in rawBody ? (rawBody as { id: unknown }).id : null
    return {
      jsonrpc: '2.0',
      id: (typeof idGuess === 'string' || typeof idGuess === 'number' ? idGuess : null),
      error: { code: -32600, message: `invalid request: ${parsed.error.issues[0]?.message ?? 'malformed body'}` },
    }
  }
  const body = parsed.data
  const id = body.id ?? null

  // Notifications (no id) get no response body.
  if (body.method.startsWith('notifications/')) return null

  try {
    switch (body.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: { name: 'nora', version: '1.0.0' },
          },
        }
      case 'ping':
        return { jsonrpc: '2.0', id, result: {} }
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: TOOL_DEFS } }
      case 'tools/call': {
        const paramsResult = z
          .object({ name: z.string().min(1), arguments: z.record(z.string(), z.unknown()).optional() })
          .safeParse(body.params)
        if (!paramsResult.success) {
          return { jsonrpc: '2.0', id, error: { code: -32602, message: `invalid params: ${paramsResult.error.issues[0]?.message ?? 'malformed'}` } }
        }
        const { name, arguments: args } = paramsResult.data
        const result = await callTool(name, args ?? {}, context)
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
        }
      }
      default:
        return { jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${body.method}` } }
    }
  } catch (err) {
    return { jsonrpc: '2.0', id, error: { code: -32603, message: err instanceof Error ? err.message : 'internal error' } }
  }
}
