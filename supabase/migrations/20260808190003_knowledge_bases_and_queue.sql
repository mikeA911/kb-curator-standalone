-- knowledge_bases: the top-level domains documents are curated into (fhir, vbc, grants, billing, ...).
create table if not exists knowledge_bases (
  id text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- curation_queue: URLs/titles queued up for a curator to pull into the upload flow.
create table if not exists curation_queue (
  id uuid primary key default gen_random_uuid(),
  kb_id text not null references knowledge_bases(id) on delete cascade,
  title text not null,
  url text not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  added_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (kb_id, url)
);
