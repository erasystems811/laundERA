-- Suspend = read-only. When a business is 'paused', the DB blocks ALL writes for its
-- rows (reads still allowed). Enforced centrally in RLS so no button/URL can bypass it.
-- The operator flips status via the service-role key, which bypasses RLS.

create or replace function auth_business_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select status = 'active' from businesses where id = auth_business_id()), false)
$$;

-- businesses: owner can only edit branding while active
drop policy if exists "owner update own business" on businesses;
create policy "owner update own business" on businesses for update
  using (id = auth_business_id() and auth_role() = 'owner' and auth_business_active());

-- staff
drop policy if exists "owner manages staff" on staff;
create policy "owner manages staff" on staff for insert
  with check (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active());
drop policy if exists "owner updates staff" on staff;
create policy "owner updates staff" on staff for update
  using (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active());
drop policy if exists "owner removes staff" on staff;
create policy "owner removes staff" on staff for delete
  using (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active());

-- services
drop policy if exists "owner manages services" on services;
create policy "owner manages services" on services for all
  using (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active())
  with check (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active());

-- customers
drop policy if exists "owner manages customers" on customers;
create policy "owner manages customers" on customers for all
  using (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active())
  with check (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active());

-- orders
drop policy if exists "owner manages orders" on orders;
create policy "owner manages orders" on orders for all
  using (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active())
  with check (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active());

-- order_items (scoped through parent order's business)
drop policy if exists "owner manages order items" on order_items;
create policy "owner manages order items" on order_items for all
  using (
    order_id in (select id from orders where business_id = auth_business_id())
    and auth_role() = 'owner' and auth_business_active()
  )
  with check (
    order_id in (select id from orders where business_id = auth_business_id())
    and auth_role() = 'owner' and auth_business_active()
  );

-- payments
drop policy if exists "owner manages payments" on payments;
create policy "owner manages payments" on payments for all
  using (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active())
  with check (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active());

-- invoices
drop policy if exists "owner manages invoices" on invoices;
create policy "owner manages invoices" on invoices for all
  using (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active())
  with check (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active());

-- expenses
drop policy if exists "owner manages expenses" on expenses;
create policy "owner manages expenses" on expenses for all
  using (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active())
  with check (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active());

-- supply_items
drop policy if exists "owner manages supply items" on supply_items;
create policy "owner manages supply items" on supply_items for all
  using (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active())
  with check (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active());

-- supply_movements
drop policy if exists "owner manages supply movements" on supply_movements;
create policy "owner manages supply movements" on supply_movements for all
  using (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active())
  with check (business_id = auth_business_id() and auth_role() = 'owner' and auth_business_active());
