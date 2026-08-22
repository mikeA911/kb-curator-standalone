# Practical Architecture Governance in Southeast Asia

## TOGAF, COBIT, and the frameworks that complement them

*Enterprise architecture governance does not have to mean importing a large framework and applying every part of it. For organisations across Southeast Asia, the better question is: what is the smallest governance system that will produce clear decisions, credible evidence, and responsible change?*

Digital growth across Southeast Asia is happening in environments that are rarely simple. A single organisation may operate modern cloud services alongside legacy applications, work with several technology partners, process data across national borders, and answer to different regulators in different markets.

In this setting, architecture governance can easily go wrong in one of two directions. It can be too weak, leaving important technology decisions undocumented and risks poorly understood. Or it can become too heavy, creating review boards and templates that slow delivery without improving outcomes.

The practical objective lies between those extremes: enough structure to make decisions visible and accountable, applied in proportion to the risk.

TOGAF is often the first framework considered for this purpose. It is valuable, but it is not the only relevant body of knowledge—and several commonly described “alternatives” are not really alternatives at all. They address different questions.

## What architecture governance is meant to achieve

Architecture governance is the system by which an organisation directs, reviews, and learns from architecture-related decisions. A useful governance system should make it possible to answer questions such as:

- What business outcome is this change intended to support?
- Who has the authority to approve it?
- Which principles, standards, obligations, and risks apply?
- What evidence supports the decision?
- Is the proposed exception justified, time-limited, and owned?
- Who must review the result, and when?

The value is not in the number of documents produced. It is in the quality and traceability of the decisions.

This distinction matters because governance is sometimes mistaken for control. Effective governance should not require every decision to pass through the same process. A low-risk internal change and a major banking platform replacement should not face identical evidence requirements or approval paths.

## TOGAF as a starting structure

The TOGAF Standard provides a broad approach to enterprise architecture, supported by an architecture development method, governance concepts, techniques, and a library of guidance. It gives organisations a language for connecting business direction with changes across business, data, applications, and technology.

For governance purposes, the most useful ideas include:

- Defined decision rights and accountable architecture roles
- Architecture principles and standards
- Reviews at appropriate points in the change lifecycle
- Assessment of conformance and risk
- Managed exceptions rather than hidden deviations
- Recorded decisions and rationale
- Continual improvement of the governance process itself

These ideas can be adopted without reproducing an entire framework implementation. A growing organisation might begin with a small architecture forum, a short set of principles, and a lightweight decision record. A highly regulated enterprise may need formal boards, domain authorities, compliance assessments, exception registers, and periodic assurance.

