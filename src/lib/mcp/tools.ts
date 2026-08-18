import 'server-only'
import { z } from 'zod'
import { listArticles } from '@/lib/wiki/queries'
import { listProjectNotes } from '@/lib/projects/notes'
import * as workbenchProjects from '@/lib/workbench/projects'
import * as workbenchWorkstreams from '@/lib/workbench/workstreams'
import type { WorkbenchCallerContext } from '@/lib/workbench/context'

// M5F Phase D: the internal MCP tool contract. Each tool wraps an existing,
// already-permission-checked service function -- this module never adds a
// role/membership check of its own (per the design note's core principle:
// one authorization model, enforced once, in src/lib/workbench/* /
// src/lib/{curator,wiki,projects}/*, not duplicated here). Transport-
// independent: callTool is called directly in-process by Phase E's future
// Assistant; nothing here assumes an MCP SDK transport exists.

const WikiCategorySchema = z.enum([
  'foundations',
  'knowledge_engineering',
  'agent_engineering',
  'reliability',
  'governance',
  'improvement',
  'platform_handbook',
])

const ArtifactTypeSchema = z.enum([
  'capability_inventory',
  'endpoint_inventory',
  'openapi_spec',
  'mcp_server',
  'evidence_map',
  'test_results',
  'findings',
  'design_note',
  'other',
])

const ProjectTypeSchema = z.enum(['learning', 'experiment', 'consulting', 'transformation', 'knowledge'])

interface ToolDefinition<TInput, TOutput> {
  description: string
  inputSchema: z.ZodType<TInput>
  outputSchema: z.ZodType<TOutput>
  handler: (ctx: WorkbenchCallerContext, input: TInput) => Promise<TOutput>
}

// Loosely typed at the map level (each entry is internally consistent, but
// TS can't express "the Nth value's input/output types match the Nth key"
// across a heterogeneous map) -- callTool is the one place that matters,
// and it's fully checked via generics at the call site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tools: Record<string, ToolDefinition<any, any>> = {
  search_wiki: {
    description: 'Search platform Wiki articles by title/description substring, optionally scoped to a category.',
    inputSchema: z.object({ query: z.string(), category: WikiCategorySchema.optional() }),
    outputSchema: z.object({
      articles: z.array(z.object({ id: z.string(), slug: z.string(), title: z.string(), shortDescription: z.string().nullable() })),
    }),
    handler: async (ctx, input: { query: string; category?: z.infer<typeof WikiCategorySchema> }) => {
      const articles = await listArticles(ctx.supabase, { search: input.query, category: input.category })
      return {
        articles: articles.map((a) => ({ id: a.id, slug: a.slug, title: a.title, shortDescription: a.short_description })),
      }
    },
  },

  list_project_notes: {
    description: "List a project's notes, optionally filtered to open or resolved.",
    inputSchema: z.object({ projectId: z.string(), status: z.enum(['open', 'resolved']).optional() }),
    outputSchema: z.object({
      notes: z.array(
        z.object({
          id: z.string(),
          subject: z.string(),
          body: z.string(),
          authorEmail: z.string().nullable(),
          status: z.string(),
          createdAt: z.string(),
        })
      ),
    }),
    handler: async (ctx, input: { projectId: string; status?: 'open' | 'resolved' }) => {
      const notes = await listProjectNotes(ctx.supabase, input.projectId, { status: input.status })
      return {
        notes: notes.map((n) => ({
          id: n.id,
          subject: n.subject,
          body: n.body,
          authorEmail: n.author?.email ?? null,
          status: n.status,
          createdAt: n.created_at,
        })),
      }
    },
  },

  create_project: {
    description: 'Create a new draft project.',
    inputSchema: z.object({
      name: z.string(),
      projectType: ProjectTypeSchema,
      objective: z.string(),
      details: z.record(z.string(), z.string()).default({}),
    }),
    outputSchema: z.object({ projectId: z.string() }),
    handler: async (
      ctx,
      input: { name: string; projectType: z.infer<typeof ProjectTypeSchema>; objective: string; details: Record<string, string> }
    ) => {
      const result = await workbenchProjects.createProject(ctx, {
        name: input.name,
        projectType: input.projectType,
        objective: input.objective,
        details: input.details,
        knowledgeBaseId: null,
        evalDatasetId: null,
        members: [],
      })
      return { projectId: result.projectId }
    },
  },

  approve_project: {
    description: 'Approve a draft project (moves it to completed). Requires curator or admin.',
    inputSchema: z.object({ projectId: z.string() }),
    outputSchema: z.object({ approved: z.literal(true) }),
    handler: async (ctx, input: { projectId: string }) => {
      await workbenchProjects.approveProject(ctx, input.projectId)
      return { approved: true as const }
    },
  },

  create_workstream: {
    description: 'Create a new workstream on a project.',
    inputSchema: z.object({
      projectId: z.string(),
      name: z.string(),
      slug: z.string(),
      goal: z.string().optional(),
      guardrail: z.string().optional(),
      deliverables: z.array(z.string()).default([]),
    }),
    outputSchema: z.object({ workstreamId: z.string() }),
    handler: async (
      ctx,
      input: { projectId: string; name: string; slug: string; goal?: string; guardrail?: string; deliverables: string[] }
    ) => {
      const result = await workbenchWorkstreams.createWorkstream(ctx, {
        projectId: input.projectId,
        name: input.name,
        slug: input.slug,
        repositoryScope: [],
        goal: input.goal,
        guardrail: input.guardrail,
        deliverables: input.deliverables,
      })
      return { workstreamId: result.workstreamId }
    },
  },

  attach_workstream_artifact: {
    description: 'Attach an artifact (evidence) to a workstream.',
    inputSchema: z.object({
      workstreamId: z.string(),
      artifactType: ArtifactTypeSchema,
      title: z.string(),
      externalTool: z.string().optional(),
      content: z.string().optional(),
      externalUrl: z.string().optional(),
      notes: z.string().optional(),
    }),
    outputSchema: z.object({ attached: z.literal(true) }),
    handler: async (
      ctx,
      input: {
        workstreamId: string
        artifactType: z.infer<typeof ArtifactTypeSchema>
        title: string
        externalTool?: string
        content?: string
        externalUrl?: string
        notes?: string
      }
    ) => {
      await workbenchWorkstreams.attachArtifact(ctx, input)
      return { attached: true as const }
    },
  },
}

export async function callTool(ctx: WorkbenchCallerContext, name: string, rawInput: unknown): Promise<unknown> {
  const tool = tools[name]
  if (!tool) throw new Error(`Unknown tool: ${name}`)
  const input = tool.inputSchema.parse(rawInput)
  const output = await tool.handler(ctx, input)
  return tool.outputSchema.parse(output)
}

export function listTools(): { name: string; description: string }[] {
  return Object.entries(tools).map(([name, t]) => ({ name, description: t.description }))
}
