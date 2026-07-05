-- Show only the typed "done by" name — never fall back to the logged-in account (no guessing).
create or replace function supply_activity(p_limit int default 60)
returns table (id uuid, item_name text, direction text, quantity numeric, note text, who text, created_at timestamptz)
language sql stable
as $$
  select m.id, s.name, m.direction, m.quantity, m.note,
    nullif(m.performed_by, ''),
    m.created_at
  from supply_movements m
  join supply_items s on s.id = m.item_id
  order by m.created_at desc
  limit p_limit
$$;

grant execute on function supply_activity to authenticated;
