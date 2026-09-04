-- Replaces the 3-bucket portfolio_category (20260904120001) with Mike's
-- fuller "Suggested categorization of existing Projects" scheme, sent right
-- after the first version shipped: 'sandz' | 'foundation' | 'showcases' |
-- 'builder_lab' | 'templates' | 'legacy_test' | 'archived', plus 'other' as
-- the safe not-yet-classified default (kept from v1 for the same reason: a
-- brand-new project should never be forced into a specific bucket sight
-- unseen). Scoped deliberately narrow -- this is only the list-page
-- grouping. The rest of what Mike shared (the 8-category Recommended table
-- with per-category visibility, staple-3-projects-per-client scaffolding,
-- department/engagement templates, a template library) is a separate,
-- larger initiative to scope later, not built here.
--
-- Known limitation, accepted for now: 'sandz' names today's one real client
-- literally rather than generically ("Client Engagement" in the fuller
-- 8-category table). Fine while there's exactly one; revisit this column
-- (or fold in the fuller scheme) once a second real client exists.
-- Dropped before the data migration below (not after): the new value set
-- (sandz/foundation/showcases/...) isn't valid under v1's constraint
-- either, so the re-bucketing UPDATEs would violate it if the old
-- constraint were still in place. Re-added at the very end once every row
-- has been migrated to a value the new constraint actually allows.
alter table projects drop constraint if exists projects_portfolio_category_check;

-- Re-bucket every existing row from v1's mapping into the new scheme.
-- Exact-name-matched against Mike's own "Suggested categorization" text,
-- same discipline as v1's backfill: only what's explicitly evidenced by his
-- list (or, for Foundation, clearly the same "general AI R&D/platform
-- design" theme as his named examples) gets moved off the safe 'other'
-- default -- CareCall, KABATONE Visual/Edge AI, and School AI Laboratory
-- weren't named in any bucket, so they stay 'other' for Mike to place
-- himself via the project page's selector.
update projects set portfolio_category = 'other';

update projects set portfolio_category = 'sandz' where name in (
  'Sandz–Zadara Pilot — Governance and Evaluation',
  'Sandz–Zadara Pilot — Call Center Support',
  'Sandz–Zadara Pilot — Sales Proposals',
  'Sandz HR Knowledge Base',
  'Sandz Pilot Feedback and Q&A'
);

update projects set portfolio_category = 'foundation' where name in (
  'KB Sandbox — API Discovery',
  'RAG Retrieval Exercise',
  'RAG vs Raw Chunk Retrieval',
  'Single Pass vs. Graph Retry',
  'AI Governance Exercise',
  'AI Model Selection',
  'Code Review',
  'AI Infrastructure Benchmark',
  'Vendor/Product Evaluation'
);

update projects set portfolio_category = 'showcases' where name in (
  'Food Outlet AI-Readiness Showcase',
  'Semiconductor Supplier Audit',
  'Semiconductor 8D Investigation',
  'HR Policy Copilot',
  'HR Policy Comparison',
  'Procurement Assistant',
  'Customer Support Copilot'
);

update projects set portfolio_category = 'builder_lab' where name in (
  'OrderLunch Agent (Lunch Agent)'
);

update projects set portfolio_category = 'templates' where name in (
  'Sales Proposal Copilot',
  'Month-End Close Assistant',
  'Employee Onboarding',
  'SOP / Operations Copilot',
  'Accounting Policy Copilot',
  'Invoice / Expense Review',
  'Contract Review Workspace',
  'Policy / Regulatory Change Impact'
);

update projects set portfolio_category = 'legacy_test' where name in (
  'Legacy System Understanding Project',
  'Legacy Application Understanding',
  'Legacy System Understanding',
  'M3.6 Verification Project A',
  'M3.6 Verification Project B',
  'New Feature on Legacy System',
  'Refactoring Assessment',
  'Legacy Documentation Recovery'
);

alter table projects add constraint projects_portfolio_category_check
  check (portfolio_category in ('sandz', 'foundation', 'showcases', 'builder_lab', 'templates', 'legacy_test', 'archived', 'other'));
