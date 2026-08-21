-- Dashboard Shared Links: moderation audit trail + duplicate detection for
-- the existing trending_items table (no new table -- a shared link and its
-- Trending entry are the same record, see docs/dev-request-dashboard-shared-links-and-library-foundation.md).
-- No RLS changes -- the dashboard's "administrator-only Remove" is stricter
-- than the existing curator-or-admin trending_items_manage_curator policy,
-- so it's enforced in removeSharedLinkAction (requireRole('admin')) rather
-- than narrowing RLS, which would also affect the existing curator archive
-- workflow.
alter table trending_items add column archived_by uuid references profiles(id) on delete set null;
alter table trending_items add column archived_at timestamptz;
alter table trending_items add column moderation_reason text;

-- Computed application-side (normalizeUrlForDuplicateDetection in
-- src/lib/trending/url-safety.ts), not a generated column -- normalization
-- rules may evolve without a migration. Existing rows are left null; they
-- simply won't be matched as a duplicate of a new submission.
alter table trending_items add column normalized_source_url text;
create index trending_items_normalized_source_url_idx on trending_items(normalized_source_url);
