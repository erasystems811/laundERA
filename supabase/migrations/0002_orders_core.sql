-- LaundERA core: services catalog, customers, orders, order items, payments, invoices

create table services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  icon text not null default 'shirt',
  price numeric(10, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  unique (business_id, phone)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete restrict,
  status text not null default 'received'
    check (status in ('received', 'in_process', 'ready', 'with_rider', 'delivered')),
  total numeric(10, 2) not null default 0,
  created_by uuid references staff (id) on delete set null,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  service_id uuid references services (id) on delete set null,
  service_name text not null,
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null default 0
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  order_id uuid not null references orders (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  method text not null check (method in ('cash', 'transfer', 'card')),
  logged_by uuid references staff (id) on delete set null,
  created_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  order_id uuid not null unique references orders (id) on delete cascade,
  invoice_number text not null,
  created_at timestamptz not null default now(),
  unique (business_id, invoice_number)
);

alter table services enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table invoices enable row level security;

-- services: everyone in the business can view; only owner manages the catalog
create policy "staff view services" on services for select
  using (business_id = auth_business_id());
create policy "owner manages services" on services for all
  using (business_id = auth_business_id() and auth_role() = 'owner')
  with check (business_id = auth_business_id() and auth_role() = 'owner');

-- customers: everyone in the business can view; only owner creates/edits
create policy "staff view customers" on customers for select
  using (business_id = auth_business_id());
create policy "owner manages customers" on customers for all
  using (business_id = auth_business_id() and auth_role() = 'owner')
  with check (business_id = auth_business_id() and auth_role() = 'owner');

-- orders: everyone in the business can view; only owner creates/edits (rider access comes with the Delivery module)
create policy "staff view orders" on orders for select
  using (business_id = auth_business_id());
create policy "owner manages orders" on orders for all
  using (business_id = auth_business_id() and auth_role() = 'owner')
  with check (business_id = auth_business_id() and auth_role() = 'owner');

-- order_items: scoped through the parent order's business
create policy "staff view order items" on order_items for select
  using (order_id in (select id from orders where business_id = auth_business_id()));
create policy "owner manages order items" on order_items for all
  using (
    order_id in (select id from orders where business_id = auth_business_id())
    and auth_role() = 'owner'
  )
  with check (
    order_id in (select id from orders where business_id = auth_business_id())
    and auth_role() = 'owner'
  );

-- payments: everyone in the business can view; only owner logs payments
create policy "staff view payments" on payments for select
  using (business_id = auth_business_id());
create policy "owner manages payments" on payments for all
  using (business_id = auth_business_id() and auth_role() = 'owner')
  with check (business_id = auth_business_id() and auth_role() = 'owner');

-- invoices: everyone in the business can view; only owner generates
create policy "staff view invoices" on invoices for select
  using (business_id = auth_business_id());
create policy "owner manages invoices" on invoices for all
  using (business_id = auth_business_id() and auth_role() = 'owner')
  with check (business_id = auth_business_id() and auth_role() = 'owner');
