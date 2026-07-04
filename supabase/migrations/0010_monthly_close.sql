-- Freeze each completed month so history is preserved permanently, even if
-- current running costs change later. Past months come from these snapshots;
-- the in-progress month is still computed live.

create table monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  revenue numeric(14, 2) not null default 0,
  expenses numeric(14, 2) not null default 0,
  net_profit numeric(14, 2) not null default 0,
  closed_at timestamptz not null default now(),
  unique (business_id, year, month)
);

alter table monthly_summaries enable row level security;

create policy "staff view summaries" on monthly_summaries for select
  using (business_id = auth_business_id());

-- Close every completed month that isn't frozen yet (from business start to last month).
-- SECURITY DEFINER so it can write the snapshot; scoped strictly to the caller's business.
create or replace function ensure_months_closed()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  bid uuid := auth_business_id();
  bstart date;
  y int; m int; cy int; cm int;
  rev numeric; exp_once numeric; rec_month numeric;
begin
  if bid is null then return; end if;

  select date_trunc('month', created_at)::date into bstart from businesses where id = bid;
  if bstart is null then return; end if;

  cy := extract(year from (now() at time zone 'Africa/Lagos'));
  cm := extract(month from (now() at time zone 'Africa/Lagos'));

  select coalesce(sum(case when cadence = 'yearly' then amount / 12 else amount end), 0)
    into rec_month from expenses where business_id = bid and kind = 'recurring';

  y := extract(year from bstart);
  m := extract(month from bstart);

  while (y < cy) or (y = cy and m < cm) loop
    if not exists (select 1 from monthly_summaries where business_id = bid and year = y and month = m) then
      select coalesce(sum(amount), 0) into rev from payments
        where business_id = bid
          and extract(year from (created_at at time zone 'Africa/Lagos')) = y
          and extract(month from (created_at at time zone 'Africa/Lagos')) = m;
      select coalesce(sum(amount), 0) into exp_once from expenses
        where business_id = bid and kind = 'once'
          and extract(year from incurred_on) = y and extract(month from incurred_on) = m;
      insert into monthly_summaries (business_id, year, month, revenue, expenses, net_profit)
        values (bid, y, m, rev, rec_month + exp_once, rev - (rec_month + exp_once))
        on conflict (business_id, year, month) do nothing;
    end if;
    if m = 12 then m := 1; y := y + 1; else m := m + 1; end if;
  end loop;
end $$;

-- Per-month series for a year: frozen snapshot for closed months, live compute for the rest.
create or replace function monthly_series(p_year int)
returns table (month int, revenue numeric, expenses numeric)
language sql stable
as $$
  select m.month,
    coalesce(ms.revenue,
      (select coalesce(sum(amount), 0) from payments p
        where extract(year from (p.created_at at time zone 'Africa/Lagos')) = p_year
          and extract(month from (p.created_at at time zone 'Africa/Lagos')) = m.month)),
    coalesce(ms.expenses,
      (select coalesce(sum(case when cadence = 'yearly' then amount / 12 else amount end), 0) from expenses where kind = 'recurring')
      + (select coalesce(sum(amount), 0) from expenses e where e.kind = 'once'
          and extract(year from e.incurred_on) = p_year and extract(month from e.incurred_on) = m.month))
  from generate_series(1, 12) as m(month)
  left join monthly_summaries ms on ms.year = p_year and ms.month = m.month
$$;

grant execute on function ensure_months_closed, monthly_series to authenticated;
