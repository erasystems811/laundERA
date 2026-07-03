-- Realign order pipeline to the 5 owner-defined stages, add discount support and customer preferences

-- 1. Drop the old status check constraint
alter table orders drop constraint if exists orders_status_check;

-- 2. Remap existing stage values to the new scheme
update orders set status = 'collected' where status = 'received';
update orders set status = 'processing' where status = 'in_process';
update orders set status = 'in_transit' where status = 'with_rider';
-- 'ready' and 'delivered' keep their names

-- 3. New default + check constraint
alter table orders alter column status set default 'collected';
alter table orders add constraint orders_status_check
  check (status in ('collected', 'processing', 'ready', 'in_transit', 'delivered'));

-- 4. Discount support on orders
alter table orders add column if not exists subtotal numeric(10, 2) not null default 0;
alter table orders add column if not exists discount_type text check (discount_type in ('percentage', 'fixed'));
alter table orders add column if not exists discount_value numeric(10, 2) not null default 0;

-- Backfill subtotal to equal total for pre-existing orders (which had no discount)
update orders set subtotal = total where subtotal = 0;

-- 5. Customer care preferences
alter table customers add column if not exists preferences text;
