import 'server-only'
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import type { JournalContent, JournalSourceConversation } from './generate'

export interface JournalDocxInput {
  title: string
  rangeLabel: string
  content: JournalContent
  conversations: JournalSourceConversation[]
  truncated: boolean
  providerDisplayName: string
  modelDisplayName: string
}

function italic(text: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, italics: true })] })
}

function bulletList(items: string[]): Paragraph[] {
  if (items.length === 0) return [italic('None recorded.')]
  return items.map((text) => new Paragraph({ text, bullet: { level: 0 } }))
}

function section(heading: string, body: Paragraph[]): Paragraph[] {
  return [new Paragraph({ text: heading, heading: HeadingLevel.HEADING_1 }), ...body]
}

// Renders entirely in memory -- no file ever touches disk or storage, so
// there's nothing to expire or clean up. The Source Appendix lists real
// conversation records (computed here, not by the model) so every
// AI-generated claim above it can be cross-checked against something real.
export async function renderJournalDocx(input: JournalDocxInput): Promise<Buffer> {
  const { content } = input

  const children: Paragraph[] = [
    new Paragraph({ text: input.title, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: input.rangeLabel }),
    new Paragraph({
      children: [
        new TextRun({
          italics: true,
          text:
            'This is an AI-generated reflection produced from your own saved Assistant conversations. ' +
            'It may include AI interpretation -- verify important details against the Source Appendix below. ' +
            `Generated using ${input.providerDisplayName} / ${input.modelDisplayName}. This document is not used as Assistant memory.`,
        }),
      ],
    }),
    ...section('Narrative', [new Paragraph({ text: content.narrative || 'Nothing recorded for this period.' })]),
    ...section('Projects & Themes', bulletList(content.projectsAndThemes)),
    ...section('Decisions & Milestones', bulletList(content.decisionsAndMilestones)),
    ...section('Lessons & Changed Assumptions', bulletList(content.lessonsAndChangedAssumptions)),
    ...section('Open Questions', bulletList(content.openQuestions)),
    ...section('Items to Revisit', bulletList(content.itemsToRevisit)),
    ...section(
      'Source Appendix',
      input.conversations.length === 0
        ? [new Paragraph({ text: 'No conversations in this period.' })]
        : input.conversations.map(
            (c) => new Paragraph({ text: `${c.title} -- ${new Date(c.date).toLocaleDateString()}`, bullet: { level: 0 } })
          )
    ),
  ]

  if (input.truncated) {
    children.push(italic('Note: this period included more content than this document could include -- some earlier items were omitted.'))
  }

  const doc = new Document({ sections: [{ properties: {}, children }] })
  return Packer.toBuffer(doc)
}
