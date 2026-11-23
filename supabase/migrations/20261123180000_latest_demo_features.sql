-- ============================================================================
-- CouchKraft demo — apply in Supabase SQL Editor (idempotent)
-- Covers: orders tracking, custom requests (+ reference photos in dimensions jsonb),
-- product inventory columns, optional tracking backfill.
--
-- ALSO RUN (if not applied yet) — paste full file contents in order:
--   1) supabase/migrations/20261111210000_order_persistence_rpc.sql
--   2) supabase/migrations/20261118210000_inventory_units_sold_on_pay.sql
--   3) supabase/migrations/20261123190000_custom_requests_storage_bucket.sql
--   4) supabase/migrations/20261123200000_custom_request_payments.sql
--   5) supabase/migrations/20261123210000_bespoke_commission_product.sql
--
-- Personal / welcome coupons: stored in server data/coupons.json (not in Supabase).
-- ============================================================================

-- --------------------------------------------------------------------------
-- Orders: tracking + checkout + contact (admin tracking feed & auto CKTRK ids)
-- --------------------------------------------------------------------------
alter table public.orders
  add column if not exists checkout_key text,
  add column if not exists tracking_number text,
  add column if not exists payment_error text,
  add column if not exists delivery_method text,
  add column if not exists estimated_delivery text,
  add column if not exists contact jsonb;

create unique index if not exists idx_orders_checkout_key
  on public.orders(checkout_key)
  where checkout_key is not null;

-- App stores estimated_delivery as text (ISO). Normalize if an older DB used timestamptz.
do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'orders'
       and column_name = 'estimated_delivery'
       and udt_name in ('timestamptz', 'timestamp')
  ) then
    alter table public.orders
      alter column estimated_delivery type text
      using estimated_delivery::text;
  end if;
end $$;

-- Auto-assign CouchKraft tracking ref for rows still missing one (safe to re-run)
update public.orders o
set
  tracking_number = coalesce(
    nullif(btrim(coalesce(o.tracking_number, '')), ''),
    'CKTRK'
      || right(regexp_replace(coalesce(o.number, ''), '\D', '', 'g'), 6)
      || upper(right(coalesce(o.id, ''), 4))
  ),
  estimated_delivery = coalesce(
    nullif(btrim(coalesce(o.estimated_delivery, '')), ''),
    o.created_at::text
  ),
  updated_at = now()
where nullif(btrim(coalesce(o.tracking_number, '')), '') is null
   or nullif(btrim(coalesce(o.estimated_delivery, '')), '') is null;

-- --------------------------------------------------------------------------
-- Products: inventory (MTO / ready-to-ship) — skip if already on products
-- --------------------------------------------------------------------------
alter table public.products
  add column if not exists ready_to_ship_stock integer default 0,
  add column if not exists low_stock_threshold integer default 2,
  add column if not exists made_to_order boolean default true,
  add column if not exists lead_time_weeks integer default 3,
  add column if not exists units_sold integer default 0,
  add column if not exists revenue numeric(14, 2) default 0,
  add column if not exists customization_options jsonb default '{}'::jsonb;

-- --------------------------------------------------------------------------
-- Custom requests (signed-in submit + reference images in dimensions jsonb)
-- Example dimensions: { "raw": "200x90", "referenceImages": ["data:image/jpeg;base64,..."] }
-- --------------------------------------------------------------------------
create table if not exists public.custom_requests (
  id text primary key,
  customer_id text,
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  product_id text,
  product_name text,
  product_url text,
  seating_capacity text,
  dimensions jsonb default '{}'::jsonb,
  material text,
  fabric text,
  color text,
  budget text,
  notes text,
  status text default 'new',
  admin_notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.custom_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'custom_requests' and policyname = 'Allow public insert of custom requests'
  ) then
    create policy "Allow public insert of custom requests"
      on public.custom_requests for insert
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'custom_requests' and policyname = 'Allow service role all on custom requests'
  ) then
    create policy "Allow service role all on custom requests"
      on public.custom_requests for all
      using (true)
      with check (true);
  end if;
end $$;

create index if not exists idx_custom_requests_status
  on public.custom_requests(status);

create index if not exists idx_custom_requests_customer_id
  on public.custom_requests(customer_id);

-- --------------------------------------------------------------------------
-- Verification (optional — run select after migrate)
-- --------------------------------------------------------------------------
-- select id, number, tracking_number, estimated_delivery, fulfilment_status from public.orders order by created_at desc limit 5;
-- select id, status, dimensions->'referenceImages' as photos from public.custom_requests order by created_at desc limit 5;