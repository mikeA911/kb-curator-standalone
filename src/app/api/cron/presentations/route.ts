import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { autoOpenScheduledPresentations } from '@/lib/workbench/presentations'

// First scheduled/background job in this codebase -- see vercel.json's
// crons entry. Vercel auto-sends `Authorization: Bearer <CRON_SECRET>` on
// requests it makes to a cron path; this route has no other caller, so a
// mismatched or missing header is simply unauthorized, not a real user
// permission question.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${env.cronSecret()}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await autoOpenScheduledPresentations()
  return NextResponse.json(result)
}
