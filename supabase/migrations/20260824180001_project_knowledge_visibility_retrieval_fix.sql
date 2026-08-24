-- Project-Aware Knowledge and Assistant Context, Stage 2, Migration A --
-- close two retrieval-layer leaks discovered while researching Stage 2,
-- sent standalone and first because they undermine Stage 1's confidentiality
-- work in production right now, before any new project-aware retrieval is
-- built on top of them.
--
-- 1. match_wiki_vectors (20260809110003_match_wiki_vectors.sql) is a plain
--    `language sql stable` function, not security definer, so it runs under
--    the CALLER's own RLS -- but wiki_vectors_select_consultant
--    (20260810100006_consultant_vector_read_access.sql) grants SELECT to any
--    active consultant unconditionally, with no join back to
--    wiki_articles.status/visibility_scope at all. Every authenticated user
--    defaults to role 'consultant'. Concretely: any user, via the
--    Assistant's search_wiki tool, can retrieve the full embedded content of
--    the approved "Zadara Knowledge Copilot" article right now even though
--    it's project_private and they are not a project member -- the exact
--    leak Stage 1 was built to close, one layer down. Fixed by mirroring
--    wiki_versions_select_approved_or_staff's join/visibility check exactly.
--
-- 2. kb_select_global_or_member (20260810120001_project_members.sql) reads
--    `project_id is null or is_project_member(project_id, auth.uid())` --
--    but Stage 1 stopped writing knowledge_bases.project_id in favor of the
--    new project_knowledge_bases junction, so project_id is null for every
--    knowledge base including the now-attached Zadara/Sandz one, making this
--    policy permanently permissive. kb_vectors_select_consultant has the
--    identical unconditional-consultant-access shape as
--    wiki_vectors_select_consultant. Knowledge bases have no visibility
--    concept at all today (classification is a category tag, not access
--    control). Fixed by adding knowledge_bases.visibility_scope (same
--    convention as wiki_articles.visibility_scope) and rewriting both
--    policies to check it via project_knowledge_bases + is_project_member_strict.
--
-- Also widens knowledge_sources/documents' own select policies with a
-- project-member branch -- needed so citation resolution and the Stage 2
-- source-detail page can read the row itself, not just the embedded chunk.

-- --- knowledge_bases visibility_scope --------------------------------------

alter table knowledge_bases
  add column if not exists visibility_scope text not null default 'platform'
    check (visibility_scope in ('project_private', 'selected_projects', 'platform', 'public'));

-- The one knowledge base with real customer-confidential content today;
-- every other knowledge base defaults to 'platform', matching current de
-- facto behaviour (same backfill philosophy as Stage 1's Wiki migration).
update knowledge_bases set visibility_scope = 'project_private' where id = 'zadara_sandz';

drop policy "kb_select_global_or_member" on knowledge_bases;
create policy "kb_select_global_or_member" on knowledge_bases
  for select using (
    is_admin(auth.uid())
    or visibility_scope in ('platform', 'public')
    or (
      visibility_scope in ('project_private', 'selected_projects')
      and exists (
        select 1 from project_knowledge_bases pkb
        where pkb.knowledge_base_id = knowledge_bases.id and is_project_member_strict(pkb.project_id, auth.uid())
      )
    )
  );

-- --- wiki_vectors: mirrors wiki_versions_select_approved_or_staff's join ---

drop policy "wiki_vectors_select_consultant" on wiki_vectors;
create policy "wiki_vectors_select_scoped" on wiki_vectors
  for select using (
    exists (
      select 1 from wiki_articles wa
      where wa.current_version_id = wiki_vectors.wiki_version_id
      and (
        (wa.status <> 'approved' and is_curator_or_admin(auth.uid()))
        or (wa.status = 'approved' and wa.visibility_scope in ('platform', 'public'))
        or (
          wa.status = 'approved'
          and wa.visibility_scope in ('project_private', 'selected_projects')
          and exists (
            select 1 from project_wiki_articles pwa
            where pwa.wiki_article_id = wa.id and is_project_member_strict(pwa.project_id, auth.uid())
          )
        )
      )
    )
  );

-- --- kb_vectors: same shape, joined through documents -> knowledge_sources -> knowledge_bases

drop policy "kb_vectors_select_consultant" on kb_vectors;
create policy "kb_vectors_select_scoped" on kb_vectors
  for select using (
    is_curator_or_admin(auth.uid())
    or exists (
      select 1 from documents d
      join knowledge_sources ks on ks.current_version_id = d.id
      join knowledge_bases kb on kb.id = ks.knowledge_base_id
      where d.id = kb_vectors.document_id
      and (
        kb.visibility_scope in ('platform', 'public')
        or (
          kb.visibility_scope in ('project_private', 'selected_projects')
          and exists (
            select 1 from project_knowledge_bases pkb
            where pkb.knowledge_base_id = kb.id and is_project_member_strict(pkb.project_id, auth.uid())
          )
        )
      )
    )
  );

-- --- knowledge_sources / documents: add a project-member read branch ------

drop policy "knowledge_sources_select_staff_or_owner" on knowledge_sources;
create policy "knowledge_sources_select_staff_or_owner_or_project_member" on knowledge_sources
  for select using (
    is_curator_or_admin(auth.uid())
    or created_by = auth.uid()
    or exists (
      select 1 from knowledge_bases kb
      where kb.id = knowledge_sources.knowledge_base_id
      and (
        kb.visibility_scope in ('platform', 'public')
        or (
          kb.visibility_scope in ('project_private', 'selected_projects')
          and exists (
            select 1 from project_knowledge_bases pkb
            where pkb.knowledge_base_id = kb.id and is_project_member_strict(pkb.project_id, auth.uid())
          )
        )
      )
    )
  );

drop policy "documents_select_staff_or_owner" on documents;
create policy "documents_select_staff_or_owner_or_project_member" on documents
  for select using (
    is_curator_or_admin(auth.uid())
    or uploaded_by = auth.uid()
    or exists (
      select 1 from knowledge_sources ks
      join knowledge_bases kb on kb.id = ks.knowledge_base_id
      where ks.id = documents.knowledge_source_id
      and (
        kb.visibility_scope in ('platform', 'public')
        or (
          kb.visibility_scope in ('project_private', 'selected_projects')
          and exists (
            select 1 from project_knowledge_bases pkb
            where pkb.knowledge_base_id = kb.id and is_project_member_strict(pkb.project_id, auth.uid())
          )
        )
      )
    )
  );
