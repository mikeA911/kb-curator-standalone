-- Information Sensitivity Classification -- per Mike's Shadow AI blog post
-- ("Shadow AI Is Already Inside the Enterprise") and the plan discussed
-- 2026-08-28. Deliberately a NEW, separate column/table from the existing
-- Project Evidence Access Controls (resource_access_policies.classification,
-- 20260825100001) rather than repurposing it -- that system answers "which
-- humans can see this resource" (a binary access-grant gate); this one
-- answers "which AI models may process this resource's content" (a machine-
-- eligibility ceiling). Conflating the two would break the existing,
-- working access-grant feature.

-- resource_access_policies already has a unique (resource_type, resource_id)
-- constraint -- one row per resource platform-wide, not per project -- so
-- adding a column here gives a genuinely resource-global sensitivity tier,
-- matching the blog's framing that sensitivity is a property of the
-- document, not of which project happens to be viewing it. No new RLS
-- needed: the existing "resource_access_policies_manage_owner" policy
-- (can_manage_project) already covers every column on this table.
alter table resource_access_policies add column information_sensitivity text
  check (information_sensitivity in ('public', 'internal', 'confidential', 'restricted'));
-- null = not yet classified. The enforcement side (src/lib/ai/sensitivity.ts)
-- treats null as 'internal' -- a safer default than silently treating
-- unclassified content as public.

-- ai_provider_sensitivity_eligibility -----------------------------------
-- One row per AI provider: the highest sensitivity tier that provider is
-- approved to receive. A simple ordinal ceiling ('restricted' = approved for
-- everything, 'public' = public content only), not a set of allowed tiers,
-- matching the blog's own ladder framing. A provider with no row here is
-- treated as 'internal'-only by the enforcement side -- the safe default,
-- not "approved for everything" -- so this needs zero backfill for existing
-- providers to remain safe.
create table ai_provider_sensitivity_eligibility (
  provider_id uuid not null references ai_providers(id) on delete cascade,
  max_sensitivity text not null check (max_sensitivity in ('public', 'internal', 'confidential', 'restricted')),
  updated_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now(),

  primary key (provider_id)
);

create trigger ai_provider_sensitivity_eligibility_set_updated_at before update on ai_provider_sensitivity_eligibility
  for each row execute function set_updated_at();

alter table ai_provider_sensitivity_eligibility enable row level security;

-- Same read/write split as ai_providers/ai_models themselves (20260810110001):
-- any active, non-anonymous session may read (needed so the chat loop's
-- enforcement check works for every requesting user, not just admins);
-- only admins may set a provider's eligibility ceiling.
create policy "ai_provider_sensitivity_eligibility_select_staff_or_consultant" on ai_provider_sensitivity_eligibility
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role != 'anonymous' and p.is_active)
  );

create policy "ai_provider_sensitivity_eligibility_admin_manage" on ai_provider_sensitivity_eligibility
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
