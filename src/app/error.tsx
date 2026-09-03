'use client'

import Link from 'next/link'

// Root error boundary -- until this existed, ANY render-time error anywhere
// in the app (not just the chat turn, which already had its own safety net
// in runAssistantTurn) surfaced as production's opaque "Minified React
// error #441" with no way to tell whether whatever action triggered it
// actually completed. Caught live: an admin attaching a knowledge base to a
// project they aren't a real member of -- the attach itself succeeds
// (can_curate_project has an admin bypass), but the page's own re-render
// hits project_knowledge_bases' strict-membership-only SELECT policy
// (deliberately no admin bypass, see 20260824210001_project_junction_
// manage_policies_no_select_leak.sql) and can crash downstream. This
// doesn't fix that specific inconsistency -- it only guarantees a readable
// message and a retry instead of a dead end, same scope as OL-008's fix.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-zinc-600">
        This page hit an unexpected error. If you just did something (attached a knowledge base, saved a change, sent a message), check the page
        after retrying to confirm it didn&apos;t happen twice.
      </p>
      {error.digest && <p className="text-xs text-zinc-400">Reference: {error.digest}</p>}
      <div className="flex gap-3">
        <button onClick={() => reset()} className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
          Try again
        </button>
        <Link href="/dashboard" className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700">
          Go to Workbench
        </Link>
      </div>
    </div>
  )
}
