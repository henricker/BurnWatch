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
-- ORGANIZATION_INVITES
-- Only OWNER and ADMIN can manage invites for their organization.
--
-- If you get "cannot drop column role ... policy ... depends on it" when running
-- `prisma db push` (e.g. after changing profiles.role to enum), run this first
-- in the Supabase SQL Editor, then run `npx prisma db push`, then re-apply the
-- create policy below:
--
--   drop policy if exists "organization_invites_owner_admin_manage" on public.organization_invites;
--------------------------------------------------------------------------------

alter table public.organization_invites enable row level security;

create policy "organization_invites_owner_admin_manage" on public.organization_invites
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.organization_id = organization_invites.organization_id
      and p.user_id = auth.uid()
      and p.role in ('OWNER', 'ADMIN')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.organization_id = organization_invites.organization_id
      and p.user_id = auth.uid()
      and p.role in ('OWNER', 'ADMIN')
  )
);

--------------------------------------------------------------------------------
-- STORAGE: profile bucket (avatars)
-- Used during onboarding and profile updates. Path format: {auth.uid()}/avatar-*.{ext}
-- Run in Supabase SQL Editor. Requires bucket "profile" to exist in Storage.
--------------------------------------------------------------------------------

create policy "profile_bucket_own_folder_all"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'profile'
  and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
)
with check (
  bucket_id = 'profile'
  and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
);

--------------------------------------------------------------------------------
-- NOTE:
-- Any new tenant-aware table MUST include an `organization_id` column and
-- follow this same pattern:
--   - Join to `public.profiles` on organization_id
--   - Filter by `profiles.user_id = auth.uid()`
-- so that users only see data from their own Organization (workspace).
--------------------------------------------------------------------------------

