-- The board keeps recently-completed orders visible. Base that on WHEN the order was
-- completed, not when it was created — otherwise an old order just marked delivered/
-- picked up vanishes instead of showing in its terminal column.

alter table orders add column if not exists completed_at timestamptz;

-- Backfill: use the terminal stage-change time, else fall back to created_at.
update orders o set completed_at = (
  select max(e.changed_at) from order_stage_events e
  where e.order_id = o.id and e.to_stage in ('delivered', 'picked_up')
)
where o.status in ('delivered', 'picked_up') and o.completed_at is null;

update orders set completed_at = created_at
where status in ('delivered', 'picked_up') and completed_at is null;
