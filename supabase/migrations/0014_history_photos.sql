-- A timestamped log of every stage change, and photos attached at intake.

create table order_stage_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by uuid references staff (id) on delete set null,
  changed_at timestamptz not null default now()
);

alter table order_stage_events enable row level security;

create policy "staff view stage events" on order_stage_events for select
  using (order_id in (select id from orders where business_id = auth_business_id()));

create policy "owner logs stage events" on order_stage_events for insert
  with check (
    order_id in (select id from orders where business_id = auth_business_id())
    and auth_role() = 'owner' and auth_business_active()
  );

-- Intake photos on the order.
alter table orders add column if not exists photos text[] not null default '{}';

-- Public bucket for order photos.
insert into storage.buckets (id, name, public)
values ('order-photos', 'order-photos', true)
on conflict (id) do nothing;
