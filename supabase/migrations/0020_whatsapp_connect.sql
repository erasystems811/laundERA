-- Per-laundry WhatsApp connection state. comms_session_id (added in 0019) is the ERA Comms
-- session; here we track the number shown and whether it's live.
alter table businesses add column if not exists comms_number text;
alter table businesses add column if not exists comms_connected boolean not null default false;
