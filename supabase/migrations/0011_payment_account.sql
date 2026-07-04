-- Payment setup per business. The bank account here prints on invoices so customers
-- know where to pay ("listen" mode). Auto-detection (open banking / Flutterwave) layers on later.

alter table businesses add column if not exists payment_method text not null default 'manual'
  check (payment_method in ('manual', 'listen', 'flutterwave'));
alter table businesses add column if not exists bank_name text;
alter table businesses add column if not exists account_number text;
alter table businesses add column if not exists account_name text;
