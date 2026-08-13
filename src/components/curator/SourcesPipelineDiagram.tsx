// Plain styled boxes + text arrows, matching the ASCII-flow style already
// used in Wiki article content (e.g. "Documents -> Parse -> Chunk -> Embed")
// rather than introducing an SVG diagramming dependency for one flowchart.
// Mirrors the RAG-vs-Wiki framing already written out in prose on the public
// About page -- this is the same idea, drawn instead of described.
function Box({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'accent' }) {
  return (
    <div
      className={`rounded border px-4 py-2 text-center text-sm font-medium ${
        tone === 'accent' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 bg-white text-zinc-800'
      }`}
    >
      {children}
    </div>
  )
}

function Arrow({ direction = 'down' }: { direction?: 'down' | 'right' }) {
  return <div className="text-zinc-400" aria-hidden>{direction === 'down' ? '↓' : '→'}</div>
}

export function SourcesPipelineDiagram() {
  return (
    <div className="flex flex-col items-center gap-2 rounded border border-zinc-200 bg-zinc-50 p-6">
      <Box>Sources</Box>
      <Arrow />
      <Box>Parse / Chunk</Box>
      <Arrow />
      <Box>Human Curation</Box>
      <Arrow />
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex flex-col items-center gap-2">
          <Box>Retrievable Evidence
            <div className="mt-0.5 text-xs font-normal text-zinc-500">Raw chunks</div>
          </Box>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Box>Synthesized Knowledge
            <div className="mt-0.5 text-xs font-normal text-zinc-500">Wiki</div>
          </Box>
        </div>
      </div>
      <Arrow />
      <Box tone="accent">RAG / Graph / Agent</Box>
    </div>
  )
}
