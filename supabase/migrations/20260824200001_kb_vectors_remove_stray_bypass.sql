-- Follow-up to 20260824180001_project_knowledge_visibility_retrieval_fix.sql,
-- caught during this stage's own live-verification pass, before testing
-- curator/admin accounts against the Zadara private content.
--
-- kb_vectors_select_scoped was written with an unconditional
-- `is_curator_or_admin(auth.uid()) or ...` bypass -- the exact leak shape
-- this whole migration exists to close, reintroduced for the actual
-- confidential chunk content, and inconsistent with the sibling
-- wiki_vectors_select_scoped policy in the same file (which correctly
-- scopes its own staff bypass to `status <> 'approved'` only, for
-- legitimate pre-publication review). kb_vectors has no equivalent draft
-- state to justify any bypass at all: it only ever contains chunks that
-- were already curator-approved by construction (see
-- 20260810100006_consultant_vector_read_access.sql's own comment, quoted in
-- 20260824180001's header) -- so the correct policy has zero unconditional
-- branches, full stop.

drop policy "kb_vectors_select_scoped" on kb_vectors;
create policy "kb_vectors_select_scoped" on kb_vectors
  for select using (
    exists (
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
