-- Baseline Product Handbook content, seeded at provisioning rather than
-- authored per-deployment (per Mike, 2026-08-28): every new client
-- deployment already runs the full migration set to stand up its DB, so
-- seeding here means Ember has accurate baseline product knowledge before
-- that client's own (unrelated) admin ever logs in -- no separate step, no
-- dependency on a shared source repo they'd need access to.
--
-- Deliberately not fancy (per Mike): a single, growing "Release Notes"
-- article rather than one hand-authored Handbook page per feature -- we
-- already have the roadmap for what's planned and Ember for answering
-- questions; this is just the minimal connective content between "a feature
-- shipped" and "Ember knows about it". New entries get prepended to this
-- article's content by whoever ships a user-visible change (curator/admin
-- edit -> new draft version -> approve, same as any other Wiki article).
--
-- created_by/approved_by are left null (both columns are nullable) since
-- there's no profiles row to attribute this to at fresh-provisioning time --
-- this is system-provisioned baseline content, not authored by a person.
insert into wiki_articles (slug, title, category, short_description, status)
values (
  'release-notes',
  'Release Notes',
  'product_handbook',
  'A running log of user-visible changes to KB Sandbox, newest first -- what changed, who can use it, and where to find it.',
  'approved'
)
on conflict (slug) do nothing;

insert into wiki_versions (
  wiki_article_id, version_number, quick_help, content,
  verification_status, last_verified_at, generated_by, approved_at
)
select
  wa.id, 1,
  'Release Notes is a running log of what changed in KB Sandbox and who can use it -- check here before assuming a feature works a certain way.',
  $md$## 2026-08-28 -- Product Handbook (Ember product knowledge)
Curators/admins can write and approve articles describing KB Sandbox's own pages and features (Wiki category: Product Handbook), so Ember can answer questions about the product itself, not just uploaded domain content. Who can use it: any curator can draft, any admin can approve; any signed-in user can ask Ember.

## 2026-08-28 -- Curator-created knowledge bases
Curators can create a new knowledge base directly from the Sources & Curation upload flow (previously admin-only). A new knowledge base starts pending and is usable for uploads immediately; an admin approves or rejects it from the admin page's Pending review section.

## 2026-08-28 -- Project status pipeline
Projects now move through an explicit status: Initial Draft -> Working on it -> For Approval -> Approved, shown on the project page (`/projects/[id]`), with every transition logged in a "Status history" list. A curator or the project owner can start work or submit for approval; only an admin can approve or send a project back to Working on it.

## 2026-08-28 -- Notes section gets an Add button
The Notes section on a project page previously had no way to add a note from the UI. It now has a "+ Add" link next to the existing "View all" link, matching the Status section above it.

## 2026-08-28 -- Ember chat auto-scrolls to the latest message
Opening Ember or loading a conversation with a long history used to leave you scrolled to the top, needing to scroll down to see the latest message. The chat panel now scrolls to the bottom automatically whenever it opens or a conversation loads.$md$,
  'verified', now(), 'human', now()
from wiki_articles wa
where wa.slug = 'release-notes'
  and not exists (select 1 from wiki_versions where wiki_article_id = wa.id);

update wiki_articles
set current_version_id = (
  select id from wiki_versions where wiki_article_id = wiki_articles.id order by version_number desc limit 1
)
where slug = 'release-notes' and current_version_id is null;

-- Consolidate: the standalone "Project Status Pipeline" Handbook article
-- (authored this session before we settled on the release-notes approach)
-- duplicates the entry above. Archive rather than delete -- keeps the
-- audit trail, matches the existing Archive action any curator/admin can
-- already do from the Wiki UI.
update wiki_articles set status = 'archived' where slug = 'project-status-pipeline' and status <> 'archived';
