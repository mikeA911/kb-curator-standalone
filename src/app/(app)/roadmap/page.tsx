import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { isPlatformOwner } from '@/lib/feedback/queries'
import { listRoadmapItems } from '@/lib/roadmap/queries'
import { RoadmapManager } from '@/components/roadmap/RoadmapManager'

// Owner-only -- same is_platform_owner gate as the Feedback board, zero
// role bypass (a platform admin who isn't also a platform owner is
// redirected, same as everywhere else this gate is used).
export default async function RoadmapPage() {
  const ctx = await requireUser()
  if (!(await isPlatformOwner(ctx))) redirect('/dashboard')

  const items = await listRoadmapItems(ctx)

  return <RoadmapManager items={items} />
}
