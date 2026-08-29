import { SectionHero } from '@/components/SectionHero'

const DOMAINS = [
  {
    name: 'Everyday Business',
    description: 'Enterprise knowledge, HR policies, accounting procedures, procurement, RFP responses, sales proposals, and customer support.',
  },
  {
    name: 'Software & Modernization',
    description: 'System understanding, API discovery, architecture assessment, code review, refactoring, and introducing new features into legacy systems.',
  },
  {
    name: 'AI Engineering',
    description: 'Model comparison, RAG experiments, evaluation, local-versus-cloud AI, and infrastructure benchmarking.',
  },
  {
    name: 'Industry Applications',
    description: 'Healthcare, semiconductor quality engineering, infrastructure operations, visual and edge AI, and other evidence-intensive environments.',
  },
  {
    name: 'Education',
    description: 'Controlled AI experimentation where students learn not simply to prompt a model, but to compare, challenge, evaluate, and improve AI-generated work.',
  },
]

// A short, hand-picked subset of the full canonical glossary (the "KB
// Sandbox Vocabulary" Wiki article, kept as internal/staff reference at
// /wiki/kb-sandbox-vocabulary) -- inlined here rather than linked out, since
// this is a public page and most Wiki content isn't meant for anonymous
// visitors. A fixed, occasionally-stale copy of a handful of stable,
// foundational terms is an acceptable tradeoff for not needing a whole
// separate public-content mechanism (per Mike, 2026-08-28).
const KEY_TERMS = [
  { term: 'Workbench', definition: 'The overall KB Sandbox environment -- knowledge, projects, methods, models, and human review working together, not just a chat window.' },
  { term: 'Project', definition: 'The primary working boundary -- the people, knowledge, and work associated with one objective, isolated from every other project.' },
  { term: 'Workstream', definition: 'A structured piece of work inside a project, with its own goal, guardrails, and deliverables.' },
  { term: 'Method', definition: 'A reusable, defined way of performing a recurring kind of work, once a Workstream has proven an approach actually works.' },
  { term: 'Wiki', definition: 'Curated, reusable platform knowledge that explains established concepts -- distinct from the raw source material a project brings in as evidence.' },
  { term: 'Ember', definition: "KB Sandbox's conversational interface -- grounded in a project's approved knowledge, not a general-purpose chatbot." },
]

