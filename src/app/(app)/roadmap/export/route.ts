import { redirect } from 'next/navigation'
import { AuthError, requireUser } from '@/lib/auth'
import { isPlatformOwner } from '@/lib/feedback/queries'
import { listRoadmapItems } from '@/lib/roadmap/queries'
import { buildRoadmapCsv } from '@/lib/roadmap/csv'

// A Route Handler, not a Server Action, for the same reason as
// /profile/journal's own download -- only it can set Content-Disposition
// and stream a body for a real browser download.
export async function GET() {
  let ctx
  try {
    ctx = await requireUser()
  } catch (err) {
    if (err instanceof AuthError) redirect('/login')
    throw err
  }
  if (!(await isPlatformOwner(ctx))) redirect('/roadmap')

  const items = await listRoadmapItems(ctx)
  const csv = buildRoadmapCsv(items)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="kb-sandbox-roadmap-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
