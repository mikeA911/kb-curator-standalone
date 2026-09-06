-- Strengthens working_knowledge_shares_manage_owner: the recipient must be a
-- currently active member of the item's own Project, enforced in RLS itself
-- (not just app-layer), matching project_notes_insert_member's exact
-- "recipient must be a Project member" precedent
-- (20260814120001_project_notes.sql:82-88) -- dev request invariant 5,
-- "Sharing is explicit, revocable and restricted to active members of the
-- same Project."
drop policy "working_knowledge_shares_manage_owner" on working_knowledge_shares;
create policy "working_knowledge_shares_manage_owner" on working_knowledge_shares
  for insert to authenticated
  with check (
    granted_by = auth.uid()
    and exists (
      select 1 from working_knowledge_items i
      where i.id = working_knowledge_shares.item_id
        and i.owner_id = auth.uid()
        and is_project_member_strict(i.project_id, recipient_user_id)
    )
  );
