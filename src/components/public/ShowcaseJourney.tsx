import Link from 'next/link'
import {
  BUILDER_LIFECYCLE,
  FEATURED_SHOWCASES,
  SCHOOL_LAB_STEPS,
  SHOWCASE_STAGES,
  type ShowcaseCard,
  type ShowcaseStage,
  type ShowcaseStatus,
} from '@/lib/showcases/journey'

const STATUS_STYLES: Record<ShowcaseStatus, string> = {
  'Live demonstrated': 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'Pilot demonstrated': 'border-sky-200 bg-sky-50 text-sky-800',
  Prototype: 'border-amber-200 bg-amber-50 text-amber-800',
  Concept: 'border-zinc-200 bg-zinc-100 text-zinc-600',
}

const ACCENT_STYLES: Record<ShowcaseStage['accent'], { badge: string; border: string; wash: string }> = {
  teal: { badge: 'bg-teal-700 text-white', border: 'border-teal-200', wash: 'from-teal-50' },
  blue: { badge: 'bg-blue-700 text-white', border: 'border-blue-200', wash: 'from-blue-50' },
  amber: { badge: 'bg-amber-600 text-white', border: 'border-amber-200', wash: 'from-amber-50' },
  violet: { badge: 'bg-violet-700 text-white', border: 'border-violet-200', wash: 'from-violet-50' },
  rose: { badge: 'bg-rose-700 text-white', border: 'border-rose-200', wash: 'from-rose-50' },
}

function CardAction({ card }: { card: ShowcaseCard }) {
  if (!card.href) {
    return <span className="mt-auto pt-4 text-xs font-medium uppercase tracking-wide text-zinc-400">Showcase in development</span>
  }

  const className = 'mt-auto pt-4 text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-4'
  const label = card.actionLabel ?? 'View showcase'

  if (card.href.startsWith('http')) {
    return (
      <a href={card.href} className={className} target="_blank" rel="noreferrer">
        {label} <span aria-hidden="true">↗</span>
      </a>
    )
  }

  return (
    <Link href={card.href} className={className}>
      {label} <span aria-hidden="true">→</span>
    </Link>
  )
}

