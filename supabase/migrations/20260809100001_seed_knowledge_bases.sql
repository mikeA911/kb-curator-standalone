-- The original schema design never seeded any knowledge_bases -- without at
-- least one, the upload form has nothing to select and no document can be
-- created. Seeding the same four KBs the old app shipped with.
insert into knowledge_bases (id, name, description) values
  ('fhir', 'FHIR', 'FHIR / healthcare interoperability standards'),
  ('vbc', 'Value-Based Care', 'Value-based care models and programs'),
  ('grants', 'Grants', 'Grant funding and program documentation'),
  ('billing', 'Billing', 'Healthcare billing and claims')
on conflict (id) do nothing;
