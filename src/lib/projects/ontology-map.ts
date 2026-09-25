import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Ontology Map: a visual node-link diagram of a Project's Builder Ontology
// (Parts A-D) -- project_objects (domain-object tree), project_workstreams
// (its own nesting tree, plus workstream_flow pipeline edges), and
// workstream_object_links connecting the two. Split into a data-fetch step
// and a pure layout-computation step (no React, no DOM) so the layout math
// is unit-testable on its own.

export interface OntologyMapData {
  objects: { id: string; name: string; parentId: string | null }[]
  workstreams: { id: string; name: string; parentId: string | null }[]
  flowEdges: { upstreamId: string; downstreamId: string }[]
  linkEdges: { workstreamId: string; objectId: string; accessModes: string[] }[]
}

// project_objects/project_workstreams/workstream_flow/workstream_object_links
// were all added by the Builder Ontology work this session -- a project
// created before that (most of the 49 real projects already in this
// deployment) simply has none of these rows, which every query below
// already handles by returning an empty array, not an error.
export async function getOntologyMapData(supabase: SupabaseClient<Database>, projectId: string): Promise<OntologyMapData> {
  const [{ data: objects, error: objectsError }, { data: workstreams, error: workstreamsError }] = await Promise.all([
    supabase.from('project_objects').select('id, name, parent_object_id').eq('project_id', projectId),
    supabase.from('project_workstreams').select('id, name, parent_workstream_id').eq('project_id', projectId),
  ])
  if (objectsError) throw objectsError
  if (workstreamsError) throw workstreamsError

  const workstreamIds = (workstreams ?? []).map((w) => w.id)
  const objectIds = (objects ?? []).map((o) => o.id)

  const [{ data: flow, error: flowError }, { data: links, error: linksError }] = await Promise.all([
    workstreamIds.length > 0
      ? supabase.from('workstream_flow').select('upstream_workstream_id, downstream_workstream_id').in('upstream_workstream_id', workstreamIds)
      : Promise.resolve({ data: [], error: null }),
    workstreamIds.length > 0 && objectIds.length > 0
      ? supabase.from('workstream_object_links').select('workstream_id, object_id, access_modes').in('workstream_id', workstreamIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (flowError) throw flowError
  if (linksError) throw linksError

  return {
    objects: (objects ?? []).map((o) => ({ id: o.id, name: o.name, parentId: o.parent_object_id })),
    workstreams: (workstreams ?? []).map((w) => ({ id: w.id, name: w.name, parentId: w.parent_workstream_id })),
    flowEdges: (flow ?? []).map((f) => ({ upstreamId: f.upstream_workstream_id, downstreamId: f.downstream_workstream_id })),
    linkEdges: (links ?? []).map((l) => ({ workstreamId: l.workstream_id, objectId: l.object_id, accessModes: l.access_modes })),
  }
}

export interface OntologyMapNode {
  id: string
  label: string
  kind: 'object' | 'workstream'
  x: number
  y: number
  width: number
  height: number
}

export interface OntologyMapEdge {
  id: string
  fromId: string
  toId: string
  kind: 'object-parent' | 'workstream-parent' | 'workstream-flow' | 'object-link'
  label?: string
}

export interface OntologyMapLayout {
  nodes: OntologyMapNode[]
  edges: OntologyMapEdge[]
  width: number
  height: number
}

const NODE_HEIGHT = 32
const ROW_HEIGHT = 44
const COLUMN_GAP = 48
const CLUSTER_GAP = 96
const PADDING = 20
const CHAR_WIDTH = 7
const MIN_NODE_WIDTH = 90
const MAX_NODE_WIDTH = 220

function nodeWidth(label: string): number {
  return Math.min(MAX_NODE_WIDTH, Math.max(MIN_NODE_WIDTH, label.length * CHAR_WIDTH + 24))
}

// Lays out one tree (objects, or workstreams via parent_workstream_id) left
// to right by depth, with siblings ordered alphabetically for a
// deterministic, presentable diagram. Uses the classic leaf-counting
// technique: a leaf gets the next sequential row slot; a parent's row is
// the average of its children's rows -- guarantees no vertical overlap
// without a general force-directed layout, and works for a forest (many
// disconnected roots) as well as a single tree, which is exactly this
// ontology's own shape (most classes are standalone roots; a few branch).
function layoutTree(
  items: { id: string; label: string; parentId: string | null }[],
  kind: OntologyMapNode['kind'],
  startX: number
): { nodes: OntologyMapNode[]; maxDepth: number } {
  const byId = new Map(items.map((i) => [i.id, i]))
  const childrenByParent = new Map<string | null, typeof items>()
  for (const item of items) {
    const key = item.parentId && byId.has(item.parentId) ? item.parentId : null
    if (!childrenByParent.has(key)) childrenByParent.set(key, [])
    childrenByParent.get(key)!.push(item)
  }
  for (const list of childrenByParent.values()) list.sort((a, b) => a.label.localeCompare(b.label))

  const rowById = new Map<string, number>()
  const depthById = new Map<string, number>()
  let nextLeafRow = 0
  let maxDepth = 0

  function place(id: string, depth: number): number {
    maxDepth = Math.max(maxDepth, depth)
    depthById.set(id, depth)
    const children = childrenByParent.get(id) ?? []
    let row: number
    if (children.length === 0) {
      row = nextLeafRow
      nextLeafRow += 1
    } else {
      const childRows = children.map((c) => place(c.id, depth + 1))
      row = childRows.reduce((a, b) => a + b, 0) / childRows.length
    }
    rowById.set(id, row)
    return row
  }
  for (const root of childrenByParent.get(null) ?? []) place(root.id, 0)

  // Column x-offsets: each column's width is its own widest label, so
  // dense columns don't force sparse ones to sit further right than needed.
  const widthByDepth: number[] = []
  for (const item of items) {
    const depth = depthById.get(item.id) ?? 0
    widthByDepth[depth] = Math.max(widthByDepth[depth] ?? 0, nodeWidth(item.label))
  }
  const xByDepth: number[] = []
  let cursor = startX
  for (let d = 0; d < widthByDepth.length; d++) {
    xByDepth[d] = cursor
    cursor += (widthByDepth[d] ?? MIN_NODE_WIDTH) + COLUMN_GAP
  }

  const nodes: OntologyMapNode[] = items.map((item) => {
    const depth = depthById.get(item.id) ?? 0
    return {
      id: item.id,
      label: item.label,
      kind,
      x: xByDepth[depth],
      y: (rowById.get(item.id) ?? 0) * ROW_HEIGHT,
      width: nodeWidth(item.label),
      height: NODE_HEIGHT,
    }
  })
  return { nodes, maxDepth }
}

export function computeOntologyMapLayout(data: OntologyMapData): OntologyMapLayout {
  const { nodes: objectNodes } = layoutTree(
    data.objects.map((o) => ({ id: o.id, label: o.name, parentId: o.parentId })),
    'object',
    PADDING
  )
  const objectsRightEdge = objectNodes.reduce((max, n) => Math.max(max, n.x + n.width), PADDING)
  const workstreamStartX = data.objects.length > 0 ? objectsRightEdge + CLUSTER_GAP : PADDING

  const { nodes: workstreamNodes } = layoutTree(
    data.workstreams.map((w) => ({ id: w.id, label: w.name, parentId: w.parentId })),
    'workstream',
    workstreamStartX
  )

  const nodes = [...objectNodes, ...workstreamNodes]
  const byId = new Map(nodes.map((n) => [n.id, n]))

  const edges: OntologyMapEdge[] = []
  for (const o of data.objects) {
    if (o.parentId && byId.has(o.parentId)) {
      edges.push({ id: `op-${o.parentId}-${o.id}`, fromId: o.parentId, toId: o.id, kind: 'object-parent' })
    }
  }
  for (const w of data.workstreams) {
    if (w.parentId && byId.has(w.parentId)) {
      edges.push({ id: `wp-${w.parentId}-${w.id}`, fromId: w.parentId, toId: w.id, kind: 'workstream-parent' })
    }
  }
  for (const f of data.flowEdges) {
    if (byId.has(f.upstreamId) && byId.has(f.downstreamId)) {
      edges.push({ id: `wf-${f.upstreamId}-${f.downstreamId}`, fromId: f.upstreamId, toId: f.downstreamId, kind: 'workstream-flow' })
    }
  }
  for (const l of data.linkEdges) {
    if (byId.has(l.workstreamId) && byId.has(l.objectId)) {
      edges.push({
        id: `ol-${l.workstreamId}-${l.objectId}`,
        fromId: l.workstreamId,
        toId: l.objectId,
        kind: 'object-link',
        label: l.accessModes.join(', '),
      })
    }
  }

  const width = nodes.reduce((max, n) => Math.max(max, n.x + n.width), 0) + PADDING
  const height = nodes.reduce((max, n) => Math.max(max, n.y + n.height), 0) + PADDING

  return { nodes, edges, width: Math.max(width, PADDING * 2), height: Math.max(height, PADDING * 2) }
}
