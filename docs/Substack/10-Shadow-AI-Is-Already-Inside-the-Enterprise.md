# Shadow AI Is Already Inside the Enterprise. The Answer May Not Be to Ban It.

## How a governed AI Workbench can give employees the freedom to use AI while giving organizations control over where their knowledge goes

AI governance has an awkward problem.

Employees have discovered that AI is useful.

They use ChatGPT to summarize documents. Claude to analyze requirements. Gemini to research ideas. Developers experiment with different coding models. Someone discovers DeepSeek or another new model that happens to be particularly good at their task.

From the employee's perspective, this is productivity.

From the organization's perspective, it can be **Shadow AI**.

The problem isn't simply which model an employee chooses. It's what they might send to it:

- internal documents;
- customer information;
- source code;
- financial information;
- intellectual property;
- healthcare information;
- engineering specifications;
- contracts; and
- credentials or operational data.

Organizations can respond by banning public AI services.

But prohibition creates another problem.

Employees now know these tools can make them substantially more productive. If the approved alternative is cumbersome—or there isn't one—some will find ways around the restriction.

Perhaps the better question isn't:

> How do we stop employees using AI?

It is:

> How do we give employees a useful, sanctioned way to use AI without losing control of enterprise knowledge?

That is an interesting direction for KB Sandbox.

## From AI Workbench to governed AI gateway

KB Sandbox was built around a relatively simple principle:

> AI should work from evidence, its work should be evaluable, and important decisions should remain subject to human judgment.

The same architecture could address Shadow AI.

Instead of employees independently deciding which AI service to use and what information to provide to it, they work through Ember inside KB Sandbox.

The organization controls the models available behind Ember.

For one organization that might be Claude and Gemini. Another might permit an enterprise OpenAI deployment. A highly regulated organization might use an approved cloud model for ordinary work but require a private model for sensitive projects.

The employee still gets AI. But the organization gets a governance layer between its people, its knowledge and the model.

The goal isn't to make AI harder to use.

It is to make the safe path the easy path.

## Not every piece of knowledge should be allowed to go to every model

Model approval alone isn't enough.

Consider an organization that allows Claude for normal business use.

An employee asks Ember to help prepare a public sales presentation. Sending that material to an approved cloud model might be perfectly acceptable.

Now imagine an engineer investigating a manufacturing defect involving proprietary semiconductor process information.

Same employee. Same AI interface. Completely different risk.

This suggests that AI governance should consider both the model and the information being processed.

A KB Sandbox policy could classify projects or knowledge as:

- **Public**
- **Internal**
- **Confidential**
- **Restricted**

The organization then defines which AI environments can process each classification.

| Information classification | Permitted AI |
|---|---|
| Public | Any organization-approved model |
| Internal | Approved enterprise AI providers |
| Confidential | Providers meeting defined contractual and security requirements |
| Restricted | Private or local AI only |

Now the employee doesn't need to understand every vendor's privacy policy before asking a question. KB Sandbox can enforce the policy.

If Restricted information is involved and the selected cloud model isn't permitted to receive it, the request simply doesn't leave the environment.

Ember could explain:

> This project contains Restricted information and cannot be processed by this model under your organization's AI policy. Please use the approved private model.

That's much stronger than putting “Don't paste confidential information into AI” in an employee handbook.

## The policy decision can happen before the model ever sees the prompt

There is an important architectural principle here.

By the time an AI provider receives confidential information, governance has already failed.

So the control needs to happen before inference:

1. An employee asks Ember.
2. KB Sandbox retrieves authorized evidence.
3. The system determines the effective information classification.
4. It applies the organization's AI policy.
5. It selects an eligible model.
6. Only then does it send the request.

This creates an interesting possibility.

Employees may eventually not need to select models at all. They ask Ember a question, and KB Sandbox determines which models are authorized for the project and workload and routes the request accordingly.

Model selection becomes an organizational policy decision rather than an employee security decision.

## Sensitive-data controls could go further

Classification could eventually operate at more than the project level.

An organization might classify individual documents or artifacts differently. A project could contain mostly Internal material but retrieve one Restricted engineering document. The effective classification of the request becomes Restricted.

Before sending the assembled context to a model, KB Sandbox could also apply deterministic policies for recognizable sensitive information.

