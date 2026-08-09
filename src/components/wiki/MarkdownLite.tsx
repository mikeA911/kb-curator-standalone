// Deliberately not a real markdown renderer -- no new dependency for this
// milestone. Handles '#'-style headings and paragraphs, which is what the
// standard Wiki article structure (and the AI synthesis prompt) produces.
export function MarkdownLite({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim())

  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-zinc-800">
      {blocks.map((block, i) => {
        const trimmed = block.trim()
        const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/)
        if (headingMatch) {
          const level = headingMatch[1].length
          const HeadingTag = (level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4') as 'h2' | 'h3' | 'h4'
          return (
            <HeadingTag key={i} className="mt-2 font-semibold text-zinc-900">
              {headingMatch[2]}
            </HeadingTag>
          )
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {trimmed}
          </p>
        )
      })}
    </div>
  )
}
