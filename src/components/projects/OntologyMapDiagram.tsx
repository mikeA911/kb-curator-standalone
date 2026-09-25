import type { OntologyMapLayout, OntologyMapNode } from '@/lib/projects/ontology-map'

// Real SVG <text>/<a> elements throughout (never rasterized) -- every node
// label stays selectable and screen-reader readable, and every workstream
// node is a real, focusable link to its own page, same "no separate
// fallback bolted on" principle AssistantFlow.tsx already follows for its
// own hand-built diagram. No diagram library (none exists in this
// codebase) -- plain SVG paths computed from computeOntologyMapLayout's
// already-resolved node positions.

const NODE_FILL: Record<OntologyMapNode['kind'], string> = { object: '#eff6ff', workstream: '#fffbeb' }
const NODE_STROKE: Record<OntologyMapNode['kind'], string> = { object: '#93c5fd', workstream: '#fcd34d' }
const NODE_TEXT: Record<OntologyMapNode['kind'], string> = { object: '#1e3a8a', workstream: '#78350f' }

// Cubic bezier between two node edges, curving from whichever side of
// `from` actually faces `to` -- object-link edges run right-to-left
// (workstream cluster back to the object cluster), everything else runs
// left-to-right, and a single formula handles both by relative x position.
function edgePath(from: OntologyMapNode, to: OntologyMapNode): string {
  const fromRight = from.x + from.width
  const toRight = to.x + to.width
  const forward = to.x >= fromRight
  const startX = forward ? fromRight : from.x
  const endX = forward ? to.x : toRight
  const startY = from.y + from.height / 2
  const endY = to.y + to.height / 2
  const dx = Math.max(30, Math.abs(endX - startX) / 2)
  const c1x = forward ? startX + dx : startX - dx
  const c2x = forward ? endX - dx : endX + dx
  return `M ${startX} ${startY} C ${c1x} ${startY}, ${c2x} ${endY}, ${endX} ${endY}`
}

export function OntologyMapDiagram({ layout, projectId }: { layout: OntologyMapLayout; projectId: string }) {
  const byId = new Map(layout.nodes.map((n) => [n.id, n]))

  return (
    <div className="overflow-auto rounded border border-zinc-200 bg-white">
      <svg
        role="img"
        aria-label="Ontology map: this project's domain-object tree and workstreams, with their pipeline order and linked objects"
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="block"
      >
        <defs>
          <marker id="ontology-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 8 4 L 0 8 z" fill="#a78bfa" />
          </marker>
        </defs>

        {layout.edges.map((edge) => {
          const from = byId.get(edge.fromId)
          const to = byId.get(edge.toId)
          if (!from || !to) return null
          const path = edgePath(from, to)
          if (edge.kind === 'workstream-flow') {
            return <path key={edge.id} d={path} fill="none" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="5 3" markerEnd="url(#ontology-arrow)" />
          }
          if (edge.kind === 'object-link') {
            const midX = (from.x + from.width / 2 + to.x + to.width / 2) / 2
            const midY = (from.y + from.height / 2 + to.y + to.height / 2) / 2
            return (
              <g key={edge.id}>
                <path d={path} fill="none" stroke="#5eead4" strokeWidth={1} strokeDasharray="1 3" />
                {edge.label && (
                  <text x={midX} y={midY - 4} fontSize={9} fill="#0f766e" textAnchor="middle">
                    {edge.label}
                  </text>
                )}
              </g>
            )
          }
          return <path key={edge.id} d={path} fill="none" stroke="#d4d4d8" strokeWidth={1.5} />
        })}

        {layout.nodes.map((node) => {
          const content = (
            <g>
              <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                rx={6}
                fill={NODE_FILL[node.kind]}
                stroke={NODE_STROKE[node.kind]}
              />
              <text
                x={node.x + node.width / 2}
                y={node.y + node.height / 2 + 4}
                textAnchor="middle"
                fontSize={12}
                fill={NODE_TEXT[node.kind]}
              >
                {node.label}
              </text>
            </g>
          )
          if (node.kind === 'workstream') {
            return (
              <a key={node.id} href={`/projects/${projectId}/workstreams/${node.id}`}>
                <title>{node.label}</title>
                {content}
              </a>
            )
          }
          return (
            <g key={node.id}>
              <title>{node.label}</title>
              {content}
            </g>
          )
        })}
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-blue-300 bg-blue-50" /> Domain object
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-amber-300 bg-amber-50" /> Workstream (click to open)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-px w-4 border-t border-zinc-300" /> Parent / nesting
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-px w-4 border-t border-dashed border-violet-400" /> Pipeline order
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-px w-4 border-t border-dotted border-teal-400" /> Reads / writes / creates
        </span>
      </div>
    </div>
  )
}
