-- CouchKraft payment identifier integrity
-- Apply manually only after running the duplicate-detection query below.
-- This file is not executed by the application.

-- Diagnostic: resolve any existing duplicate Razorpay payment IDs first.
-- select razorpay_payment_id, count(*) as occurrences,
--        array_agg(id order by created_at) as order_ids
-- from public.orders
-- where razorpay_payment_id is not null
-- group by razorpay_payment_id
-- having count(*) > 1
-- order by occurrences desc, razorpay_payment_id;

-- Existing duplicates must be investigated against Razorpay payment records.
-- Keep the payment ID only on the verified order, set incorrect duplicates to
-- null or correct them through an approved data migration, then re-run the
-- diagnostic query. Do not delete historical orders.

create unique index if not exists idx_orders_razorpay_payment_id_unique
  on public.orders (razorpay_payment_id)
  where razorpay_payment_id is not null;
