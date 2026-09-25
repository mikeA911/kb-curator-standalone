import { describe, it, expect } from 'vitest'
import { computeOntologyMapLayout, type OntologyMapData } from './ontology-map'

function emptyData(overrides: Partial<OntologyMapData> = {}): OntologyMapData {
  return { objects: [], workstreams: [], flowEdges: [], linkEdges: [], ...overrides }
}

describe('computeOntologyMapLayout', () => {
  it('returns an empty layout for a project with no ontology data', () => {
    const layout = computeOntologyMapLayout(emptyData())
    expect(layout.nodes).toEqual([])
    expect(layout.edges).toEqual([])
  })

  it('places a parent before its children (increasing x by depth) and adds an object-parent edge', () => {
    const layout = computeOntologyMapLayout(
      emptyData({
        objects: [
          { id: 'root', name: 'PhysicalAsset', parentId: null },
          { id: 'child-1', name: 'Camera', parentId: 'root' },
          { id: 'child-2', name: 'Sensor', parentId: 'root' },
        ],
      })
    )
    const root = layout.nodes.find((n) => n.id === 'root')!
    const child1 = layout.nodes.find((n) => n.id === 'child-1')!
    const child2 = layout.nodes.find((n) => n.id === 'child-2')!
    expect(root.x).toBeLessThan(child1.x)
    expect(root.x).toBeLessThan(child2.x)
    // Two children at the same depth get distinct rows (no vertical overlap).
    expect(child1.y).not.toEqual(child2.y)
    // The parent sits at the average row of its children.
    expect(root.y).toBeCloseTo((child1.y + child2.y) / 2)

    expect(layout.edges).toContainEqual(expect.objectContaining({ fromId: 'root', toId: 'child-1', kind: 'object-parent' }))
    expect(layout.edges).toContainEqual(expect.objectContaining({ fromId: 'root', toId: 'child-2', kind: 'object-parent' }))
  })

  it('treats a dangling parentId (pointing at a row outside this project) as a root, without a phantom edge', () => {
    const layout = computeOntologyMapLayout(emptyData({ objects: [{ id: 'orphan', name: 'Orphan', parentId: 'does-not-exist' }] }))
    expect(layout.nodes).toHaveLength(1)
    expect(layout.nodes[0].x).toBe(20) // PADDING -- placed as a root, not nested
    expect(layout.edges).toEqual([])
  })

  it('places the workstream cluster to the right of the object cluster, with a gap', () => {
    const layout = computeOntologyMapLayout(
      emptyData({
        objects: [{ id: 'obj-1', name: 'A Fairly Long Object Name', parentId: null }],
        workstreams: [{ id: 'ws-1', name: 'WS', parentId: null }],
      })
    )
    const obj = layout.nodes.find((n) => n.id === 'obj-1')!
    const ws = layout.nodes.find((n) => n.id === 'ws-1')!
    expect(ws.x).toBeGreaterThan(obj.x + obj.width)
  })

  it('produces a workstream-flow edge for a pipeline edge between two workstreams', () => {
    const layout = computeOntologyMapLayout(
      emptyData({
        workstreams: [
          { id: 'ws-1', name: 'Upstream', parentId: null },
          { id: 'ws-2', name: 'Downstream', parentId: null },
        ],
        flowEdges: [{ upstreamId: 'ws-1', downstreamId: 'ws-2' }],
      })
    )
    expect(layout.edges).toContainEqual(expect.objectContaining({ fromId: 'ws-1', toId: 'ws-2', kind: 'workstream-flow' }))
  })

  it('produces a labeled object-link edge for a workstream_object_links row', () => {
    const layout = computeOntologyMapLayout(
      emptyData({
        objects: [{ id: 'obj-1', name: 'Sensor', parentId: null }],
        workstreams: [{ id: 'ws-1', name: 'Ingest', parentId: null }],
        linkEdges: [{ workstreamId: 'ws-1', objectId: 'obj-1', accessModes: ['reads', 'writes'] }],
      })
    )
    expect(layout.edges).toContainEqual(
      expect.objectContaining({ fromId: 'ws-1', toId: 'obj-1', kind: 'object-link', label: 'reads, writes' })
    )
  })

  it('drops an edge whose referenced node is not in this layout (defensive, should not happen from real data)', () => {
    const layout = computeOntologyMapLayout(
      emptyData({
        workstreams: [{ id: 'ws-1', name: 'Solo', parentId: null }],
        flowEdges: [{ upstreamId: 'ws-1', downstreamId: 'missing' }],
      })
    )
    expect(layout.edges).toEqual([])
  })
})
