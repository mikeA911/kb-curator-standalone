import { Document, Packer, Paragraph, HeadingLevel } from 'docx'
import fs from 'node:fs'

const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({ text: 'Hybrid Retrieval', heading: HeadingLevel.HEADING_1 }),
        new Paragraph(
          'Hybrid retrieval combines dense vector search with sparse keyword-based search (such as BM25) to retrieve candidate evidence for a query.'
        ),
        new Paragraph(
          'Vector search is strong at semantic similarity but can miss exact terms, identifiers, or rare vocabulary. Keyword search is strong at exact matches but misses paraphrases and synonyms.'
        ),
        new Paragraph({ text: 'When Hybrid Retrieval Helps', heading: HeadingLevel.HEADING_2 }),
        new Paragraph(
          'Hybrid retrieval is particularly useful for technical documentation containing specific identifiers, codes, or product names alongside conceptual explanations, where neither pure vector nor pure keyword search alone performs well.'
        ),
        new Paragraph(
          'Results from both retrieval methods are typically combined with a fusion method such as reciprocal rank fusion before being passed to a reranker or directly to the generation step.'
        ),
      ],
    },
  ],
})

const buffer = await Packer.toBuffer(doc)
fs.writeFileSync(new URL('./hybrid-retrieval.docx', import.meta.url), buffer)
console.log('DOCX written')
