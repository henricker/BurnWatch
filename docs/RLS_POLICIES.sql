-- Row Level Security policies for BurnWatch multi-tenancy (Supabase Postgres)
-- Source of truth for manual application in the Supabase SQL editor.

--------------------------------------------------------------------------------
-- ORGANIZATIONS
-- Users can only see organizations where they have a profile.
--------------------------------------------------------------------------------

create policy "orgs_select_member" on public.organizations
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.organization_id = organizations.id
      and p.user_id = auth.uid()
  )
);

--------------------------------------------------------------------------------
-- PROFILES
-- Users can only see and manage their own profile row.
--------------------------------------------------------------------------------

create policy "profiles_self_read" on public.profiles
for select
using (user_id = auth.uid());

create policy "profiles_self_insert" on public.profiles
for insert
with check (user_id = auth.uid());

create policy "profiles_self_update" on public.profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

--------------------------------------------------------------------------------
-- CLOUD_ACCOUNTS
-- Access restricted to members of the same organization.
--------------------------------------------------------------------------------

create policy "cloud_accounts_member_crud" on public.cloud_accounts
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.organization_id = cloud_accounts.organization_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.organization_id = cloud_accounts.organization_id
      and p.user_id = auth.uid()
  )
);

--------------------------------------------------------------------------------
-- DAILY_SPEND
-- Access restricted to members of the same organization.
--------------------------------------------------------------------------------

create policy "daily_spend_member_crud" on public.daily_spend
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.organization_id = daily_spend.organization_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.organization_id = daily_spend.organization_id
      and p.user_id = auth.uid()
  )
);

--------------------------------------------------------------------------------
-- NOTE:
-- Any new tenant-aware table MUST include an `organization_id` column and
-- follow this same pattern:
--   - Join to `public.profiles` on organization_id
--   - Filter by `profiles.user_id = auth.uid()`
-- so that users only see data from their own Organization (workspace).
--------------------------------------------------------------------------------

