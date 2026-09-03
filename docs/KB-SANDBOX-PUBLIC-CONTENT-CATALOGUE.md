# KB Sandbox Public Content and Blog Catalogue

**Live site:** <https://kbsandbox.tech>  
**Anonymous verification date:** 1 September 2026  
**Purpose:** A shareable inventory of KB Sandbox pages and published articles that are intended to be accessible from the public internet without signing in.

## Public site areas

| Area | Public link | Purpose |
| --- | --- | --- |
| Home | <https://kbsandbox.tech/> | Public introduction and entry point |
| About | <https://kbsandbox.tech/about> | Product purpose, principles and terminology |
| Public knowledge | <https://kbsandbox.tech/knowledge> | Publicly available approved Wiki/knowledge content |
| Examples | <https://kbsandbox.tech/examples> | Public showcase examples |
| Blog | <https://kbsandbox.tech/blog> | Index of published articles |
| Sign in | <https://kbsandbox.tech/login> | Authentication entry point; the form is public but the application beyond it is protected |
| Sitemap | <https://kbsandbox.tech/sitemap.xml> | Search-engine discovery file |
| Robots | <https://kbsandbox.tech/robots.txt> | Search-crawler policy |

Authenticated Workbench, Project, source, administration, contribution and private Wiki routes are deliberately excluded from this public catalogue.

## Published blog posts

1. [Practical AI Architecture Governance — and Where KB Sandbox Fits](https://kbsandbox.tech/blog/practical-ai-architecture-governance-and-kbsandbox)
2. [Why AI Responses Need Structure, Not Just Markdown](https://kbsandbox.tech/blog/why-ai-responses-need-structure-not-just-markdown)
3. [Conversation History Is Not the Same as AI Memory](https://kbsandbox.tech/blog/conversation-history-is-not-ai-memory)
4. [Your AI Assistant Should Tell You Which Model Answered](https://kbsandbox.tech/blog/your-ai-assistant-should-tell-you-which-model-answered)
5. [A Private AI Journal Should Belong to the Individual](https://kbsandbox.tech/blog/a-private-ai-journal-should-belong-to-the-individual)
6. [One Default AI Model Is Not Enough](https://kbsandbox.tech/blog/one-default-ai-model-is-not-enough)
7. [Private AI Deployment Is an Operating Model, Not a Docker File](https://kbsandbox.tech/blog/private-ai-deployment-is-an-operating-model)
8. [The Document-First Principle for Enterprise AI](https://kbsandbox.tech/blog/the-document-first-principle-for-enterprise-ai)
9. [Before the AI-Native SDLC: Test What Is Worth Building](https://kbsandbox.tech/blog/before-the-ai-native-sdlc-test-what-is-worth-building)
10. [NotebookLM vs. kbSandbox: From Shared Notebooks to Governed Organizational Knowledge](https://kbsandbox.tech/blog/notebooklm-vs-kb-sandbox-governed-organizational-knowledge)
11. [KB Sandbox Deployment and Server Options](https://kbsandbox.tech/blog/deployment-and-server-options)

This list represents posts returned by the live public Blog index and production sitemap on the verification date. Drafts and unpublished placeholders are not included.

## External publication

- [Practical AI Architecture Governance on Substack](https://mikea911.substack.com/p/practical-ai-architecture-governance)

Add other Substack or partner-publication links here only after the corresponding public URL is confirmed.

## Production SEO issue found during verification

The production sitemap currently publishes `http://localhost:3000` URLs. The Blog index also emits a `http://localhost:3000/blog` canonical URL and Open Graph URL. These should be generated as `https://kbsandbox.tech/...` in production.

Recommended acceptance check after correction:

- Every `<loc>` in `/sitemap.xml` begins with `https://kbsandbox.tech/`.
- Canonical and `og:url` values on Home, About, Blog and every published post use `https://kbsandbox.tech`.
- No draft, protected, contribution or administration route appears in the sitemap.
- Every listed URL returns public content without an authenticated session.

## Maintenance rule

Update this catalogue whenever a production commit adds, publishes, renames or removes a public page or blog post. The live site remains authoritative; this document is a convenient human-readable index and verification record.
