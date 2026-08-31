import type { BuilderIntegrationRiskClassification } from '@/types/database'

// MVP simplification, documented here rather than silently assumed:
// risk_classification lives on the builder_integration_versions row, i.e.
// per VERSION, not per TOOL -- the schema (Phase A) never modeled finer
// granularity. Two rules combine to approximate per-tool risk without a
// schema change:
//
// 1. A version that declares itself 'read_only' is trusted at face value --
//    every tool it exposes auto-executes. A builder claiming "this whole
//    integration only reads" is a real, checkable claim (certification
//    review is exactly where that claim gets tested).
// 2. Otherwise, a small name-prefix heuristic picks out tools that are
//    obviously read/quote-shaped regardless of the version's stated
//    ceiling -- these still auto-execute, since gating a menu lookup behind
//    a confirmation click adds friction with no safety benefit. Every other
//    tool name is gated at the version's own declared risk_classification.
//
// `prepare_order` is deliberately in the auto-execute set: mock-lunch-
// agent's own contract calls it "not yet submitted" -- it drafts an
// in-memory quote, nothing external or hard to undo happens until
// place_order.
const READ_LIKE_PREFIXES = ['get_', 'find_', 'check_', 'list_', 'prepare_', 'search_']

export function isReadLikeToolName(toolName: string): boolean {
  return READ_LIKE_PREFIXES.some((prefix) => toolName.startsWith(prefix))
}

export function classifyToolRisk(versionRiskClassification: BuilderIntegrationRiskClassification, toolName: string): BuilderIntegrationRiskClassification {
  if (versionRiskClassification === 'read_only') return 'read_only'
  if (isReadLikeToolName(toolName)) return 'read_only'
  return versionRiskClassification
}

export function requiresConfirmation(risk: BuilderIntegrationRiskClassification): boolean {
  return risk !== 'read_only'
}
