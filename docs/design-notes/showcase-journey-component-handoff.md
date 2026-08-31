# Showcase Journey Component Handoff

## Integration decision (2026-08-31)

Integrated per `docs/dev-request-public-showcase-journey-integration.md`. Chose the arrangement that alternative explicitly names: **landing page renders the complete journey; Examples renders a compact "choose your path" header instead of duplicating it.**

- `src/app/(public)/page.tsx` renders `<ShowcaseJourney />` (full: hero, flagship cards, all 5 stages) in place of the old chip row and the `listPublicProjects(...).slice(0, 3)` "Featured examples" grid. Those published Projects are not hidden -- they remain fully listed on `/examples`, just no longer duplicated on the landing page as a second, competing progression.
- `src/app/(public)/examples/page.tsx` renders `<ShowcaseJourney variant="compact" />` above the existing type-filtered, database-backed published catalogue. The component gained a `variant?: 'full' | 'compact'` prop (the "supported compact mode" the dev request suggested) rather than the landing/Examples pages re-implementing any of the catalogue's markup themselves. Compact mode links back to the full journey's stage anchors and audience-path anchor on `/`.
- The two temporary Claude artifact links (HR walkthrough, Ember onboarding) were kept as-is per the dev request -- do not replace them until an equivalent internal `/examples/...` page exists.
- The HR flagship card (`one-document-two-views`) now carries a `disclosure` field with the required synthetic-data notice, rendered under its outcome line.
- No Concept-status card has an `href` -- enforced by a `journey.test.ts` test so a future edit can't accidentally make a Concept card look like a working link.

The reusable public showcase component is:

```text
src/components/public/ShowcaseJourney.tsx
```

Its typed content catalogue is kept separately in:

```text
src/lib/showcases/journey.ts
```

This separation lets the landing page remain untouched while other work is in progress. To render the full showcase later:

```tsx
import { ShowcaseJourney } from '@/components/public/ShowcaseJourney'

// In a public page:
<ShowcaseJourney />
```

## Integration notes

- The component is a static Server Component and introduces no browser JavaScript, database query or schema dependency.
- Internal links use Next.js `Link`; external verified walkthroughs open in a new tab.
- Cards without a published destination deliberately render `Showcase in development` rather than linking to a guessed route.
- Replace the two temporary Claude artifact URLs with durable `/examples/...` links when their approved KB Sandbox showcases are published.
- Status labels distinguish `Live demonstrated`, `Pilot demonstrated`, `Prototype` and `Concept`.
- Content is organized into the progressive `Know -> Apply -> Connect -> Build -> Learn` journey.
- The Builder and School stages include their full lifecycle sequences.
- The landing page and `/examples` page were intentionally left untouched until this handoff's own integration pass -- see "Integration decision" above for what changed and why.

Automated content-contract tests are in `src/lib/showcases/journey.test.ts`.
