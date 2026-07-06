-- WhatsApp notifications (via ERA Comms). Opt-in per business. comms_session_id is the
-- laundry's own connected WhatsApp number; NULL falls back to the platform default sender.

alter table businesses add column if not exists notify_on_ready boolean not null default false;
alter table businesses add column if not exists comms_session_id text;

create table notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  order_id uuid references orders (id) on delete set null,
  channel text not null default 'whatsapp',
  recipient text not null,
  content text not null,
  status text not null default 'queued',
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);

create index notifications_business_idx on notifications (business_id, created_at desc);

alter table notifications enable row level security;

-- Owners can read their own notification log; rows are written server-side (service role).
create policy "staff view notifications" on notifications for select
  using (business_id = auth_business_id());
