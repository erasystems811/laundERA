-- LaundERA foundation: tenants (businesses) and staff (owner/rider roles)

create extension if not exists pgcrypto;

create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp_number text,
  logo_url text,
  primary_color text not null default '#0f172a',
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now()
);

create table staff (
  id uuid primary key references auth.users (id) on delete cascade,
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  phone text not null,
  role text not null check (role in ('owner', 'rider')),
  created_at timestamptz not null default now(),
  unique (business_id, phone)
);

alter table businesses enable row level security;
alter table staff enable row level security;

-- Helpers: resolve the logged-in user's business_id / role once, reused by every policy
create or replace function auth_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from staff where id = auth.uid()
$$;

create or replace function auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from staff where id = auth.uid()
$$;

-- Everyone can see their own business; only the owner can edit it (branding, status)
create policy "staff view own business"
  on businesses for select
  using (id = auth_business_id());

create policy "owner update own business"
  on businesses for update
  using (id = auth_business_id() and auth_role() = 'owner');

-- Everyone can see their teammates; only the owner manages the staff list
create policy "staff view colleagues"
  on staff for select
  using (business_id = auth_business_id());

create policy "owner manages staff"
  on staff for insert
  with check (business_id = auth_business_id() and auth_role() = 'owner');

create policy "owner updates staff"
  on staff for update
  using (business_id = auth_business_id() and auth_role() = 'owner');

create policy "owner removes staff"
  on staff for delete
  using (business_id = auth_business_id() and auth_role() = 'owner');
