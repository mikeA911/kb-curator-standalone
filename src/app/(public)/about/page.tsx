import { SectionHero } from '@/components/SectionHero'

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHero image="/images/sections/front-page-ghibli.png" height="standard" position="center 30%" />

      <div>
        <h1 className="text-2xl font-semibold">About KB Sandbox</h1>
        <p className="mt-2 max-w-2xl text-zinc-600">
          KB Sandbox is an AI engineering workbench: a place to curate knowledge, build with it, evaluate the
          result against evidence, and keep a human in the loop the whole way through.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Knowledge &rarr; Intelligence &rarr; Engineering &rarr; Governance &rarr; Learning</h2>
        <p className="text-sm text-zinc-700">
          Every project starts with curated <strong>Knowledge</strong> &mdash; documents and source material a
          human has reviewed and approved, not raw scraped text. That knowledge becomes usable{' '}
          <strong>Intelligence</strong> when AI can retrieve and reason over it reliably, whether from source
          chunks, a curated Wiki, or a combination of both. Building on top of that intelligence &mdash; RAG
          pipelines, prompts, graphs, and agents &mdash; is the <strong>Engineering</strong> layer.{' '}
          <strong>Governance</strong> is the evaluation and review discipline that keeps the engineering honest:
          every claim that &ldquo;this works better&rdquo; is backed by an eval run, not a hunch. And because every
          run, review, and finding is recorded with provenance, the whole loop becomes a{' '}
          <strong>Learning</strong> system &mdash; each project makes the next one better.
        </p>
        <ul className="flex flex-col gap-1 text-sm text-zinc-600">
          <li>
            <strong className="text-zinc-700">Intelligence</strong> = usable, retrievable, reasonable knowledge, not
            &ldquo;the Wiki&rdquo;.
          </li>
          <li>
            <strong className="text-zinc-700">Governance</strong> = evaluation + controls + review.
          </li>
          <li>
            <strong className="text-zinc-700">Evals</strong> = measure AI configurations, not only
            retrieval-generation pipelines.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Projects</h2>
        <p className="text-sm text-zinc-700">
          A Project is a scoped piece of AI engineering work &mdash; a learning exercise, an experiment, a client
          engagement, an internal transformation, or a knowledge-building effort. It has its own knowledge, its own
          evaluation benchmark, and its own team, isolated from every other project.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Evals</h2>
        <p className="text-sm text-zinc-700">
          Evals run a benchmark dataset against a configured AI setup &mdash; a single-pass pipeline, a bounded
          retry graph, or an Agent &mdash; and score the result: recall, grounding, latency, cost. That means a
          change to a prompt, a chunking strategy, a model, or a graph can be judged on evidence instead of
          impression, and two different configurations can be compared on the same benchmark.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Why provenance and human review matter</h2>
        <p className="text-sm text-zinc-700">
          Every chunk, Wiki article, and eval result in KB Sandbox traces back to a source and, for anything that
          becomes canonical, a human approval. AI assistance drafts; a person still reviews. That trail is what
          makes the system trustworthy enough to build on, and honest enough to teach from &mdash; which is also
          why KB Sandbox works as a training ground for AI consulting: the method is visible, not just the output.
        </p>
      </section>
    </div>
  )
}
