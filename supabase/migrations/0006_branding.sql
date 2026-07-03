-- Business branding for invoices: address + footer note, and a public bucket for logos.

alter table businesses add column if not exists address text;
alter table businesses add column if not exists invoice_footer text;

-- Public storage bucket for business logos (uploaded via the service role, read publicly).
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;
