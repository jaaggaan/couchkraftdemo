-- Bespoke commission quote + payment tracking (storefront pay when status = approved).

alter table public.custom_requests
  add column if not exists quote_amount numeric(14, 2),
  add column if not exists payment_status text default 'none',
  add column if not exists linked_order_id text;

create index if not exists idx_custom_requests_payment_status
  on public.custom_requests(payment_status);