const UNIQUENESS = [
  { title: 'Governed AI Workbench', description: 'KB Sandbox combines knowledge, evidence, AI assistance, evaluation and human approval in one working environment. Most products concentrate on only one of these layers.' },
  { title: 'Evidence-led answers through Ember', description: 'Ember works from approved platform and project knowledge, cites its sources and records which provider and model produced each response.' },
  { title: 'Project-scoped knowledge', description: 'Each Project can combine shared organizational knowledge with customer-, department- or engagement-specific sources while restricting access to explicit members.' },
  { title: 'Knowledge-building lifecycle', description: 'Documents are uploaded, versioned, reviewed, approved and promoted into reusable knowledge. KB Sandbox treats knowledge as something governed and maintained -- not merely files placed in a chatbot.' },
  { title: 'Human access and AI access are separate', description: 'The platform distinguishes between "may this person read this?" and "may this AI provider process this?" That separation is unusually important for enterprise AI.' },
  { title: 'Shadow AI governance', description: 'Organizations can give employees a sanctioned, useful AI interface while controlling approved models and the sensitivity of information those models may receive. This makes the safe path easier than using unapproved public tools.' },
  { title: 'Pre-inference security controls', description: 'The emerging design evaluates information sensitivity before protected context is sent to a model, creating a foundation for blocking, redaction, private-model routing and human approval.' },
  { title: 'Multi-model governance', description: 'Administrators can configure multiple AI providers and models while users can see which model answered. Longer term, models can be selected according to sensitivity, quality, cost, residency and workload.' },
  { title: 'Evaluation using organizational work', description: "Models, RAG strategies and agents can be evaluated against the organization's own evidence and use cases instead of relying only on public benchmarks." },
  { title: 'Reusable Workbench Methods', description: 'Methods define requirements, evidence, deliverables, guardrails, evaluation criteria and human gates. They can govern work performed by people, external AI tools, deterministic software or future agent graphs.' },
  { title: 'Document-first AI development', description: 'KB Sandbox can investigate a requirement and produce an evidence-backed specification or implementation handoff without pretending that the conversational assistant should autonomously modify production systems.' },
  { title: 'External-agent assurance', description: 'Customer or Builder agents can be developed elsewhere, registered through versioned contracts, tested and made available through governed Projects. KB Sandbox becomes the assurance layer rather than another proprietary agent builder.' },
  { title: 'Ember as a governed enterprise interface', description: 'Employees can use one conversational interface to navigate knowledge, Projects, Methods and approved tools. Future narrow agents -- sales proposals, customer support, HR policy or ordering -- can be reached through the relevant Project.' },
  { title: 'Human authority built into projects', description: 'Projects can identify who is permitted to approve commercial terms, customer acceptance and other consequential decisions. AI may prepare the work, but authority remains explicit.' },
  { title: 'Private personal work history and journals', description: 'Conversation history and personal journals are designed around individual ownership and transparency, rather than becoming an automatic employee-surveillance mechanism.' },
  { title: 'Architecture and compliance evidence', description: 'The platform can preserve decisions, exceptions, evaluations, provenance and approvals needed for architecture governance and future compliance reporting.' },
  { title: 'Builder-managed service model', description: 'A regional software house can operate KB Sandbox for several SME customers, isolate their knowledge through Projects and reuse approved agents without forcing each SME to maintain its own AI engineering team.' },
  { title: 'Regional deployment flexibility', description: 'KB Sandbox can use cloud or private/local models and can be deployed with regional infrastructure partners when residency, sensitivity or economics justify it.' },
  { title: 'Builder and junior-developer enablement', description: 'Methods teach the skills increasingly required in AI-native delivery: defining intent, gathering evidence, setting guardrails, evaluating generated work and producing accountable handoffs.' },
  { title: 'A learning system for the enterprise', description: 'Knowledge, experiments, evaluations, user feedback and implementation findings can feed the roadmap. KB Sandbox is designed not merely to answer questions, but to help an organization learn what AI is genuinely useful for.' },
]

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHero image="/images/sections/front-page-ghibli.png" height="standard" position="center 30%" />

      <div>
        <h1 className="text-2xl font-semibold">About KB Sandbox: an Enterprise AI Workbench</h1>
        <p className="mt-2 max-w-2xl text-zinc-600">
          AI can produce an answer in seconds. The harder question is whether that answer is grounded in the right
          knowledge, whether another model would reach the same conclusion, whether the result is good enough to
          trust &mdash; and what should happen next.
        </p>
        <p className="mt-2 max-w-2xl text-zinc-600">
          KB Sandbox is an evidence-driven AI Workbench for answering those questions. It gives organizations a
          governed place to bring their knowledge, experiment with AI, compare approaches, evaluate what actually
          works, and turn successful experiments into repeatable methods for people to use.
        </p>
        <p className="mt-2 max-w-2xl font-medium text-zinc-800">
          The goal isn&rsquo;t simply to use more AI. It&rsquo;s to make better decisions about AI.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Know &rarr; Experiment &rarr; Apply</h2>
        <p className="text-sm text-zinc-700">KB Sandbox is built around a simple lifecycle.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Know</h3>
            <p className="mt-1 text-sm text-zinc-700">
              Start with evidence. Bring together the documents, policies, technical material, research, and other
              knowledge relevant to a problem. Curate what should be trusted, and organize it into project knowledge
              that AI can retrieve with provenance and citations. The knowledgebase is important &mdash; but it
              isn&rsquo;t the destination. It&rsquo;s the evidence from which the work begins.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Experiment</h3>
            <p className="mt-1 text-sm text-zinc-700">
              Find out what actually works. Use the same problem and evidence to test different models, prompts,
              retrieval strategies, architectures, or AI approaches. Capture the resulting artifacts, compare
              results, identify agreement, disagreement, unsupported claims, and uncertainty, and evaluate
              performance against common questions or expected outcomes. Keep humans responsible for deciding what
              should be accepted. This is the heart of the Workbench.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Apply</h3>
            <p className="mt-1 text-sm text-zinc-700">
              Turn successful experiments into repeatable ways of working. Once an approach has been evaluated and
              accepted, it can become a guided method that others can use &mdash; answering employee questions from
              approved HR policies, preparing an evidence-backed sales proposal, responding to an RFP, investigating
              a quality problem, understanding a legacy application, discovering an undocumented API, reviewing code
              or architecture, or evaluating an AI infrastructure decision.
            </p>
          </div>
        </div>
        <p className="text-sm text-zinc-600">The domain changes. The Workbench method remains the same.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Not another enterprise chatbot</h2>
        <p className="text-sm text-zinc-700">
          KB Sandbox includes <strong>Ember</strong>, its conversational interface &mdash; but Ember isn&rsquo;t
          intended to be another general-purpose chatbot. A conversation takes place within the context of a project
          and its approved knowledge. The objective is to make AI useful without separating the answer from the
          evidence behind it.
        </p>
        <p className="text-sm text-zinc-700">
          Different AI models can also be used within the Workbench, because there may be no universally
          &ldquo;best&rdquo; model: one may perform better at technical analysis, another may be faster or less
          expensive, and a private model may be appropriate when information cannot leave an organization&rsquo;s
          environment. KB Sandbox is designed around the idea that organizations should be able to evaluate AI
          against their own work, rather than choose technology solely from generic benchmarks.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Human judgment remains part of the system</h2>
        <p className="text-sm text-zinc-700">
          KB Sandbox isn&rsquo;t designed around autonomous AI making consequential decisions on behalf of an
          organization. AI can retrieve, analyze, compare, structure, and draft. People decide what becomes trusted
          knowledge, which findings are accepted, and what is ready to move beyond the Workbench. That principle
          already appears in our more demanding showcase work: AI assists analysis, while humans retain authority
          over what is promoted to permanent Project Knowledge or released as an implementation handoff. We think
          that boundary matters.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">The Workbench stops before production</h2>
        <p className="text-sm text-zinc-700">
          KB Sandbox isn&rsquo;t trying to replace the specialist systems organizations already use. It isn&rsquo;t
          an HRIS, CRM, accounting system, software IDE, manufacturing execution system, or infrastructure
          management platform. Instead, it helps with the work that happens before a decision is implemented:
        </p>
        <p className="rounded border border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-sm font-medium text-zinc-700">
          Discover &rarr; Understand &rarr; Experiment &rarr; Evaluate &rarr; Design &rarr; Review &rarr; Approve
        </p>
        <p className="text-sm text-zinc-700">
          The resulting decision or implementation package then moves to the appropriate production environment. A
          software refactoring plan goes to the development team and its coding tools. An infrastructure
          recommendation goes to the architects and deployment platform. An HR method continues into the HR system.
          A manufacturing corrective action remains governed by the organization&rsquo;s quality and production
          systems. KB Sandbox is the place to work out what should be done &mdash; with evidence &mdash; before
          doing it.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">One Workbench, different problems</h2>
        <p className="text-sm text-zinc-700">The same approach can be applied across very different domains.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {DOMAINS.map((d) => (
            <div key={d.name} className="rounded border border-zinc-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-zinc-900">{d.name}</h3>
              <p className="mt-1 text-sm text-zinc-600">{d.description}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-zinc-600">These aren&rsquo;t separate KB Sandbox products. They&rsquo;re different applications of the same Workbench.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Showcases are part of how we build</h2>
        <p className="text-sm text-zinc-700">
          We don&rsquo;t want to design KB Sandbox solely around imagined requirements, so we build showcase
          projects around realistic problems. Some are straightforward, such as an HR Policy Copilot. Others
          deliberately stress the Workbench: multi-model API discovery, semiconductor failure analysis, visual AI at
          the edge, or infrastructure benchmarking. Each showcase asks:
        </p>
        <p className="rounded border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
          Can KB Sandbox conduct this engagement credibly today? If not &mdash; what reusable Workbench capability
          is missing?
        </p>
        <p className="text-sm text-zinc-700">
          That turns showcase projects into both demonstrations and product-development experiments. New
          capabilities should emerge because repeated real-world problems require them &mdash; not because adding
          another feature sounds impressive.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Governed AI without killing experimentation</h2>
        <p className="text-sm text-zinc-700">
          Organizations increasingly face another problem: employees are already experimenting with AI. Simply
          prohibiting public AI tools may protect information in theory while encouraging Shadow AI in practice. We
          think the better long-term approach is to make the governed path useful. KB Sandbox can provide an
          environment where organizations determine which knowledge is available, which models are appropriate, how
          results are evaluated, and where human approval is required. As those capabilities develop, the Workbench
          can help organizations answer questions such as:
        </p>
        <ul className="flex flex-col gap-1 text-sm text-zinc-600">
          <li>Which AI models actually work for us?</li>
          <li>Which information can they access?</li>
          <li>Which workloads require private AI?</li>
          <li>Where is human review mandatory?</li>
          <li>What evidence justifies moving an experiment into production?</li>
        </ul>
        <p className="text-sm text-zinc-700">
          Governance then becomes part of experimentation, rather than something added after AI has already been
          deployed.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Why &ldquo;Sandbox&rdquo;?</h2>
        <p className="text-sm text-zinc-700">
          Because experimentation should have boundaries. A sandbox is somewhere you can try something, compare
          alternatives, make mistakes, challenge assumptions, and learn &mdash; without confusing an experiment with
          production. That&rsquo;s increasingly important with AI: a convincing answer isn&rsquo;t necessarily a
          correct answer, a powerful model isn&rsquo;t necessarily the right model, and a successful demonstration
          isn&rsquo;t necessarily ready for deployment. KB Sandbox exists to preserve those distinctions.
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded border border-zinc-200 bg-zinc-50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Our principle</h2>
        <p className="text-sm font-medium text-zinc-800">
          Bring your knowledge. Test an AI idea. Compare what happens. Evaluate the evidence. Turn what works into a
          repeatable method.
        </p>
        <p className="text-sm text-zinc-600">That&rsquo;s KB Sandbox. Know &rarr; Experiment &rarr; Apply.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Key terms</h2>
        <p className="text-sm text-zinc-700">A few words we use with specific meaning throughout KB Sandbox.</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          {KEY_TERMS.map((t) => (
            <div key={t.term}>
              <dt className="text-sm font-semibold text-zinc-900">{t.term}</dt>
              <dd className="text-sm text-zinc-600">{t.definition}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">What makes KB Sandbox different</h2>
        <p className="max-w-2xl font-medium text-zinc-800">
          KB Sandbox is an evidence-led enterprise AI Workbench where organizations build governed knowledge,
          evaluate models and agents against their own work, control which people and AI environments may use that
          knowledge, and preserve human authority over consequential decisions.
        </p>
        <dl className="flex flex-col gap-4">
          {UNIQUENESS.map((u) => (
            <div key={u.title}>
              <dt className="text-sm font-semibold text-zinc-900">{u.title}</dt>
              <dd className="mt-0.5 text-sm text-zinc-700">{u.description}</dd>
            </div>
          ))}
        </dl>
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
