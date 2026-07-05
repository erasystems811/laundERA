-- The person physically restocking/using is typed in (shared device, not individually logged in) —
-- like dropped_off_by / picked_up_by on orders. Don't attribute to the account holder.

alter table supply_movements add column if not exists performed_by text;

create or replace function supply_activity(p_limit int default 60)
returns table (id uuid, item_name text, direction text, quantity numeric, note text, who text, created_at timestamptz)
language sql stable
as $$
  select m.id, s.name, m.direction, m.quantity, m.note,
    coalesce(nullif(m.performed_by, ''), st.name),
    m.created_at
  from supply_movements m
  join supply_items s on s.id = m.item_id
  left join staff st on st.id = m.changed_by
  order by m.created_at desc
  limit p_limit
$$;

grant execute on function supply_activity to authenticated;
