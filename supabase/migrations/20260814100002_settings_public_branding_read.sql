-- settings has RLS restricting SELECT to curator/admin only
-- (settings_select_staff, 20260808190010_rls_policies.sql) -- appropriate
-- for its original purpose (internal runtime toggles like ai_provider), but
-- the new 'branding' key needs to be readable by anonymous visitors too
-- (the public site's header/favicon/manifest all read it). Multiple SELECT
-- policies on the same table are OR'd together, so this adds narrow public
-- read access to exactly that one key without loosening anything else in
-- the table.
create policy "settings_select_public_branding" on settings
  for select using (key = 'branding');
