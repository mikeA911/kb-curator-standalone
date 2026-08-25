-- Project Evidence Access Controls, Stage 1 -- enforcement half. Adds
-- has_evidence_access(), the same "zero bypass for anyone" shape as
-- is_project_member_strict() (20260824170001_project_wiki_strict_membership.sql),
-- and ANDs it into every existing SELECT policy that can currently expose
-- project evidence: knowledge_sources, documents, kb_vectors, wiki_articles,
-- wiki_versions, wiki_vectors, workstream_artifacts.
--
-- has_evidence_access() returns true when a resource has NO
-- resource_access_policies row at all -- so for the 60+ existing Wiki
-- articles and every currently-attached source, this AND-gate is a no-op:
-- behavior is byte-for-byte identical to today unless someone has
-- deliberately classified a specific resource. No backfill needed.
--
-- match_documents/match_wiki_vectors (the RPCs the Assistant and eval use)
-- are plain `language sql stable` functions, not security definer, so they
-- run under the caller's own RLS -- extending kb_vectors_select_scoped and
-- wiki_vectors_select_scoped here is sufficient to filter Assistant/eval
-- retrieval "within the database query, not after text is returned" per
-- the dev request's own requirement. No application code changes needed in
-- src/lib/chat/project-knowledge-tool.ts or src/lib/eval/retrieval.ts.
--
-- This also closes the citation-navigation gap noted in
-- src/app/(app)/sources/[id]/page.tsx's own comment about
-- src/lib/chat/navigation-resolver.ts trusting knowledge_sources' RLS alone
-- for the knowledge_source case -- once RLS itself carries this gate, that
-- code path is covered with no application change.

-- `classification = 'project_general'` is treated identically to "no policy
-- row at all" in both branches below -- project_general is an explicit,
-- selectable classification (matches the dev request's suggested list), not
-- just the absence of a row, and it must mean "open to the project" either
-- way. Only a *non*-general classification ever requires an active grant.
create or replace function has_evidence_access(p_resource_type text, p_resource_id uuid, uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from resource_access_policies rap
    where rap.resource_type = p_resource_type and rap.resource_id = p_resource_id
    and rap.classification <> 'project_general'
  )
  or exists (
    select 1
    from resource_access_policies rap
    join resource_access_grants g on g.resource_access_policy_id = rap.id and g.status = 'active'
    left join project_access_group_members gm
      on gm.project_access_group_id = g.project_access_group_id
      and gm.status = 'active'
      and (gm.expires_at is null or gm.expires_at > now())
    left join project_members pm_group on pm_group.id = gm.project_member_id and pm_group.status = 'active'
    left join project_members pm_named on pm_named.id = g.project_member_id and pm_named.status = 'active'
    where rap.resource_type = p_resource_type and rap.resource_id = p_resource_id
      and rap.classification <> 'project_general'
      and (pm_group.user_id = uid or pm_named.user_id = uid)
  );
$$;

-- --- knowledge_sources -------------------------------------------------------
-- Wraps the ENTIRE existing condition, including the curator/admin and
-- created_by bypass branches -- a restricted source is restricted for
-- everyone without an explicit grant, full stop, including its own
-- uploader/creator (who classifies it should grant themselves/their group
-- in the same action -- see classifyResource in
-- src/lib/projects/evidence-access.ts).

drop policy "knowledge_sources_select_staff_or_owner_or_project_member" on knowledge_sources;
create policy "knowledge_sources_select_staff_or_owner_or_project_member" on knowledge_sources
  for select using (
    has_evidence_access('knowledge_source', knowledge_sources.id, auth.uid())
    and (
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
    )
  );

-- --- documents ---------------------------------------------------------------
-- resource_id is the stable knowledge_source, not the versioned document --
-- classification/grants apply to every version of a source uniformly.

drop policy "documents_select_staff_or_owner_or_project_member" on documents;
create policy "documents_select_staff_or_owner_or_project_member" on documents
  for select using (
    has_evidence_access('knowledge_source', documents.knowledge_source_id, auth.uid())
    and (
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
    )
  );

-- --- kb_vectors ----------------------------------------------------------------
-- Already has zero unconditional bypass (20260824200001) -- just wraps the
-- whole thing. This is the actual retrieval-time gate for the Assistant's
-- search_project_knowledge tool and eval's retrieveEvidence, via
-- match_documents.

drop policy "kb_vectors_select_scoped" on kb_vectors;
create policy "kb_vectors_select_scoped" on kb_vectors
  for select using (
    exists (
      select 1 from documents d
      join knowledge_sources ks on ks.current_version_id = d.id
      join knowledge_bases kb on kb.id = ks.knowledge_base_id
      where d.id = kb_vectors.document_id
      and has_evidence_access('knowledge_source', ks.id, auth.uid())
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

-- --- wiki_articles / wiki_versions / wiki_vectors -----------------------------
-- Wraps the whole condition including the unapproved-draft curator/admin
-- bypass -- a restricted article stays restricted even under review.

drop policy "wiki_articles_select_approved_or_staff" on wiki_articles;
create policy "wiki_articles_select_approved_or_staff" on wiki_articles
  for select using (
    has_evidence_access('wiki_article', wiki_articles.id, auth.uid())
    and (
      (status <> 'approved' and is_curator_or_admin(auth.uid()))
      or (status = 'approved' and visibility_scope in ('platform', 'public'))
      or (
        status = 'approved'
        and visibility_scope in ('project_private', 'selected_projects')
        and exists (
          select 1 from project_wiki_articles pwa
          where pwa.wiki_article_id = wiki_articles.id and is_project_member_strict(pwa.project_id, auth.uid())
        )
      )
    )
  );

drop policy "wiki_versions_select_approved_or_staff" on wiki_versions;
create policy "wiki_versions_select_approved_or_staff" on wiki_versions
  for select using (
    has_evidence_access('wiki_article', wiki_versions.wiki_article_id, auth.uid())
    and (
      (approved_at is null and is_curator_or_admin(auth.uid()))
      or (
        approved_at is not null
        and exists (
          select 1 from wiki_articles wa
          where wa.id = wiki_versions.wiki_article_id
          and (
            wa.visibility_scope in ('platform', 'public')
            or (
              wa.visibility_scope in ('project_private', 'selected_projects')
              and exists (
                select 1 from project_wiki_articles pwa
                where pwa.wiki_article_id = wa.id and is_project_member_strict(pwa.project_id, auth.uid())
              )
            )
          )
        )
      )
    )
  );

drop policy "wiki_vectors_select_scoped" on wiki_vectors;
create policy "wiki_vectors_select_scoped" on wiki_vectors
  for select using (
    exists (
      select 1 from wiki_articles wa
      where wa.current_version_id = wiki_vectors.wiki_version_id
      and has_evidence_access('wiki_article', wa.id, auth.uid())
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

-- --- workstream_artifacts ------------------------------------------------------
-- Two fixes at once: swap the non-strict is_project_member (admin bypass)
-- for is_project_member_strict, closing a pre-existing inconsistency (every
-- other project-scoped table was already tightened, this one was never
-- revisited) -- and AND in has_evidence_access for the new access-group
-- gate.

drop policy "workstream_artifacts_select_member" on workstream_artifacts;
create policy "workstream_artifacts_select_member" on workstream_artifacts
  for select using (
    has_evidence_access('workstream_artifact', workstream_artifacts.id, auth.uid())
    and exists (
      select 1 from project_workstreams w
      where w.id = workstream_artifacts.workstream_id and is_project_member_strict(w.project_id, auth.uid())
    )
  );
