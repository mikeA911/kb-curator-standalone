import 'server-only'
import { z } from 'zod'
import type { ToolSpec } from '@/lib/ai'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createWorkingKnowledgeItem,
  listMyWorkingKnowledge,
  listSharedWorkingKnowledge,
} from '@/lib/projects/working-knowledge'
import type { WorkingKnowledgeItem, WorkingKnowledgeItemType } from '@/types/database'

// Working Knowledge & Research Notebooks, Stage 1+2. Not registered in
// src/lib/mcp/tools.ts's general registry -- intercepted directly in
// loop.ts, same as search_project_knowledge/search_web, since all three
// tools here need resolvedProjectId (server-resolved, never model-supplied)
// and conversation.id (save only), which callTool's generic dispatch has no
// way to carry.
//
// Deliberately NOT a citation source in the same sense as knowledge_source/
// wiki_article: a working-knowledge hit CAN become a citation (sourceType
// 'working_knowledge'), but envelope-resolution.ts/StructuredResponse.tsx
// render it with a distinct "Working research"/"Private working note"/
// "Project-shared research" badge that can never be confused with the
// approved-evidence badge -- see loop.ts's retrievedWorkingKnowledgeIds map.

export const SEARCH_MY_WORKING_KNOWLEDGE_TOOL_NAME = 'search_my_working_knowledge'
export const SEARCH_SHARED_WORKING_KNOWLEDGE_TOOL_NAME = 'search_shared_working_knowledge'
export const SAVE_WORKING_KNOWLEDGE_TOOL_NAME = 'save_working_knowledge'

const SearchInputSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().min(1).max(10).default(5),
})

export const SEARCH_MY_WORKING_KNOWLEDGE_TOOL: ToolSpec = {
  name: SEARCH_MY_WORKING_KNOWLEDGE_TOOL_NAME,
  description:
    "Search YOUR OWN Working Knowledge (private research notebooks and working notes) in this project -- unverified, working material, never approved organizational knowledge. Use this for conversational continuity (e.g. \"continue my research from yesterday\"). A result from this tool must never be presented as approved/company knowledge, and if it conflicts with search_project_knowledge's approved evidence, say so explicitly rather than silently picking one. The project is fixed for this conversation -- there is no project parameter to set.",
  parameters: z.toJSONSchema(SearchInputSchema),
}

export const SEARCH_SHARED_WORKING_KNOWLEDGE_TOOL: ToolSpec = {
  name: SEARCH_SHARED_WORKING_KNOWLEDGE_TOOL_NAME,
  description:
    "Search Working Knowledge that OTHER project members have explicitly shared with you (or shared with the whole project) in this project -- unverified working material, never approved organizational knowledge. Same disclosure rules as search_my_working_knowledge.",
  parameters: z.toJSONSchema(SearchInputSchema),
}

export interface WorkingKnowledgeHit {
  id: string
  type: WorkingKnowledgeItemType
  title: string
  trustStatus: string
  visibility: string
  content: string
  ownerLabel?: string
  lastUsedAt: string | null
  sourceCount: number
}

// Tighter than search_project_knowledge's own cap (project-knowledge-tool.ts)
// since a Working Knowledge item's `content` is a free-form synthesis, not a
// fixed-size RAG chunk, and can run long.
const MAX_CONTENT_CHARS = 1500

