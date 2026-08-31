// Was duplicated verbatim in the list and detail pages -- factored out
// while touching both anyway. Ladder itself is unchanged, see the
// migration's own comment for why it isn't being renamed to match the
// concept paper's proposed stage names. Keyed as Record<string, string>,
// not the stricter enum, matching this file's own page components -- their
// `.select('*')` results aren't parameterized with the Database generic, so
// an enum-keyed Record makes every lookup an implicit-any TS error there.
export const CERTIFICATION_LABELS: Record<string, string> = {
  experimental: 'Experimental',
  sandbox_tested: 'Sandbox Tested',
  security_reviewed: 'Security Reviewed',
  outlet_accepted: 'Outlet Accepted',
  production_approved: 'Production Approved',
  deprecated: 'Deprecated',
  suspended: 'Suspended',
}

export const CERTIFICATION_STYLES: Record<string, string> = {
  experimental: 'bg-zinc-100 text-zinc-700',
  sandbox_tested: 'bg-amber-100 text-amber-800',
  security_reviewed: 'bg-blue-100 text-blue-700',
  outlet_accepted: 'bg-indigo-100 text-indigo-700',
  production_approved: 'bg-green-100 text-green-800',
  deprecated: 'bg-zinc-200 text-zinc-500',
  suspended: 'bg-red-100 text-red-800',
}

export const KIND_LABELS: Record<string, string> = {
  external_agent: 'External agent',
  mcp_server: 'MCP server',
}

export const RISK_LABELS: Record<string, string> = {
  read_only: 'Read-only',
  reversible_write: 'Reversible write',
  consequential_write: 'Consequential write',
  administrative: 'Administrative',
}
