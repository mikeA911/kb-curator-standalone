-- profiles: one row per auth.users, holds role/assignment info used throughout the app.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('user', 'curator', 'admin')),
  is_active boolean not null default true,
  assigned_kbs text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
