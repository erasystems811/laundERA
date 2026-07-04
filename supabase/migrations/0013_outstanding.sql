-- Orders with an unpaid balance, for the dedicated Payments tab (paginated, RLS-scoped).
create or replace function outstanding_orders(p_limit int default 50, p_offset int default 0)
returns table (id uuid, customer_name text, customer_id uuid, created_at timestamptz, total numeric, paid numeric, balance numeric)
language sql stable
as $$
  with pay as (select order_id, sum(amount) amt from payments group by order_id)
  select o.id, c.name, c.id, o.created_at, o.total, coalesce(p.amt, 0), o.total - coalesce(p.amt, 0)
  from orders o
  join customers c on c.id = o.customer_id
  left join pay p on p.order_id = o.id
  where o.total - coalesce(p.amt, 0) > 0
  order by o.created_at asc
  limit p_limit offset p_offset
$$;

grant execute on function outstanding_orders to authenticated;
