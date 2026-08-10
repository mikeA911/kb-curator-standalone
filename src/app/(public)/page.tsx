import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listPublicProjects } from '@/lib/projects/public'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  const featured = (await listPublicProjects(supabase)).slice(0, 3)

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4 py-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">KB Sandbox</h1>
        <p className="mx-auto max-w-xl text-zinc-600">
          Build, evaluate, govern and improve AI systems through evidence.
        </p>
        <div className="mx-auto flex gap-3">
          <Link href="/examples" className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
            Explore Examples
          </Link>
          <Link href="/about" className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium">
            Learn How It Works
          </Link>
          <Link href="/login" className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium">
            Sign In
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 text-sm text-zinc-500">
        {['Knowledge', 'Intelligence', 'Engineering', 'Governance', 'Learning'].map((step, i) => (
          <span key={step} className="flex items-center gap-2">
            {i > 0 && <span className="text-zinc-300">&rarr;</span>}
            <span className="rounded-full bg-zinc-100 px-3 py-1">{step}</span>
          </span>
        ))}
      </div>

      {featured.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Featured examples</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {featured.map((p) => (
              <Link
                key={p.id}
                href={`/examples/${p.public_slug}`}
                className="rounded border border-zinc-200 bg-white p-4 hover:border-zinc-400"
              >
                <h3 className="font-medium">{p.public_profile?.title || p.name}</h3>
                {p.public_profile?.summary && <p className="mt-1 text-sm text-zinc-600">{p.public_profile.summary}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
