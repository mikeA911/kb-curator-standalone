import 'server-only'
import { requireUser } from '@/lib/auth'

// The shape every Workbench service-layer function is called with --
// deliberately identical to requireUser()/requireRole()'s existing return
// shape, not a new object callers have to be adapted to. A caller resolves
// its own identity first (cookie session today via requireUser/requireRole,
// a bearer token later via resolveCallerIdentityFromToken -- see
// identity.ts), builds this context once, then calls into
// src/lib/workbench/* -- the single place business logic and permission
// checks live, regardless of which entry point (Server Action, future MCP
// tool, future Assistant) produced the context.
export type WorkbenchCallerContext = Awaited<ReturnType<typeof requireUser>>