Depending on organizational rules, the outcome could be:

- **Allow**
- **Redact**
- **Route to a private model**
- **Require human approval**
- **Block**

This becomes particularly relevant in industries such as healthcare, financial services, government and semiconductor manufacturing.

The objective isn't to ask another LLM whether something looks sensitive and simply trust its opinion. Wherever possible, security policy should remain deterministic and enforceable.

AI can assist classification. It shouldn't be the only thing standing between proprietary information and an unauthorized external service.

## Governance should not mean employee surveillance

There's another important distinction.

A governed AI environment shouldn't automatically become a mechanism for watching everything employees do.

The useful management questions are broader:

- Which approved models are being used?
- Which business use cases are emerging?
- How much are the models costing?
- Which projects contain restricted information?
- How frequently are policy controls being triggered?
- Which models perform best against organizational evaluations?
- Which use cases consistently require human intervention?

This is governance information.

It helps an organization understand its AI adoption rather than merely police its employees.

And because KB Sandbox already treats AI experimentation as something that should be evaluated, organizations could eventually answer a much more interesting question:

> Are the models we're paying for actually good at our work?

## Security and model evaluation belong together

Suppose an organization approves three models.

- **Model A** costs the most but produces the best results.
- **Model B** costs one-third as much and performs almost identically on most employee tasks.
- **Model C** can run privately and performs slightly worse overall—but is good enough for Restricted workloads that cannot leave the organization's environment.

There may be no single “best AI.”

The organization instead develops an AI portfolio based on workload, sensitivity, performance and economics.

That is exactly the sort of question an AI Workbench should help answer.

And as new models appear, the organization doesn't need to adopt them because of a benchmark published somewhere on the internet. It can evaluate them against its own workloads and its own evidence.

## This also changes the private-AI infrastructure conversation

Shadow AI governance initially sounds like a security problem. But it quickly becomes an infrastructure question.

Imagine an enterprise discovers that 80% of its AI workload can safely use approved cloud models. Another 20% involves sensitive intellectual property.

The organization now has evidence for asking:

> Should we operate private AI infrastructure for that 20%?

That creates a much more defensible conversation about local inference, sovereign infrastructure, edge AI, GPUs, storage and data architecture.

Instead of:

> You should build private AI because private AI is safer.

the discussion becomes:

> Here are the workloads that cannot use external models. Here is their volume. Here are their performance requirements. Here is how local models performed in our evaluation. Now we can determine what infrastructure is justified.

Security policy has produced an evidence-based infrastructure requirement.

## A potential new KB Sandbox showcase

We think this deserves its own Workbench experiment: **Enterprise Shadow AI Governance**.

Create a synthetic organization where employees currently use several public AI services independently. Then configure KB Sandbox as the organization's sanctioned AI environment.

The showcase could demonstrate:

1. Organization-approved AI providers.
2. Project and information classifications.
3. Model eligibility based on classification.
4. Project-scoped enterprise knowledge through Ember.
5. Evidence-backed responses and provenance.
6. Blocking or rerouting information that cannot be sent to a selected model.
7. Human approval for high-risk outputs.
8. An organizational AI governance view showing usage, model performance, cost and policy events.

Some of those capabilities exist in KB Sandbox today. Others do not.

That's intentional.

One purpose of our showcase projects is to discover the difference.

Rather than building features because we imagine enterprises might need them, we can attempt realistic scenarios, identify the missing capabilities and let those experiments influence the Workbench roadmap.

## Don't fight Shadow AI only by taking AI away

Employees use unsanctioned AI because the technology solves real problems.

Organizations therefore face a difficult balance. They need to protect information without preventing their people from learning how to work with one of the most consequential technologies entering the workplace.

We think there's another approach:

> Give employees better AI access—but put enterprise knowledge, model choice, evidence, evaluation and governance around it.

The long-term opportunity for KB Sandbox may therefore extend beyond being a knowledge platform or experimentation environment.

It could become something closer to an **Enterprise AI Workbench and governance layer**: a place where organizations can safely discover what AI is useful for, determine which models they trust, control which knowledge those models can access, evaluate whether their answers are good enough—and learn where private AI infrastructure is actually justified.

Because the objective shouldn't be to stop people experimenting with AI.

It should be to make responsible experimentation easier than going rogue.