function ShowcaseCardView({ card, featured = false }: { card: ShowcaseCard; featured?: boolean }) {
  return (
    <article className={`flex h-full flex-col rounded-2xl border border-zinc-200 bg-white ${featured ? 'p-6 shadow-sm' : 'p-5'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[card.status]}`}>{card.status}</span>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{card.eyebrow}</span>
      </div>

      <h3 className={`${featured ? 'mt-5 text-xl' : 'mt-4 text-lg'} font-semibold tracking-tight text-zinc-950`}>{card.title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{card.summary}</p>

      <div className="mt-4 rounded-xl bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-800">{card.outcome}</div>

      {card.disclosure && <p className="mt-3 text-xs leading-5 text-zinc-500">{card.disclosure}</p>}

      <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Relevant audiences and capabilities">
        {card.audiences.map((audience) => (
          <span key={audience} className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white">
            {audience}
          </span>
        ))}
        {card.capabilities.map((capability) => (
          <span key={capability} className="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-600">
            {capability}
          </span>
        ))}
      </div>

      <CardAction card={card} />
    </article>
  )
}

function Sequence({ items }: { items: readonly string[] }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
      {items.map((item, index) => (
        <li key={item} className="relative rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm text-white/90">
          <span className="mb-2 block text-xs font-semibold text-white/50">{String(index + 1).padStart(2, '0')}</span>
          {item}
          {index < items.length - 1 && (
            <span className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-white/40 lg:block" aria-hidden="true">
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

/**
 * Compact mode renders a "choose your path" header linking back to the full journey on `/`
 * (stage anchors, audience paths) instead of duplicating the flagship cards and full stage
 * grids that already appear there in full. See docs/design-notes/showcase-journey-component-handoff.md.
 */
function ShowcaseJourneyCompact() {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8" aria-labelledby="showcase-journey-compact-title">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Choose your path</p>
        <h2 id="showcase-journey-compact-title" className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
          Know → Apply → Connect → Build → Learn
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          The full showcase walks through trusted knowledge, applied work, live connections, builder tools and the School AI
          Builder Laboratory, with flagship demonstrations at every stage.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Showcase stages">
        {SHOWCASE_STAGES.map((stage) => {
          const accent = ACCENT_STYLES[stage.accent]
          return (
            <Link key={stage.id} href={`/#showcase-stage-${stage.id}`} className={`rounded-full border ${accent.border} bg-white px-3 py-1.5 text-sm hover:bg-zinc-50`}>
              <span className={`mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${accent.badge}`}>
                {stage.step}
              </span>
              {stage.verb}
            </Link>
          )
        })}
      </nav>

      <nav className="flex flex-wrap gap-2" aria-label="Choose a showcase path">
        {(['Organizations', 'Builders', 'Schools'] as const).map((audience) => (
          <Link key={audience} href="/#showcase-progress" className="rounded-full border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50">
            For {audience}
          </Link>
        ))}
      </nav>

      <Link href="/" className="text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-4">
        See the full showcase <span aria-hidden="true">→</span>
      </Link>
    </section>
  )
}

export function ShowcaseJourney({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  if (variant === 'compact') return <ShowcaseJourneyCompact />

  return (
    <section className="flex flex-col gap-14" aria-labelledby="showcase-journey-title">
      <div className="overflow-hidden rounded-3xl bg-zinc-950 px-6 py-10 text-white sm:px-10 sm:py-14">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">See what governed enterprise AI can do</p>
          <h2 id="showcase-journey-title" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Start with trusted knowledge. Grow into useful work, connected systems and new AI capabilities.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            Follow the journey for an organization, a regional builder or a school AI laboratory. Every stage keeps evidence,
            permissions and human authority visible.
          </p>
        </div>

        <nav className="mt-8 flex flex-wrap gap-2" aria-label="Choose a showcase path">
          {['Organizations', 'Builders', 'Schools'].map((audience) => (
            <a key={audience} href="#showcase-progress" className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
              For {audience}
            </a>
          ))}
        </nav>
      </div>

      <div>
        <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Begin with proof</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Flagship demonstrations</h2>
          </div>
          <p className="max-w-md text-sm text-zinc-600">Recognizable business problems first. Technical depth remains available inside each story.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {FEATURED_SHOWCASES.map((card) => (
            <ShowcaseCardView key={card.id} card={card} featured />
          ))}
        </div>
      </div>

      <div id="showcase-progress" className="scroll-mt-24">
        <div className="mb-6 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">A progressive capability journey</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Know → Apply → Connect → Build → Learn</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            The stages build on one another, but customers can start wherever their evidence, systems and people are ready.
          </p>
        </div>

        <nav className="grid gap-2 sm:grid-cols-5" aria-label="Showcase stages">
          {SHOWCASE_STAGES.map((stage) => {
            const accent = ACCENT_STYLES[stage.accent]
            return (
              <a key={stage.id} href={`#showcase-stage-${stage.id}`} className={`rounded-xl border ${accent.border} bg-white p-3 hover:bg-zinc-50`}>
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${accent.badge}`}>{stage.step}</span>
                <span className="ml-2 text-sm font-semibold text-zinc-900">{stage.verb}</span>
              </a>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-12">
        {SHOWCASE_STAGES.map((stage) => {
          const accent = ACCENT_STYLES[stage.accent]
          return (
            <section
              key={stage.id}
              id={`showcase-stage-${stage.id}`}
              className={`scroll-mt-24 rounded-3xl border ${accent.border} bg-gradient-to-br ${accent.wash} to-white p-5 sm:p-7`}
              aria-labelledby={`showcase-stage-${stage.id}-title`}
            >
              <div className="mb-6 flex gap-4">
                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${accent.badge}`}>
                  {stage.step}
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{stage.verb}</p>
                  <h2 id={`showcase-stage-${stage.id}-title`} className="mt-1 text-xl font-semibold text-zinc-950">
                    {stage.title}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">{stage.description}</p>
                </div>
              </div>

              {stage.id === 'build' && (
                <div className="mb-6 rounded-2xl bg-violet-950 p-4 sm:p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">The builder lifecycle</p>
                  <Sequence items={BUILDER_LIFECYCLE} />
                </div>
              )}

              {stage.id === 'learn' && (
                <div className="mb-6 rounded-2xl bg-rose-950 p-4 sm:p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-rose-200">School AI Builder Laboratory</p>
                  <Sequence items={SCHOOL_LAB_STEPS} />
                </div>
              )}

              <div className={`grid gap-4 ${stage.cards.length === 2 ? 'md:grid-cols-2' : 'lg:grid-cols-3'}`}>
                {stage.cards.map((card) => (
                  <ShowcaseCardView key={card.id} card={card} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-center sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">The operating principle</p>
        <p className="mx-auto mt-3 max-w-3xl text-xl font-semibold leading-8 text-zinc-950 sm:text-2xl">
          Discover with evidence. Specify the boundary. Build externally. Test the permissions. Approve the version. Let Ember use only
          what the Project needs.
        </p>
      </div>
    </section>
  )
}

