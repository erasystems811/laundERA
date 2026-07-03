-- Finance: expenses (recurring monthly/yearly cost base + one-off casual expenses)

create table expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  kind text not null check (kind in ('recurring', 'once')),
  -- for recurring: how often the amount applies (monthly spread across 12 if yearly)
  cadence text check (cadence in ('monthly', 'yearly')),
  -- for one-off: the month it was incurred (any day in that month)
  incurred_on date,
  created_at timestamptz not null default now()
);

alter table expenses enable row level security;

create policy "staff view expenses" on expenses for select
  using (business_id = auth_business_id());

create policy "owner manages expenses" on expenses for all
  using (business_id = auth_business_id() and auth_role() = 'owner')
  with check (business_id = auth_business_id() and auth_role() = 'owner');
