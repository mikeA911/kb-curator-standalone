-- wiki_versions: immutable, versioned article content. Rows are inserted
-- once and never updated except by the admin approve action setting
-- approved_by/approved_at (see RLS in 20260808220006_wiki_rls.sql -- there is
-- no general UPDATE policy for staff, only INSERT). Editing "approved"
-- content always creates a new draft version row; it never mutates the
-- approved one.
--
-- Long-form sections (What it is / Why it matters / How it works /
-- Architecture / When to use / When not to use / Failure modes / Evaluation
-- / Governance considerations / Practical experiment) live in one markdown
-- `content` field rather than one column each -- simplest maintainable
-- representation per the brief. `quick_help`, `implementation_notes`, and
-- `limitations` get their own columns because they're each used differently
-- (quick_help specifically for contextual Help lookups).
create table if not exists wiki_versions (
  id uuid primary key default gen_random_uuid(),
  wiki_article_id uuid not null references wiki_articles(id) on delete cascade,
  version_number integer not null,

  quick_help text not null,
  content text not null,
  implementation_notes text,
  limitations text,

  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'needs_review')),
  last_verified_at timestamptz,

  -- AI-assisted synthesis provenance (null for manually authored versions).
  generated_by text not null default 'human' check (generated_by in ('human', 'ai_assisted')),
  ai_provider text,
  ai_model text,
  ai_generated_at timestamptz,
  source_chunk_ids uuid[],

  created_by uuid references profiles(id) on delete set null,
  approved_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,

  unique (wiki_article_id, version_number)
);

create index if not exists wiki_versions_article_id_idx on wiki_versions(wiki_article_id);

alter table wiki_articles
  add constraint wiki_articles_current_version_fk
  foreign key (current_version_id) references wiki_versions(id) on delete set null;
