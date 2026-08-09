-- settings: small typed key/value store for runtime toggles (e.g. active AI provider).
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);

insert into settings (key, value)
values ('ai_provider', '"openai"'::jsonb)
on conflict (key) do nothing;
