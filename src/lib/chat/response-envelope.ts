import 'server-only'
import { z } from 'zod'
import type { ToolSpec } from '@/lib/ai'

// docs/dev-request-structured-assistant-responses-and-artifacts-panel.md's
// versioned response envelope. Target kinds are deliberately narrower than
// the doc's own example list -- limited to what has a confirmed, real route
// today (see navigation-resolver.ts). Widen only when a new kind actually
// has somewhere to resolve to.
export const NavigationTargetKindSchema = z.enum(['wiki_article', 'project', 'workstream', 'assessment'])
export type NavigationTargetKind = z.infer<typeof NavigationTargetKindSchema>

// citations[].sourceType is pinned to 'wiki_article' because search_wiki is
// the only tool that returns provenance-checkable retrieved content today
// (list_project_notes isn't evidence a reply "cites"; nothing else
// retrieves). Widen when another tool produces citable content.
export const AssistantResponseEnvelopeSchema = z.object({
  schemaVersion: z.literal('1.0'),
  message: z.string().min(1).max(8000),
  quickSummary: z.string().max(300).optional(),
  requirements: z
    .array(
      z.object({
        label: z.string().max(200),
        status: z.enum(['available', 'needed', 'optional', 'can_be_produced_elsewhere', 'unknown']),
        importance: z.enum(['required', 'recommended', 'optional']),
      })
    )
    .max(10)
    .optional(),
  links: z
    .array(
      z.object({
        label: z.string().max(200),
        target: z.object({ kind: NavigationTargetKindSchema, id: z.string().max(200) }),
      })
    )
    .max(6)
    .optional(),
  documents: z
    .array(z.object({ label: z.string().max(200), documentType: z.string().max(60), artifactId: z.string() }))
    .max(6)
    .optional(),
  citations: z
    .array(z.object({ label: z.string().max(200), sourceType: z.literal('wiki_article'), sourceId: z.string().max(200) }))
    .max(8)
    .optional(),
  nextSteps: z
    .array(
      z.object({
        label: z.string().max(200),
        status: z.enum(['suggested', 'ready', 'blocked', 'completed']),
        // No executable action type ships this phase -- automatically
        // executing proposed next steps is explicitly out of scope.
        action: z.null(),
      })
    )
    .max(8)
    .optional(),
  suggestedPrompts: z.array(z.string().max(160)).max(4).optional(),
})
export type AssistantResponseEnvelope = z.infer<typeof AssistantResponseEnvelopeSchema>

// The shape actually persisted to chat_messages.response_payload. Citations
// are permanently filtered here to only those verified present in this
// turn's own tool results -- that's a point-in-time historical fact, safe
// to bake in for good. links/documents keep their raw, unresolved
// references ({kind,id} / artifactId) rather than a baked-in route: a
// project, workstream, or wiki article's visibility can change after this
// message is written, so the route has to be re-derived from the reference
// every time it's displayed, not cached. Garbage references (never
// resolved even once, at persist time) are dropped and don't make it here
// at all -- see envelope-resolution.ts.
export interface PersistedAssistantEnvelope {
  message: string
  quickSummary?: string
  requirements?: AssistantResponseEnvelope['requirements']
  links?: { label: string; target: { kind: NavigationTargetKind; id: string } }[]
  documents?: { label: string; documentType: string; artifactId: string }[]
  citations?: { label: string; sourceType: 'wiki_article'; sourceId: string }[]
  nextSteps?: AssistantResponseEnvelope['nextSteps']
  suggestedPrompts?: string[]
}

// Lenient validator for reading chat_messages.response_payload back out --
// the column is untyped jsonb (see database.ts's comment), so a row from
// before this feature, or after some future incompatible schema change,
// must fail closed to "no structured payload" rather than being assumed to
// match today's shape.
export const PersistedAssistantEnvelopeSchema: z.ZodType<PersistedAssistantEnvelope> = z.object({
  message: z.string(),
  quickSummary: z.string().optional(),
  requirements: AssistantResponseEnvelopeSchema.shape.requirements,
  links: z.array(z.object({ label: z.string(), target: z.object({ kind: NavigationTargetKindSchema, id: z.string() }) })).optional(),
  documents: z.array(z.object({ label: z.string(), documentType: z.string(), artifactId: z.string() })).optional(),
  citations: z.array(z.object({ label: z.string(), sourceType: z.literal('wiki_article'), sourceId: z.string() })).optional(),
  nextSteps: AssistantResponseEnvelopeSchema.shape.nextSteps,
  suggestedPrompts: z.array(z.string()).optional(),
})

// The shape actually handed to the client for rendering: links/documents/
// citations replaced by their *freshly resolved* forms (label + route, or
// enrichment fields). Computed from a PersistedAssistantEnvelope by
// envelope-resolution.ts, both immediately after a turn completes and again
// on every subsequent history read -- never cached.
export interface VerifiedAssistantEnvelope {
  message: string
  quickSummary?: string
  requirements?: AssistantResponseEnvelope['requirements']
  links?: { label: string; route: string }[]
  documents?: { label: string; documentType: string; artifactId: string; title: string; route: string | null }[]
  citations?: { label: string; sourceType: 'wiki_article'; sourceId: string; route: string }[]
  nextSteps?: AssistantResponseEnvelope['nextSteps']
  suggestedPrompts?: string[]
}

// Not registered in src/lib/mcp/tools.ts's tools map: that registry is for
// real, executable tools callTool() dispatches into. This one is
// intercepted in loop.ts before ever reaching callTool, so a "handler that
// never runs" would be dead weight there -- defined here instead and
// appended to the tools list passed to generateChat.
export const PRESENT_RESPONSE_TOOL_NAME = 'present_assistant_response'

export const PRESENT_RESPONSE_TOOL: ToolSpec = {
  name: PRESENT_RESPONSE_TOOL_NAME,
  description:
    'Submit your final structured response for this turn. Call this exactly once as your last action, after any evidence-gathering, instead of replying with plain text.',
  parameters: z.toJSONSchema(AssistantResponseEnvelopeSchema),
}