The Open Group makes the TOGAF Standard and related learning resources available under applicable licensing terms. Any organisation publishing materials derived from the standard should review those terms and avoid reproducing protected text, diagrams, or templates without permission. [The Open Group’s TOGAF resources](https://www.opengroup.org/togaf)

## Not every “alternative” solves the same problem

Framework selection is often presented as a contest: TOGAF versus Zachman, COBIT, ITIL, ArchiMate, BIAN, FEAF, or DoDAF. This can be misleading. These approaches differ in purpose, scope, and intended users.

| Organisational need | A relevant approach |
| --- | --- |
| Developing and governing enterprise architecture | TOGAF |
| Classifying a complete set of enterprise descriptions | Zachman Framework |
| Visually modelling relationships across architecture domains | ArchiMate |
| Governing and managing enterprise information and technology | COBIT |
| Creating, delivering, and improving technology-enabled services | ITIL |
| Using common service concepts and reference models in banking | BIAN |
| Meeting specialised US federal or defence architecture needs | FEAF or DoDAF |

### Zachman Framework: an ontology, not a delivery method

The Zachman Framework organises descriptions of an enterprise through a six-by-six structure. Its columns address the familiar interrogatives—what, how, where, who, when, and why—while its rows represent different transformations or perspectives.

Zachman International explicitly describes it as an ontology rather than a methodology. It helps an organisation consider whether its descriptions are complete and properly classified, but it does not prescribe the process for creating or governing an architecture. That makes it potentially useful alongside a delivery or governance method rather than necessarily instead of one. [Zachman International’s framework overview](https://zachman-feac.com/zachman/about-the-zachman-framework)

### ArchiMate: a language for making architecture visible

ArchiMate is an enterprise architecture modelling language maintained by The Open Group. It provides a consistent visual notation for expressing relationships among business, application, data, and technology concerns.

That makes ArchiMate particularly useful when stakeholders need to understand how a proposed change affects multiple parts of an organisation. It does not replace the need for decision rights, reviews, or a change method. In practice, it commonly complements TOGAF or another governance approach by improving communication. [The Open Group’s ArchiMate description](https://www.opengroup.org/togaf)

### COBIT: governance and management of information and technology

COBIT focuses on the governance and management of enterprise information and technology. It is useful where boards and executives need clearer accountability, controls, performance expectations, and alignment between technology and organisational value.

COBIT and an architecture framework can work together. Architecture governance can explain what future structure is intended and why, while COBIT-informed governance can help clarify oversight, management responsibilities, control objectives, and performance. ISACA describes COBIT as a framework for the governance and management of enterprise information and technology. [ISACA’s COBIT overview](https://www.isaca.org/resources/cobit)

### ITIL: managing services and value in operation

ITIL is principally concerned with service management. It helps organisations create, deliver, support, and continually improve services. Its concepts become particularly relevant as an architecture moves from design into operation.

An architecture decision might define a target platform and its integration boundaries. ITIL-informed practices can help determine how the resulting service will be supported, changed, measured, and improved. The two perspectives overlap, but they are not interchangeable. [PeopleCert’s ITIL 4 overview](https://www.peoplecert.org/browse-certifications/it-governance-and-service-management/ITIL-1/itil-4-foundation-2565)

### BIAN: banking-specific architecture and interoperability

BIAN is designed for banking. It provides common service concepts, reference material, and APIs intended to simplify banking architecture and improve interoperability.

For a financial institution, BIAN can add industry-specific precision that a general enterprise architecture framework does not provide. It can help teams reason about banking capabilities and service boundaries while broader governance determines investment priorities, risk ownership, standards, and approval. BIAN describes its mission in terms of common banking and IT standards and banking interoperability services. [BIAN’s official overview](https://bian.org/about-bian/faqs/general/)

### FEAF and DoDAF: specialised public-sector contexts

The Federal Enterprise Architecture Framework and Department of Defense Architecture Framework were designed for particular United States government contexts. Their emphasis on standardised viewpoints, interoperability, investment alignment, and mission needs can be instructive. However, organisations in Southeast Asia should not adopt them simply because they appear comprehensive.

Their value depends on whether the organisation has comparable reporting, mission, procurement, or interoperability requirements. For most commercial organisations, they are reference points rather than default choices.

## The Southeast Asian operating context

Southeast Asia is not a single legal or commercial environment. Each jurisdiction has its own regulators, privacy requirements, industry rules, levels of cloud adoption, and institutional practices. A regional governance model must therefore be consistent enough to support the enterprise while allowing local obligations to be attached to individual decisions.

Several recurring conditions make proportionality especially important:

- Rapid adoption of digital channels and cloud services
- Dependence on regional and global technology providers
- Legacy platforms that cannot be replaced all at once
- Cross-border data processing and service delivery
- Different regulatory obligations across operating markets
- Competition for experienced architecture, security, and governance professionals
- A need to innovate without weakening operational resilience

Local regulation should be treated as decision evidence, not as an appendix added after the architecture is complete.

For example, Bangko Sentral ng Pilipinas guidance for supervised financial institutions treats IT governance, risk identification and assessment, controls, and risk measurement and monitoring as core elements of technology-risk management. It also places responsibility at board and senior-management levels. This is a useful illustration of why architecture decisions in financial services cannot be separated from accountability and operational risk. [Bangko Sentral ng Pilipinas, Manual of Regulations for Banks](https://www.bsp.gov.ph/Regulations/MORB/MORB1.pdf)

Similarly, privacy requirements can extend responsibility beyond an organisation’s own systems. The Philippine Data Privacy Act, for example, requires reasonable organisational, physical, and technical safeguards and establishes accountability for personal information transferred to third parties. Other Southeast Asian jurisdictions have their own requirements and regulatory authorities. The lesson is regional, even though the legal example is national: outsourcing processing does not necessarily outsource accountability. [National Privacy Commission, Data Privacy Act of 2012](https://privacy.gov.ph/data-privacy-act/)

These examples are not a substitute for advice on the laws applicable to a particular organisation. They demonstrate why governance must connect architecture choices to specific obligations, owners, evidence, and review dates.

## Build a governance system, not a framework collection

Most organisations do not need to choose one framework exclusively. Nor do they benefit from collecting frameworks without integrating them.

A practical combination might use:

- TOGAF-inspired practices for architecture direction, decisions, reviews, and exceptions
- COBIT-informed thinking for accountability, oversight, controls, and performance
- ArchiMate—or a simpler agreed notation—for communicating architecture relationships
- ITIL practices for services moving into operation
- BIAN reference material for banking capabilities and interoperability
- Local laws, regulatory guidance, and contractual commitments as mandatory decision evidence

The combination should be deliberately designed. If two frameworks describe similar roles or reviews, the organisation should reconcile them into one operating process rather than impose both separately.

## A proportionate operating model

A workable governance system can begin with six components.

### 1. Outcomes and scope

Every architecture initiative should begin with a clear statement of the intended business outcome, affected capabilities, stakeholders, and boundaries. This prevents technical preferences from masquerading as business requirements.

### 2. Decision rights

Define who recommends, who advises, who approves, and who owns the consequences. Decision authority may sit with a board, an architecture forum, a domain owner, or a delegated individual depending on materiality.

### 3. Principles, standards, and obligations

Keep a manageable body of approved guidance. Distinguish between mandatory obligations, preferred standards, reusable patterns, and contextual advice. A catalogue that no one can navigate is not an effective control.

### 4. Evidence-based reviews

Reviews should test the claims that matter for the decision: business fit, security, privacy, resilience, integration, cost, data ownership, operational support, and regulatory impact. Evidence may include assessments, models, prototypes, test results, or expert review.

### 5. Transparent exceptions

An exception is not automatically a failure. A justified deviation may be the most responsible decision when constraints are real. It should identify the reason, risk, accountable owner, compensating measures, expiry or review date, and expected resolution.

### 6. Organisational memory

Preserve what was decided, why it was decided, what evidence was considered, and what happened afterward. This reduces repeated debates and enables governance to improve from experience.

## Scale the process to the risk

One review path should not govern every change. A simple tiering model can keep controls proportionate.

| Change profile | Illustrative governance response |
| --- | --- |
| Low impact, reversible, established pattern | Recorded decision and domain-owner approval |
| Moderate impact or cross-domain dependency | Targeted architecture review and supporting evidence |
| Material investment, sensitive data, critical service, or regulatory impact | Multidisciplinary review, formal approval, assurance plan, and continuing oversight |

The criteria should be explicit. Cost alone is not enough: a relatively inexpensive integration can create significant privacy, security, or concentration risk.

## Where an AI governance workbench could help

An AI-assisted governance workbench could reduce administrative effort without taking decision authority away from people. It might help teams:

- Identify which governance method fits a proposed change
- Surface missing stakeholders, obligations, or evidence
- Organise architecture decisions and their rationale
- Compare a proposal with approved principles and standards
- Prepare review packs and draft compliance assessments
- Track exceptions, actions, and review dates
- Retrieve prior decisions when similar questions arise

Its limits should be equally clear. AI-generated analysis is not approval, legal advice, regulatory assurance, or proof of compliance. Sources and model identity should be visible; material claims should remain reviewable; and accountable humans should make and approve decisions.

Used this way, AI can make good governance easier to practise. Used as an automated authority, it can make weak governance appear more convincing.

## A practical starting sequence

An organisation does not need to launch a complete enterprise architecture function before improving governance. It can begin with the following sequence:

1. Identify the business outcomes and applicable obligations.
2. Define decision owners and escalation thresholds.
3. Approve a small set of architecture principles and standards.
4. Classify changes by impact and risk.
5. Match the review method and required evidence to that classification.
6. Record decisions, rationale, conditions, and exceptions.
7. Revisit outcomes and improve the process using actual experience.

The first version should be intentionally small. Additional controls should be introduced because observed risk or regulatory requirements justify them—not because a framework contains another template.

## The central choice

The most important decision is not whether TOGAF is better than Zachman, COBIT, ITIL, ArchiMate, BIAN, FEAF, or DoDAF.

It is whether the organisation can create a governance system that people will actually use: one that connects business outcomes to architecture choices, makes accountability visible, treats local obligations seriously, and preserves enough evidence to explain decisions later.

For organisations across Southeast Asia, that system will often combine ideas from several sources. The successful combination will be proportionate, locally grounded, and open to improvement.

Frameworks can provide the vocabulary. Governance still has to become an organisational habit.

---

*This article provides general information about architecture and technology governance. It does not provide legal, regulatory, audit, or compliance advice. TOGAF® and ArchiMate® are registered trademarks of The Open Group. COBIT® is a registered trademark of ISACA. ITIL® is a registered trademark of PeopleCert group. Other marks belong to their respective owners.*

