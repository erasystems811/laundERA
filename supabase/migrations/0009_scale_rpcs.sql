-- Scalability: push heavy aggregation into the database (RLS-scoped, SECURITY INVOKER)
-- so pages fetch small rolled-up results instead of loading whole tables into the app.

-- Indexes that back the aggregates and pagination
create index if not exists idx_orders_business_status on orders (business_id, status);
create index if not exists idx_orders_customer on orders (customer_id);
create index if not exists idx_orders_business_created on orders (business_id, created_at desc);
create index if not exists idx_payments_order on payments (order_id);
create index if not exists idx_payments_business_created on payments (business_id, created_at);
create index if not exists idx_order_items_order on order_items (order_id);
create index if not exists idx_customers_business_name on customers (business_id, name);

-- ── Orders board KPIs ──────────────────────────────────────────────
create or replace function dashboard_stats()
returns table (active_orders bigint, garments bigint, ready_count bigint, owed numeric)
language sql stable
as $$
  select
    (select count(*) from orders where status <> 'delivered'),
    (select coalesce(sum(oi.quantity), 0) from order_items oi join orders o on o.id = oi.order_id where o.status in ('collected','processing','ready')),
    (select count(*) from orders where status = 'ready'),
    (select coalesce(sum(total), 0) from orders) - (select coalesce(sum(amount), 0) from payments)
$$;

-- ── Customers: paginated + searched, with computed spend/balance ────
create or replace function customers_page(p_search text default '', p_limit int default 30, p_offset int default 0)
returns table (id uuid, name text, phone text, order_count bigint, spend numeric, balance numeric)
language sql stable
as $$
  with billed as (select customer_id, count(*) n, sum(total) amt from orders group by customer_id),
       paid as (select o.customer_id, sum(p.amount) amt from orders o join payments p on p.order_id = o.id group by o.customer_id)
  select c.id, c.name, c.phone,
    coalesce(b.n, 0),
    coalesce(b.amt, 0),
    coalesce(b.amt, 0) - coalesce(pd.amt, 0)
  from customers c
  left join billed b on b.customer_id = c.id
  left join paid pd on pd.customer_id = c.id
  where p_search = '' or c.name ilike '%' || p_search || '%' or c.phone ilike '%' || p_search || '%'
  order by (coalesce(b.amt, 0) - coalesce(pd.amt, 0)) desc, coalesce(b.amt, 0) desc, c.name
  limit p_limit offset p_offset
$$;

create or replace function customers_count(p_search text default '')
returns bigint language sql stable
as $$
  select count(*) from customers c
  where p_search = '' or c.name ilike '%' || p_search || '%' or c.phone ilike '%' || p_search || '%'
$$;

-- ── Reports aggregates ─────────────────────────────────────────────
create or replace function reports_monthly(p_year int)
returns table (month int, collected numeric, once_expense numeric)
language sql stable
as $$
  select m.month,
    coalesce((select sum(p.amount) from payments p where extract(year from (p.created_at at time zone 'Africa/Lagos')) = p_year and extract(month from (p.created_at at time zone 'Africa/Lagos')) = m.month), 0),
    coalesce((select sum(e.amount) from expenses e where e.kind = 'once' and extract(year from e.incurred_on) = p_year and extract(month from e.incurred_on) = m.month), 0)
  from generate_series(1, 12) as m(month)
$$;

create or replace function revenue_by_service()
returns table (name text, value numeric)
language sql stable
as $$
  select oi.service_name, sum(oi.quantity * oi.unit_price)
  from order_items oi
  group by oi.service_name
  order by 2 desc
  limit 12
$$;

create or replace function orders_stage_counts()
returns table (stage text, count bigint)
language sql stable
as $$
  select status, count(*) from orders group by status
$$;

create or replace function reports_scalars()
returns table (
  total_orders bigint, total_billed numeric, total_collected numeric,
  collected_today numeric, collected_week numeric, total_customers bigint,
  avg_value numeric, owing_count bigint, owed_total numeric
)
language sql stable
as $$
  with billed as (select customer_id, sum(total) amt from orders group by customer_id),
       paid as (select o.customer_id, sum(p.amount) amt from orders o join payments p on p.order_id = o.id group by o.customer_id),
       bal as (select coalesce(b.amt,0) - coalesce(pd.amt,0) balance from billed b left join paid pd on pd.customer_id = b.customer_id)
  select
    (select count(*) from orders),
    (select coalesce(sum(total), 0) from orders),
    (select coalesce(sum(amount), 0) from payments),
    (select coalesce(sum(amount), 0) from payments where (created_at at time zone 'Africa/Lagos')::date = (now() at time zone 'Africa/Lagos')::date),
    (select coalesce(sum(amount), 0) from payments where created_at >= now() - interval '7 days'),
    (select count(*) from customers),
    (select case when count(*) > 0 then sum(total) / count(*) else 0 end from orders),
    (select count(*) from bal where balance > 0),
    (select coalesce(sum(balance), 0) from bal where balance > 0)
$$;

create or replace function top_customers(p_limit int default 8)
returns table (name text, spend numeric)
language sql stable
as $$
  select c.name, sum(o.total)
  from customers c join orders o on o.customer_id = c.id
  group by c.id, c.name
  order by 2 desc
  limit p_limit
$$;

create or replace function owing_customers(p_limit int default 20)
returns table (name text, balance numeric)
language sql stable
as $$
  with billed as (select customer_id, sum(total) amt from orders group by customer_id),
       paid as (select o.customer_id, sum(p.amount) amt from orders o join payments p on p.order_id = o.id group by o.customer_id)
  select c.name, coalesce(b.amt,0) - coalesce(pd.amt,0) as balance
  from customers c
  join billed b on b.customer_id = c.id
  left join paid pd on pd.customer_id = c.id
  where coalesce(b.amt,0) - coalesce(pd.amt,0) > 0
  order by balance desc
  limit p_limit
$$;

grant execute on function dashboard_stats, customers_page, customers_count, reports_monthly, revenue_by_service, orders_stage_counts, reports_scalars, top_customers, owing_customers to authenticated;