async function shapeHits(
  ctx: WorkbenchCallerContext,
  rows: WorkingKnowledgeItem[],
  query: string | undefined,
  limit: number,
  scope: 'mine' | 'shared'
): Promise<{ results: WorkingKnowledgeHit[] }> {
  const q = query?.trim().toLowerCase()
  const filtered = q ? rows.filter((r) => r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q)) : rows
  const limited = filtered.slice(0, limit)
  if (limited.length === 0) return { results: [] }

  // Best-effort recency bump for whatever actually surfaced this turn --
  // never blocks the response if it fails.
  await ctx.supabase
    .from('working_knowledge_items')
    .update({ last_used_at: new Date().toISOString() })
    .in(
      'id',
      limited.map((r) => r.id)
    )
    .then(
      () => {},
      () => {}
    )

  let ownerLabelById = new Map<string, string>()
  if (scope === 'shared') {
    // Owner emails are for display only -- listSharedWorkingKnowledge's own
    // RLS-checked query already determined which items are visible. profiles
    // RLS only lets a caller see their own row or staff see everyone, so a
    // consultant/member-role caller couldn't otherwise resolve another
    // owner's email; the admin client here only ever returns id+email, same
    // narrow pattern used across the rest of this feature (working-knowledge.ts,
    // the detail page's share-candidate lookup).
    const ownerIds = [...new Set(limited.map((r) => r.owner_id))]
    const admin = createAdminClient()
    const { data: profiles } = await admin.from('profiles').select('id, email').in('id', ownerIds)
    ownerLabelById = new Map((profiles ?? []).map((p) => [p.id, p.email ?? 'Unknown']))
  }

  const itemIds = limited.map((r) => r.id)
  const { data: sourceRows } = await ctx.supabase.from('working_knowledge_sources').select('item_id').in('item_id', itemIds)
  const sourceCountById = new Map<string, number>()
  for (const s of sourceRows ?? []) sourceCountById.set(s.item_id, (sourceCountById.get(s.item_id) ?? 0) + 1)

  const results: WorkingKnowledgeHit[] = limited.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    trustStatus: r.trust_status,
    visibility: r.visibility,
    content: r.content.length > MAX_CONTENT_CHARS ? `${r.content.slice(0, MAX_CONTENT_CHARS)}…` : r.content,
    ownerLabel: scope === 'shared' ? ownerLabelById.get(r.owner_id) : undefined,
    lastUsedAt: r.last_used_at,
    sourceCount: sourceCountById.get(r.id) ?? 0,
  }))
  return { results }
}

export async function runSearchMyWorkingKnowledge(
  ctx: WorkbenchCallerContext,
  projectId: string,
  rawInput: unknown
): Promise<{ results: WorkingKnowledgeHit[] }> {
  const input = SearchInputSchema.parse(rawInput)
  const rows = await listMyWorkingKnowledge(ctx, projectId)
  return shapeHits(ctx, rows, input.query, input.limit, 'mine')
}

export async function runSearchSharedWorkingKnowledge(
  ctx: WorkbenchCallerContext,
  projectId: string,
  rawInput: unknown
): Promise<{ results: WorkingKnowledgeHit[] }> {
  const input = SearchInputSchema.parse(rawInput)
  const rows = await listSharedWorkingKnowledge(ctx, projectId)
  return shapeHits(ctx, rows, input.query, input.limit, 'shared')
}

const SaveInputSchema = z.object({
  type: z.enum(['research_notebook', 'working_note']),
  title: z.string(),
  objective: z.string().optional(),
  content: z.string(),
  sources: z
    .array(
      z.object({
        url: z.string(),
        title: z.string().optional(),
        domain: z.string().optional(),
        publishedDate: z.string().optional(),
        excerpt: z.string().optional(),
      })
    )
    .max(10)
    .optional(),
})

export const SAVE_WORKING_KNOWLEDGE_TOOL: ToolSpec = {
  name: SAVE_WORKING_KNOWLEDGE_TOOL_NAME,
  description:
    "Save research findings or a working note as Working Knowledge in this project -- private to the current user by default, always marked 'working -- not company-approved'. Prefer this over attach_workstream_artifact whenever the user wants to keep research/notes for their own later continuity (e.g. after search_web findings for pre-sales/competitive research) -- Working Knowledge is private-by-default and sharable, unlike a workstream artifact. Never claim the saved item is approved or visible to others until they explicitly share or submit it (a project page action, not something you do). Tell the user in your reply that it's private by default and where they can manage sharing.",
  parameters: z.toJSONSchema(SaveInputSchema),
}

export interface SaveWorkingKnowledgeResult {
  itemId: string
}

export async function runSaveWorkingKnowledge(
  ctx: WorkbenchCallerContext,
  projectId: string,
  conversationId: string,
  rawInput: unknown,
  modelInfo: { providerName?: string; modelId?: string }
): Promise<SaveWorkingKnowledgeResult> {
  const input = SaveInputSchema.parse(rawInput)
  const { itemId } = await createWorkingKnowledgeItem(ctx.supabase, { id: ctx.user.id, role: ctx.profile.role }, {
    projectId,
    type: input.type,
    title: input.title,
    objective: input.objective,
    content: input.content,
    sourceConversationId: conversationId,
    synthesisProvider: modelInfo.providerName,
    synthesisModel: modelInfo.modelId,
    sources: input.sources,
  })
  return { itemId }
}
