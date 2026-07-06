-- Internal "Contacted" stage after Ready (staff have reached out to the customer).
-- Clothes are still in the shop; it counts toward "ready for pickup". No notification.

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('collected', 'processing', 'ready', 'contacted', 'in_transit', 'delivered', 'picked_up'));

create or replace function dashboard_stats()
returns table (active_orders bigint, garments bigint, ready_count bigint, owed numeric)
language sql stable
as $$
  select
    (select count(*) from orders where status not in ('delivered', 'picked_up')),
    (select coalesce(sum(oi.quantity), 0) from order_items oi join orders o on o.id = oi.order_id where o.status in ('collected','processing','ready','contacted')),
    (select count(*) from orders where status in ('ready', 'contacted')),
    (select coalesce(sum(total), 0) from orders) - (select coalesce(sum(amount), 0) from payments)
$$;
