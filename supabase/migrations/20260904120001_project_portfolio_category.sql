-- Projects list declutter (2026-09-04, Mike): "My Projects" grouped into
-- three buckets -- Foundational (product/general AI R&D), Project-specific
-- (a named client/programme), Others -- instead of one flat grid.
--
-- Deliberately a new, explicit column rather than a relabeling of
-- project_type: the two axes don't line up. "KB Sandbox -- API Discovery"
-- is project_type='transformation' but is clearly foundational (it's about
-- the product itself, not a client); "CareCall -- API Modernization
-- Assessment" and "OrderLunch Agent" are project_type='experiment' but are
-- specific named case-study clients, not general AI experiments. A straight
-- type->bucket mapping would misclassify both live today.
--
-- default 'other' so every new project starts in the safe, always-correct
-- bucket rather than a guessed one. RLS: no new policy needed --
-- updateProjectPortfolioCategory (src/lib/workbench/projects.ts) writes it
-- via the admin client after an explicit owner/curator/admin check, same
-- pattern as starter_prompt (20260904110001) and for the same reason: a
-- project curator should be able to tag their own team's Project, not just
-- its owner (projects_update_managers/can_manage_project is owner-only).
alter table projects add column portfolio_category text not null default 'other'
  check (portfolio_category in ('foundational', 'project_specific', 'other'));

-- One-time best-guess backfill for the 44 projects that existed before this
-- column did, so the split isn't "44 things dumped in Others" on day one.
-- Exact-name-matched, not a fuzzy/pattern rule (so it can never mis-tag a
-- future project with a similar name) -- Mike reviews/corrects these once
-- via the new per-project selector, they are not meant to be authoritative
-- forever. Two clear signals only, everything else stays the safe 'other'
-- default:
--   1. A named real-world client/case-study in the title (Sandz, Zadara,
--      CareCall, KABATONE, OrderLunch, the Food Outlet showcase) ->
--      project_specific.
--   2. A clearly generic, no-named-client AI/methodology R&D exercise, or
--      the product's own dogfooding (KB Sandbox itself) -> foundational.
update projects set portfolio_category = 'project_specific' where name in (
  'Sandz–Zadara Pilot — Governance and Evaluation',
  'Sandz–Zadara Pilot — Call Center Support',
  'Sandz–Zadara Pilot — Sales Proposals',
  'Sandz HR Knowledge Base',
  'Sandz Pilot Feedback and Q&A',
  'CareCall — API Modernization Assessment',
  'KABATONE Visual/Edge AI',
  'Food Outlet AI-Readiness Showcase',
  'OrderLunch Agent (Lunch Agent)'
);

update projects set portfolio_category = 'foundational' where name in (
  'RAG Retrieval Exercise',
  'RAG vs Raw Chunk Retrieval',
  'Single Pass vs. Graph Retry',
  'Vendor/Product Evaluation',
  'AI Model Selection',
  'Code Review',
  'AI Infrastructure Benchmark',
  'AI Governance Exercise',
  'KB Sandbox — API Discovery'
);
