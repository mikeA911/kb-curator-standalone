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

// Builder Capability Promotion -- fixed order matching the doc's own
// numbering (docs/dev-request-builder-capability-promotion-evaluation-
// templates.md). Six templates always shown, whether or not a
// capability_evaluations row exists for them yet.
export const CAPABILITY_TEMPLATE_ORDER = [
  'scope_evidence',
  'functional_contract',
  'identity_permissions',
  'human_decision',
  'customer_acceptance',
  'production_readiness',
] as const

export const CAPABILITY_TEMPLATE_LABELS: Record<string, string> = {
  scope_evidence: 'Intended Scope and Evidence',
  functional_contract: 'Functional Contract and Repeatability',
  identity_permissions: 'Identity, Permissions and Data Handling',
  human_decision: 'Human Decision and Transaction Safety',
  customer_acceptance: 'Customer Acceptance and Usability',
  production_readiness: 'Production Readiness and Continuing Fitness',
}

export const CAPABILITY_EVALUATION_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  ready_for_review: 'Ready for review',
  pass: 'Pass',
  conditional_pass: 'Conditional pass',
  fail: 'Fail',
  not_applicable: 'Not applicable',
}

export const CAPABILITY_EVALUATION_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-700',
  ready_for_review: 'bg-amber-100 text-amber-800',
  pass: 'bg-green-100 text-green-800',
  conditional_pass: 'bg-blue-100 text-blue-700',
  fail: 'bg-red-100 text-red-800',
  not_applicable: 'bg-zinc-200 text-zinc-500',
}
