'use client'

import { useState } from 'react'
import type { AssistantFlowNode, AssistantNodeType } from '@/lib/workbench/assistant-descriptor'

// A fixed, small (10-node) flow -- deliberately hand-built rather than a
// diagram library (none exists in this codebase; see AGENTS.md/CLAUDE.md's
// "don't add abstractions beyond what the task requires"). The ordered
// button list IS the accessible text alternative the dev-request doc asks
// for, not a separate fallback bolted on afterward: every node is a real,
// focusable, keyboard-reachable <button> in natural document order.
// Connecting lines between steps are pure decorative CSS layered on top;
// removing them would leave a fully correct, readable, ordered list.

const TYPE_LABEL: Record<AssistantNodeType, string> = {
  model: 'Model call',
  context: 'Context assembly',
  decision: 'Decision',
  tool: 'Tool execution',
  guardrail: 'Guardrail',
  persistence: 'Persistence',
}

export function AssistantFlow({ nodes }: { nodes: AssistantFlowNode[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <ol className="flex flex-col gap-2">
      {nodes.map((node, i) => {
        const isSelected = selectedId === node.id
        const isDecision = node.implementationType === 'decision'
        return (
          <li key={node.id} className="relative">
            {i > 0 && <div aria-hidden="true" className="absolute -top-2 left-4 h-2 w-px bg-zinc-300" />}
            <button
              type="button"
              aria-expanded={isSelected}
              aria-current={isSelected ? 'step' : undefined}
              onClick={() => setSelectedId(isSelected ? null : node.id)}
              className={`flex w-full items-center gap-3 rounded border px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${
                isSelected ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 bg-white hover:border-zinc-400'
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white">
                {node.id}
              </span>
              <span className="flex-1">
                <span className="font-medium">{node.label}</span>
                {isDecision && <span className="ml-2 text-xs text-zinc-500">(branches)</span>}
              </span>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                {TYPE_LABEL[node.implementationType]}
              </span>
            </button>

            {node.next.length > 0 && (
              <p className="ml-9 mt-1 text-xs text-zinc-500">
                {node.next.map((edge, idx) => (
                  <span key={edge.targetId + idx}>
                    {idx > 0 ? ', ' : ''}
                    {edge.onLabel ? `${edge.onLabel} → ` : ''}
                    {edge.targetId}
                  </span>
                ))}
              </p>
            )}

            {isSelected && (
              <dl className="ml-9 mt-2 flex flex-col gap-1.5 rounded border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
                <div>
                  <dt className="font-medium text-zinc-500">Purpose</dt>
                  <dd>{node.purpose}</dd>
                </div>
                <div>
                  <dt className="font-medium text-zinc-500">Inputs / outputs</dt>
                  <dd>{node.inputsOutputs}</dd>
                </div>
                <div>
                  <dt className="font-medium text-zinc-500">If this fails</dt>
                  <dd>{node.failureBehavior}</dd>
                </div>
                <div>
                  <dt className="font-medium text-zinc-500">Implementation</dt>
                  <dd>{node.provenance}</dd>
                </div>
              </dl>
            )}
          </li>
        )
      })}
    </ol>
  )
}
