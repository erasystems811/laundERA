-- Inventory category 1: supplies (consumables) with manual stock in/out.
-- (Category 2, clothes-in-custody, is derived live from orders — no table needed.)

create table supply_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  unit text not null default 'pcs',
  quantity numeric(12, 2) not null default 0,
  low_threshold numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table supply_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  item_id uuid not null references supply_items (id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  quantity numeric(12, 2) not null check (quantity > 0),
  created_at timestamptz not null default now()
);

alter table supply_items enable row level security;
alter table supply_movements enable row level security;

create policy "staff view supply items" on supply_items for select
  using (business_id = auth_business_id());
create policy "owner manages supply items" on supply_items for all
  using (business_id = auth_business_id() and auth_role() = 'owner')
  with check (business_id = auth_business_id() and auth_role() = 'owner');

create policy "staff view supply movements" on supply_movements for select
  using (business_id = auth_business_id());
create policy "owner manages supply movements" on supply_movements for all
  using (business_id = auth_business_id() and auth_role() = 'owner')
  with check (business_id = auth_business_id() and auth_role() = 'owner');
