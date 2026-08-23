import { redirect } from 'next/navigation'
import { AuthError, requireUser } from '@/lib/auth'
import { getActiveStructuredOutputProvider, getDefaultStructuredOutputModel } from '@/lib/ai'
import { gatherJournalSource, generateJournalContent } from '@/lib/journal/generate'
import { renderJournalDocx } from '@/lib/journal/docx'

// MVP scope (docs/dev-request-private-work-journal.md): a fixed last-30-days
// range, one detail/style combination. A Route Handler, not a Server Action,
// is required here specifically because only it can set Content-Disposition
// and stream a binary body for a real browser download.
const RANGE_DAYS = 30

export async function GET() {
  let ctx
  try {
    ctx = await requireUser()
  } catch (err) {
    if (err instanceof AuthError) redirect('/login')
    throw err
  }
  if (ctx.profile.role === 'anonymous') redirect('/profile')

  const now = new Date()
  const sinceDate = new Date(now.getTime() - RANGE_DAYS * 24 * 60 * 60 * 1000)
  const rangeLabel = `${sinceDate.toLocaleDateString()} – ${now.toLocaleDateString()} (last ${RANGE_DAYS} days)`

  const source = await gatherJournalSource(ctx, sinceDate)
  const [{ provider: providerRow, model: modelRow }, provider] = await Promise.all([
    getDefaultStructuredOutputModel(ctx.supabase),
    getActiveStructuredOutputProvider(ctx.supabase, { requestedBy: ctx.user.id }),
  ])
  const content = await generateJournalContent(provider, source, rangeLabel)

  const buffer = await renderJournalDocx({
    title: 'My KB Sandbox Journal',
    rangeLabel,
    content,
    conversations: source.conversations,
    truncated: source.truncated,
    providerDisplayName: providerRow.display_name,
    modelDisplayName: modelRow.display_name,
  })

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="kb-sandbox-journal-${now.toISOString().slice(0, 10)}.docx"`,
    },
  })
}
