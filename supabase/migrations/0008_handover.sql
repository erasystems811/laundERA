-- Accountability: who physically dropped the clothes off, and who collected them.
alter table orders add column if not exists dropped_off_by text;
alter table orders add column if not exists picked_up_by text;
