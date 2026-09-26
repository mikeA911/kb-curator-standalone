-- Workstream Presentation & Review, Part A (docs/Workstream Presentation &
-- Customer Review.docx): lets a builder turn a completed Workstream into a
-- slide-based proposal that goes through structured review -- slide-level
-- comments, exactly one builder reply each, Ember-assisted classification,
-- and a structured Action Register -- before a curator approval gate.
-- Same reconciliation this session already applied to the Builder Ontology
-- doc: reuse existing schema shapes rather than inventing new ones.
--
-- One presentation per Workstream (nullable 1:1 -- most Workstreams never
-- get one). status is the review-period state machine (doc §11); actual
-- content lives in presentation_versions, never here -- this row is just
-- the stable identity + current pointer + review state, exactly the
-- wiki_articles/system_assessments "parent row, versioned children" shape.
create table presentations (
  id uuid primary key default gen_random_uuid(),
  workstream_id uuid not null unique references project_workstreams(id) on delete cascade,
  status text not null default 'draft' check (status in (
    'draft', 'review_open', 'review_closed', 'builder_revision', 'curator_review', 'approved'
  )),
  review_deadline timestamptz,
  current_version_id uuid, -- FK added below once presentation_versions exists (chicken-and-egg, same as wiki_articles.current_version_id)
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger presentations_set_updated_at before update on presentations for each row execute function set_updated_at();

-- Insert-only, immutable once written (wiki_versions' own shape) -- a new
-- "Generate Presentation" call always creates a new version, never edits
-- slide content of an existing one. slides is an ordered array of
-- {id, type, title, body, items?} -- id is a short stable string (e.g.
-- "slide-3") a comment's slide_id references; no separate slides table,
-- same "jsonb for structured content nobody queries by field" convention
-- as project_workstreams.deliverables.
create table presentation_versions (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  version_number integer not null,
  slides jsonb not null,
  generated_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (presentation_id, version_number)
);
alter table presentations add constraint presentations_current_version_id_fkey
  foreign key (current_version_id) references presentation_versions(id) on delete set null;

create table presentation_status_history (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- slide_id is a polymorphic pointer into presentation_versions.slides'
-- jsonb array, not a real FK -- same convention as project_notes.context_id.
-- builder_reply* are plain nullable columns directly on the comment row
-- (not a child table) so "one reply" is a structural fact, not a business
-- rule layered on an unbounded table.
create table presentation_slide_comments (
  id uuid primary key default gen_random_uuid(),
  presentation_version_id uuid not null references presentation_versions(id) on delete cascade,
  slide_id text not null,
  author_id uuid references profiles(id) on delete set null,
  comment_text text not null,
  classification text check (classification in (
    'question', 'evaluation_candidate', 'action', 'security_review',
    'requirement_gap', 'approval_signal', 'scope_change', 'risk_concern', 'customer_requirement'
  )),
  builder_reply text,
  builder_reply_by uuid references profiles(id) on delete set null,
  builder_reply_at timestamptz,
  created_at timestamptz not null default now()
);

create table presentation_actions (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references presentations(id) on delete cascade,
  source_comment_id uuid references presentation_slide_comments(id) on delete set null,
  action_text text not null,
  owner_id uuid references profiles(id) on delete set null,
  type text not null check (type in ('action', 'evaluation', 'security', 'requirement')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'complete')),
  evidence text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger presentation_actions_set_updated_at before update on presentation_actions for each row execute function set_updated_at();

create index presentation_versions_presentation_id_idx on presentation_versions(presentation_id);
create index presentation_slide_comments_version_id_idx on presentation_slide_comments(presentation_version_id);
create index presentation_actions_presentation_id_idx on presentation_actions(presentation_id);

alter table presentations enable row level security;
alter table presentation_versions enable row level security;
alter table presentation_status_history enable row level security;
alter table presentation_slide_comments enable row level security;
alter table presentation_actions enable row level security;

-- select: any project member, via the workstream's own project_id (join
-- through project_workstreams, exactly workstream_object_links' own
-- subquery shape). manage (insert/generate): curator+ only.
create policy "presentations_select_member" on presentations
  for select using (
    exists (select 1 from project_workstreams w where w.id = workstream_id and is_project_member(w.project_id, auth.uid()))
  );
create policy "presentations_insert_curator" on presentations
  for insert with check (
    exists (select 1 from project_workstreams w where w.id = workstream_id and can_curate_project(w.project_id, auth.uid()))
  );
-- Status transitions all go through this one policy; self-approval into
-- 'approved' is blocked in the SERVICE layer (curator_review -> approved
-- requires the actor to not be the presentation's own creator), same
-- reasoning workstream_promotions uses at the RLS layer -- kept here at
-- the service layer instead since every other transition on this same
-- column is curator-only anyway, so a single extra RLS policy would be
-- redundant with the check already required for every transition.
create policy "presentations_update_curator" on presentations
  for update
  using (exists (select 1 from project_workstreams w where w.id = workstream_id and can_curate_project(w.project_id, auth.uid())))
  with check (exists (select 1 from project_workstreams w where w.id = workstream_id and can_curate_project(w.project_id, auth.uid())));

create policy "presentation_versions_select_member" on presentation_versions
  for select using (
    exists (
      select 1 from presentations p join project_workstreams w on w.id = p.workstream_id
      where p.id = presentation_id and is_project_member(w.project_id, auth.uid())
    )
  );
create policy "presentation_versions_insert_curator" on presentation_versions
  for insert with check (
    exists (
      select 1 from presentations p join project_workstreams w on w.id = p.workstream_id
      where p.id = presentation_id and can_curate_project(w.project_id, auth.uid())
    )
  );
-- No update/delete policy at all -- immutable once written, same as wiki_versions.

create policy "presentation_status_history_select_member" on presentation_status_history
  for select using (
    exists (
      select 1 from presentations p join project_workstreams w on w.id = p.workstream_id
      where p.id = presentation_id and is_project_member(w.project_id, auth.uid())
    )
  );
-- No insert policy -- written only via the admin client from the service
-- layer, same as project_status_history.

create policy "presentation_slide_comments_select_member" on presentation_slide_comments
  for select using (
    exists (
      select 1 from presentation_versions v join presentations p on p.id = v.presentation_id
      join project_workstreams w on w.id = p.workstream_id
      where v.id = presentation_version_id and is_project_member(w.project_id, auth.uid())
    )
  );
create policy "presentation_slide_comments_insert_member" on presentation_slide_comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from presentation_versions v join presentations p on p.id = v.presentation_id
      join project_workstreams w on w.id = p.workstream_id
      where v.id = presentation_version_id and is_project_member(w.project_id, auth.uid())
    )
  );
-- The real one-reply enforcement: USING requires builder_reply IS NULL, so
-- a second update attempt on an already-replied row matches zero rows
-- (same "zero rows = no permission" convention as reviewArtifact) -- not
-- just a service-layer check.
create policy "presentation_slide_comments_reply_curator" on presentation_slide_comments
  for update
  using (
    builder_reply is null
    and exists (
      select 1 from presentation_versions v join presentations p on p.id = v.presentation_id
      join project_workstreams w on w.id = p.workstream_id
      where v.id = presentation_version_id and can_curate_project(w.project_id, auth.uid())
    )
  )
  with check (builder_reply is not null);

create policy "presentation_actions_select_member" on presentation_actions
  for select using (
    exists (select 1 from presentations p join project_workstreams w on w.id = p.workstream_id where p.id = presentation_id and is_project_member(w.project_id, auth.uid()))
  );
create policy "presentation_actions_insert_curator" on presentation_actions
  for insert with check (
    exists (select 1 from presentations p join project_workstreams w on w.id = p.workstream_id where p.id = presentation_id and can_curate_project(w.project_id, auth.uid()))
  );
-- status/evidence updates: curator, OR the action's own owner marking their
-- own work done -- same "builder updates their own thing" bar as
-- toggleDeliverable.
create policy "presentation_actions_update_owner_or_curator" on presentation_actions
  for update using (
    owner_id = auth.uid()
    or exists (select 1 from presentations p join project_workstreams w on w.id = p.workstream_id where p.id = presentation_id and can_curate_project(w.project_id, auth.uid()))
  );
