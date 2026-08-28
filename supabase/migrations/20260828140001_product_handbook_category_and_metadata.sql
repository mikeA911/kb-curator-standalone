-- Product Handbook Wiki category, Stage 1 of the Ember Product Knowledge
-- Publishing Pipeline (docs/dev-request-ember-product-knowledge-publishing-
-- pipeline.md). Distinct from the existing platform_handbook ("Workbench
-- Handbook") category, which is already earmarked by docs/workbench-
-- handbook-*.md for external-facing AI-consulting methodology articles --
-- this one is for internal docs describing KB Sandbox's own pages, features,
-- permissions and workflows.
insert into wiki_categories (id, name, sort_order) values
  ('product_handbook', 'Product Handbook', 8)
on conflict (id) do nothing;

-- Metadata from the dev request's "each product-knowledge version should
-- retain" list. Added to wiki_versions, not wiki_articles, because that's
-- the only surface curators can already edit after creation (title/slug/
-- category are fixed at creation) -- these fields follow content through the
-- same draft-a-new-version-on-edit lifecycle as quick_help/content/
-- limitations, with no new article-level edit path needed. All nullable and
-- additive; no existing row's meaning changes.
alter table wiki_versions add column applicable_roles text[];
alter table wiki_versions add column related_routes text[];
alter table wiki_versions add column applicable_version text;
