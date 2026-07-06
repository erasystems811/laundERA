-- Date-based access expiry. A business goes read-only (like a manual suspend) once the
-- expiry date arrives, until the operator shifts the date forward. Enforced in RLS so
-- it's automatic and unbypassable. NULL = no expiry (never auto-suspends).

alter table businesses add column if not exists expires_at date;

-- Active = manually active AND not past its expiry date. On the expiry date it's suspended.
create or replace function auth_business_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select status = 'active' and (expires_at is null or current_date < expires_at)
    from businesses where id = auth_business_id()
  ), false)
$$;
