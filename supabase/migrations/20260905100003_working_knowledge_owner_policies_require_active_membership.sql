-- Closes a live-verified gap in every owner-only policy across all three
-- Working Knowledge tables: each checked only owner_id/granted_by = auth.uid(),
-- never whether that owner is STILL a currently active member of the item's
-- own Project. Since RLS SELECT/UPDATE policies are ORed together, this let
-- an owner who has been removed from the Project keep reading, editing,
-- archiving, and managing sources/shares on their own now-orphaned notebook
-- via these owner-branch policies -- even though can_view_working_knowledge_item
-- (the *_select_visible policies) already correctly requires
-- is_project_member_strict on every branch. Live-verified against the real
-- database (not just the SQL-shape unit tests) with a disposable Project:
-- demoting the owner's own project_members row to 'inactive' left them still
-- able to select their own item until this fix. Dev request acceptance
-- criterion 7: "Removing the creator's Project membership prevents Ember
-- retrieval and direct access immediately" -- "immediately" and "direct
-- access" cover every one of these five policies, not only Ember's own
-- retrieval tools (which already went through working_knowledge_items_select_own).

drop policy "working_knowledge_items_select_own" on working_knowledge_items;
create policy "working_knowledge_items_select_own" on working_knowledge_items
  for select using (owner_id = auth.uid() and is_project_member_strict(project_id, auth.uid()));

drop policy "working_knowledge_items_update_owner" on working_knowledge_items;
create policy "working_knowledge_items_update_owner" on working_knowledge_items
  for update
  using (owner_id = auth.uid() and is_project_member_strict(project_id, auth.uid()))
  with check (owner_id = auth.uid() and is_project_member_strict(project_id, auth.uid()));

drop policy "working_knowledge_sources_manage_owner" on working_knowledge_sources;
create policy "working_knowledge_sources_manage_owner" on working_knowledge_sources
  for all using (
    exists (
      select 1 from working_knowledge_items i
      where i.id = working_knowledge_sources.item_id and i.owner_id = auth.uid() and is_project_member_strict(i.project_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from working_knowledge_items i
      where i.id = working_knowledge_sources.item_id and i.owner_id = auth.uid() and is_project_member_strict(i.project_id, auth.uid())
    )
  );

drop policy "working_knowledge_shares_manage_owner" on working_knowledge_shares;
create policy "working_knowledge_shares_manage_owner" on working_knowledge_shares
  for insert to authenticated
  with check (
    granted_by = auth.uid()
    and exists (
      select 1 from working_knowledge_items i
      where i.id = working_knowledge_shares.item_id
        and i.owner_id = auth.uid()
        and is_project_member_strict(i.project_id, auth.uid())
        and is_project_member_strict(i.project_id, recipient_user_id)
    )
  );

drop policy "working_knowledge_shares_revoke_owner" on working_knowledge_shares;
create policy "working_knowledge_shares_revoke_owner" on working_knowledge_shares
  for update using (
    exists (
      select 1 from working_knowledge_items i
      where i.id = working_knowledge_shares.item_id and i.owner_id = auth.uid() and is_project_member_strict(i.project_id, auth.uid())
    )
  )
  with check (
    exists (
      select 1 from working_knowledge_items i
      where i.id = working_knowledge_shares.item_id and i.owner_id = auth.uid() and is_project_member_strict(i.project_id, auth.uid())
    )
  );
