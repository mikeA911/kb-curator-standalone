import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth'
import { isPlatformOwner, getFeedbackReport, getFeedbackReportStatusHistory } from '@/lib/feedback/queries'
import { FeedbackReportManager } from '@/components/feedback/FeedbackReportManager'

export default async function FeedbackReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireUser()

  const report = await getFeedbackReport(ctx, id)
  if (!report) notFound()

  const isOwner = await isPlatformOwner(ctx)
  const isReporter = report.reporter_id === ctx.user.id
  if (!isOwner && !isReporter) redirect('/feedback')

  const [statusHistory, owners] = await Promise.all([
    isOwner ? getFeedbackReportStatusHistory(ctx, id) : Promise.resolve([]),
    isOwner ? ctx.supabase.from('platform_owners').select('user_id, email') : Promise.resolve({ data: [] }),
  ])

  // Same narrow admin-client email lookup as members/governance pages --
  // id+email only, never role/is_active/anything else.
  const admin = createAdminClient()
  const ids = [report.reporter_id, report.assignee_id].filter((x): x is string => !!x)
  const { data: profiles } = ids.length ? await admin.from('profiles').select('id, email').in('id', ids) : { data: [] }
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]))

  return (
    <FeedbackReportManager
      report={report}
      statusHistory={statusHistory}
      isOwner={isOwner}
      reporterEmail={emailById.get(report.reporter_id) ?? report.reporter_id}
      assigneeEmail={report.assignee_id ? (emailById.get(report.assignee_id) ?? report.assignee_id) : null}
      owners={(owners.data ?? []).map((o) => ({ userId: o.user_id, email: o.email }))}
    />
  )
}
