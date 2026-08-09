'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getQuickHelpAction } from '@/app/actions/wiki'
import type { QuickHelp } from '@/lib/wiki/help'

// Reusable contextual-Help trigger: resolves a Wiki article by slug and
// shows its quick_help text plus a link to the full article. Deliberately
// not scattered everywhere in this milestone -- wired into just one or two
// screens as proof of concept (see AIProviderSettings.tsx).
export function HelpTip({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false)
  const [help, setHelp] = useState<QuickHelp | null | undefined>(undefined)

  async function handleOpen() {
    setOpen((prev) => !prev)
    if (help === undefined) {
      const result = await getQuickHelpAction(slug)
      setHelp(result)
    }
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Help"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-400 text-[10px] leading-none text-zinc-500 hover:border-zinc-600 hover:text-zinc-700"
      >
        ?
      </button>
      {open && (
        <span className="absolute left-0 top-5 z-10 w-64 rounded border border-zinc-200 bg-white p-3 text-xs shadow-lg">
          {help === undefined && <span className="text-zinc-500">Loading…</span>}
          {help === null && <span className="text-zinc-500">No help article available yet.</span>}
          {help && (
            <>
              <p className="font-medium text-zinc-900">{help.title}</p>
              <p className="mt-1 text-zinc-600">{help.quickHelp}</p>
              <Link href={`/wiki/${help.slug}`} className="mt-2 inline-block underline">
                Read full article →
              </Link>
            </>
          )}
        </span>
      )}
    </span>
  )
}
