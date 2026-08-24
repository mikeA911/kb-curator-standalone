-- Separate current working knowledge bases from the four domain samples
-- inherited from Rhubarb. Stable IDs and all referenced content are retained;
-- lifecycle_status controls whether a KB is offered for new work.
alter table knowledge_bases
  add column if not exists classification text not null default 'platform'
    check (classification in ('platform', 'legacy_sample', 'project', 'partner_pilot')),
  add column if not exists lifecycle_status text not null default 'active'
    check (lifecycle_status in ('active', 'reference', 'archived')),
  add column if not exists origin text;

update knowledge_bases
set classification = 'legacy_sample',
    lifecycle_status = 'reference',
    origin = 'Rhubarb',
    description = case id
      when 'fhir' then 'Legacy Rhubarb sample: FHIR and healthcare interoperability standards.'
      when 'vbc' then 'Legacy Rhubarb sample: value-based care models and programs.'
      when 'grants' then 'Legacy Rhubarb sample: grant funding and program documentation.'
      when 'billing' then 'Legacy Rhubarb sample: healthcare billing and claims.'
      else description
    end
where id in ('fhir', 'vbc', 'grants', 'billing');

update knowledge_bases
set classification = 'partner_pilot', lifecycle_status = 'active', origin = 'Sandz'
where id = 'zadara_sandz';

insert into knowledge_bases (id, name, description, classification, lifecycle_status, origin)
values (
  'ai_engineering',
  'AI Engineering & RAG Curation',
  'Source documents and curated evidence for retrieval, RAG evaluation, agents, and AI engineering.',
  'platform',
  'active',
  'KB Sandbox'
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  classification = excluded.classification,
  lifecycle_status = excluded.lifecycle_status,
  origin = excluded.origin;

-- Remove future-facing curator assignments to the legacy samples. Accounts
-- that previously had any of the four samples receive the active AI
-- Engineering KB instead; unrelated assignments are preserved.
update profiles
set assigned_kbs = (
  select array_agg(distinct kb order by kb)
  from unnest(array_append(
    array_remove(array_remove(array_remove(array_remove(assigned_kbs, 'fhir'), 'vbc'), 'grants'), 'billing'),
    'ai_engineering'
  )) as kb
)
where assigned_kbs && array['fhir', 'vbc', 'grants', 'billing']::text[];

-- Database backstops for crafted/direct Data API writes. Existing records in
-- reference KBs remain valid and editable; only a new association (or a
-- changed association) to a non-active KB is refused.
create or replace function require_active_knowledge_base(kbid text)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (
    select 1 from knowledge_bases where id = kbid and lifecycle_status = 'active'
  ) then
    raise exception 'Knowledge base % is retained for reference and cannot be used for new work', kbid;
  end if;
end;
$$;

create or replace function validate_document_active_kb()
returns trigger language plpgsql set search_path = public as $$
begin
  perform require_active_knowledge_base(new.doc_type);
  return new;
end;
$$;

drop trigger if exists documents_require_active_kb on documents;
create trigger documents_require_active_kb
  before insert or update of doc_type on documents
  for each row execute function validate_document_active_kb();

create or replace function validate_queue_active_kb()
returns trigger language plpgsql set search_path = public as $$
begin
  perform require_active_knowledge_base(new.kb_id);
  return new;
end;
$$;

drop trigger if exists curation_queue_require_active_kb on curation_queue;
create trigger curation_queue_require_active_kb
  before insert or update of kb_id on curation_queue
  for each row execute function validate_queue_active_kb();

create or replace function validate_kb_project_attachment_active()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.project_id is not null and new.lifecycle_status <> 'active' then
    raise exception 'Reference knowledge base % cannot be attached to a project', new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists knowledge_bases_active_project_attachment on knowledge_bases;
create trigger knowledge_bases_active_project_attachment
  before insert or update of project_id, lifecycle_status on knowledge_bases
  for each row execute function validate_kb_project_attachment_active();

create or replace function validate_profile_active_kb_assignments()
returns trigger language plpgsql set search_path = public as $$
declare
  kbid text;
begin
  foreach kbid in array new.assigned_kbs loop
    perform require_active_knowledge_base(kbid);
  end loop;
  return new;
end;
$$;

drop trigger if exists profiles_require_active_kb_assignments on profiles;
create trigger profiles_require_active_kb_assignments
  before insert or update of assigned_kbs on profiles
  for each row execute function validate_profile_active_kb_assignments();
