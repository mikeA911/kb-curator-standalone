-- Wiki taxonomy: a lookup table rather than a CHECK-constraint enum, so the
-- UI can list categories with display names/ordering instead of hardcoding
-- the six slugs in application code.
create table if not exists wiki_categories (
  id text primary key,
  name text not null,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

insert into wiki_categories (id, name, sort_order) values
  ('foundations', 'Foundations', 1),
  ('knowledge_engineering', 'Knowledge Engineering', 2),
  ('agent_engineering', 'Agent Engineering', 3),
  ('reliability', 'Reliability', 4),
  ('governance', 'Governance', 5),
  ('improvement', 'Improvement', 6)
on conflict (id) do nothing;
