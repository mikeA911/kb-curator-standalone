import 'server-only'
import { z } from 'zod'
import type { ProjectType } from '@/types/database'
import { getActiveStructuredOutputProvider } from '@/lib/ai'
import type { WorkbenchCallerContext } from './context'

// Builder Ontology, Part A (docs/kbs-ontology-dev-req-3.md §6.3): a one-shot
// "Ask Ember to suggest" call from the project-creation wizard, not a chat
// tool call -- there's no generic code-enforced "propose, then confirm"
// mechanism in this codebase outside the MCP Gateway's PendingGatewayInvocation
// (tightly coupled to external tool calls, not reusable here). Instead the
// wizard stages the result as plain editable state, same "suggest then let
// the user edit before final submit" shape its own step 6
// (seedApprovalsIfNeeded) already uses -- nothing is written to
// project_objects/project_workstreams until the wizard's normal final
// submit. This call only ever sees the user's own freshly-typed objective/
// details text (never retrieved knowledge-base content), so it doesn't need
// withPolicyGate's sensitivity gate the way a live chat turn does.
// parentTempId is `.nullish()` (accepts null OR a missing key), not just
// `.nullable()` -- caught live: Gemini's structured output omits the key
// entirely for a top-level item rather than emitting `parentTempId: null`,
// which `.nullable()` alone rejects as a missing required field.
const SuggestionSchema = z.object({
  objects: z.array(z.object({ tempId: z.string(), parentTempId: z.string().nullish(), name: z.string(), description: z.string() })),
  workstreams: z.array(z.object({ tempId: z.string(), parentTempId: z.string().nullish(), name: z.string(), goal: z.string() })),
})

export type ProjectOntologySuggestion = z.infer<typeof SuggestionSchema>

function buildPrompt(projectType: ProjectType, objective: string, details: Record<string, string>): string {
  const detailLines = Object.entries(details)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  return (
    `Project type: ${projectType}\nObjective: ${objective}\n${detailLines}\n\n` +
    'Suggest a starting domain-object ontology and a starting set of workstreams for this project.\n' +
    '"objects" are the domain object TYPES that matter in this business (e.g. for an airline client: Plane, Route; ' +
    'for a riverbank-monitoring client: Sensor, AnomalyEvent) -- not instances. Each object needs a unique tempId ' +
    '(any short string, e.g. "obj-1"), an optional parentTempId referencing another suggested object\'s tempId to ' +
    'nest it, a short name, and a one-sentence description.\n' +
    '"workstreams" are the units of engagement work. Each needs a unique tempId, an optional parentTempId to nest ' +
    'it under another suggested workstream, a short name, and a one-sentence goal.\n' +
    'Suggest 2-6 objects and 2-5 workstreams. This is a starting point the user will edit by hand -- when unsure, ' +
    'suggest fewer, clearly-named items rather than guessing at ambiguous detail.'
  )
}

export async function suggestProjectOntology(
  ctx: WorkbenchCallerContext,
  input: { projectType: ProjectType; objective: string; details: Record<string, string> }
): Promise<ProjectOntologySuggestion> {
  const provider = await getActiveStructuredOutputProvider(ctx.supabase, { requestedBy: ctx.user.id })
  const { data } = await provider.generateStructured({
    system: 'You help a KB Sandbox builder sketch a starting domain-object ontology and workstream set for a new project.',
    prompt: buildPrompt(input.projectType, input.objective, input.details),
    schema: SuggestionSchema,
    maxOutputTokens: 1024,
  })
  return data
}
