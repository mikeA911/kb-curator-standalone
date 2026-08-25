import 'server-only'
import type { RoadmapItem } from '@/types/database'

// A real .xlsx would need a new dependency (no exceljs/xlsx package is
// currently installed anywhere in this repo) -- CSV opens directly in
// Excel with all data intact and needs none, matching this codebase's
// repeated preference for the zero-dependency option when it satisfies the
// actual need (see e.g. this session's Markdown-renderer and screenshot-
// capture decisions).
const COLUMNS: { header: string; value: (item: RoadmapItem) => string }[] = [
  { header: 'ID', value: (i) => i.item_ref },
  { header: 'Request/change', value: (i) => i.title },
  { header: 'Type', value: (i) => i.item_type },
  { header: 'Public milestone', value: (i) => i.public_milestone ?? '' },
  { header: 'Priority', value: (i) => i.priority ?? '' },
  { header: 'Status', value: (i) => i.status },
  { header: 'Pilot position', value: (i) => i.pilot_position ?? '' },
  { header: 'Decision/next action', value: (i) => i.decision_next_action ?? '' },
  { header: 'Updated', value: (i) => i.updated_at },
]

// RFC 4180: a field is quoted (and its own quotes doubled) only when it
// contains a comma, quote, or newline -- everything else stays bare, which
// is what makes a diff of this output actually readable.
function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function buildRoadmapCsv(items: RoadmapItem[]): string {
  const lines = [COLUMNS.map((c) => escapeCsvField(c.header)).join(',')]
  for (const item of items) {
    lines.push(COLUMNS.map((c) => escapeCsvField(c.value(item))).join(','))
  }
  // CRLF line endings -- the RFC 4180 convention Excel expects.
  return lines.join('\r\n')
}
