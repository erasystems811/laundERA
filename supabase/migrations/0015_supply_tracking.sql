-- Account for supply usage/restock: who did it, an optional note, and reporting.

alter table supply_movements add column if not exists changed_by uuid references staff (id) on delete set null;
alter table supply_movements add column if not exists note text;
create index if not exists supply_movements_item_idx on supply_movements (business_id, item_id, created_at desc);

-- Recent usage/restock activity (who, what, when), newest first.
create or replace function supply_activity(p_limit int default 60)
returns table (id uuid, item_name text, direction text, quantity numeric, note text, who text, created_at timestamptz)
language sql stable
as $$
  select m.id, s.name, m.direction, m.quantity, m.note, st.name, m.created_at
  from supply_movements m
  join supply_items s on s.id = m.item_id
  left join staff st on st.id = m.changed_by
  order by m.created_at desc
  limit p_limit
$$;

-- Per-item consumption analytics: how much used/restocked, average daily use, how long stock lasts.
create or replace function supply_report()
returns table (
  item_id uuid, name text, unit text, quantity numeric,
  total_used numeric, total_restocked numeric, restock_count bigint,
  avg_daily_use numeric, days_left numeric, days_tracked numeric
)
language sql stable
as $$
  with mv as (
    select item_id,
      sum(case when direction = 'out' then quantity else 0 end) as used,
      sum(case when direction = 'in' then quantity else 0 end) as restocked,
      count(*) filter (where direction = 'in') as restock_count,
      min(created_at) as first_at
    from supply_movements
    group by item_id
  ),
  calc as (
    select s.id, s.name, s.unit, s.quantity,
      coalesce(mv.used, 0) as used,
      coalesce(mv.restocked, 0) as restocked,
      coalesce(mv.restock_count, 0) as restock_count,
      case when mv.first_at is not null then greatest(1, extract(epoch from (now() - mv.first_at)) / 86400.0) else 0 end as days_tracked
    from supply_items s
    left join mv on mv.item_id = s.id
  )
  select id, name, unit, quantity, used, restocked, restock_count,
    case when days_tracked > 0 then used / days_tracked else 0 end as avg_daily_use,
    case when days_tracked > 0 and used > 0 then quantity / (used / days_tracked) else null end as days_left,
    days_tracked
  from calc
$$;

grant execute on function supply_activity, supply_report to authenticated;
