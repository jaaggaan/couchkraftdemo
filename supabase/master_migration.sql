-- ============================================================================
-- COUCHKRAFT SUPABASE MASTER RELATIONAL REPAIR & SECURITY MIGRATION
-- Project: https://qzpnxxlwlphxdcdlbiph.supabase.co
-- Run this entire script in Supabase Dashboard -> SQL Editor -> Run
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. CATEGORIES -> PRODUCTS (Foreign Key & Backfill)
-- ============================================================================
alter table public.products 
add column if not exists category_id text;

-- Backfill category_id by matching existing category text or slug
update public.products p
set category_id = c.id
from public.categories c
where p.category_id is null
  and (
    p.category = c.name
    or p.category ilike '%' || split_part(c.name, ' > ', 2) || '%'
    or p.category ilike '%' || split_part(c.name, ' > ', 1) || '%'
    or lower(c.slug) = lower(p.category)
  );

-- Default any unmapped products to default category
update public.products
set category_id = 'cat_sofas'
where category_id is null;

alter table public.products 
alter column category_id set not null;

alter table public.products
drop constraint if exists fk_products_category;

alter table public.products
add constraint fk_products_category
  foreign key (category_id)
  references public.categories(id)
  on update cascade
  on delete restrict;

create index if not exists idx_products_category_id 
on public.products(category_id);


-- ============================================================================
-- 2. CUSTOMERS -> ORDERS (Foreign Key & Historical Preservation)
-- ============================================================================
-- Nullify any invalid orphaned customer IDs so constraint succeeds
update public.orders
set customer_id = null
where customer_id is not null
  and customer_id not in (select id from public.customers);

alter table public.orders
drop constraint if exists fk_orders_customer;

alter table public.orders
add constraint fk_orders_customer
  foreign key (customer_id)
  references public.customers(id)
  on update cascade
  on delete set null;

create index if not exists idx_orders_customer_id 
on public.orders(customer_id);


-- ============================================================================
-- 3. COUPONS -> ORDERS (Foreign Key & Backfill)
-- ============================================================================
alter table public.orders 
add column if not exists coupon_id text;

update public.orders o
set coupon_id = c.id
from public.coupons c
where o.coupon_id is null
  and o.coupon is not null
  and upper(trim(o.coupon)) = upper(trim(c.code));

alter table public.orders
drop constraint if exists fk_orders_coupon;

alter table public.orders
add constraint fk_orders_coupon
  foreign key (coupon_id)
  references public.coupons(id)
  on update cascade
  on delete set null;

create index if not exists idx_orders_coupon_id 
on public.orders(coupon_id);


-- ============================================================================
-- 4. ADMINS -> AUDIT LOGS (Foreign Key)
-- ============================================================================
update public.admin_audit
set admin_id = (select id from public.admins order by created_at asc limit 1)
where admin_id not in (select id from public.admins);

alter table public.admin_audit
drop constraint if exists fk_admin_audit_admin;

alter table public.admin_audit
add constraint fk_admin_audit_admin
  foreign key (admin_id)
  references public.admins(id)
  on update cascade
  on delete cascade;

create index if not exists idx_admin_audit_admin_id 
on public.admin_audit(admin_id);

create index if not exists idx_admin_audit_created_at 
on public.admin_audit(created_at desc);


-- ============================================================================
-- 5. ORDERS -> ORDER ITEMS -> PRODUCTS (Normalized Table & Data Migration)
-- ============================================================================
create table if not exists public.order_items (
    id text primary key default ('item_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    order_id text not null,
    product_id text,
    quantity integer not null default 1 check (quantity > 0),
    price_at_purchase numeric(12, 2) not null check (price_at_purchase >= 0),
    product_name_snapshot text not null,
    product_sku_snapshot text default '',
    variant_details jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    constraint fk_order_items_order
      foreign key (order_id)
      references public.orders(id)
      on update cascade
      on delete cascade,
    constraint fk_order_items_product
      foreign key (product_id)
      references public.products(id)
      on update cascade
      on delete set null
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);

-- Backfill from orders.items JSON to order_items rows
insert into public.order_items (
    id,
    order_id,
    product_id,
    quantity,
    price_at_purchase,
    product_name_snapshot,
    product_sku_snapshot,
    variant_details,
    created_at
)
select
    coalesce(item->>'id', 'item_' || o.id || '_' || (ord - 1)) as id,
    o.id as order_id,
    p.id as product_id,
    coalesce((item->>'quantity')::integer, 1) as quantity,
    coalesce((item->>'price')::numeric, p.price, 0) as price_at_purchase,
    coalesce(item->>'name', p.name, 'Artisanal Furniture Piece') as product_name_snapshot,
    coalesce(item->>'sku', p.sku, '') as product_sku_snapshot,
    jsonb_build_object(
        'finish', item->>'finish',
        'color', item->>'color',
        'swatch', item->'swatch',
        'customization', item->'customization'
    ) as variant_details,
    o.created_at
from public.orders o,
lateral jsonb_array_elements(case when jsonb_typeof(o.items) = 'array' then o.items else '[]'::jsonb end) with ordinality as t(item, ord)
left join public.products p on p.id = (item->>'productId') or p.id = (item->>'id')
on conflict (id) do nothing;


-- ============================================================================
-- 6. SECURITY: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Drop overly permissive wildcard write policies
drop policy if exists "Allow all operations on categories" on public.categories;
drop policy if exists "Allow all operations on products" on public.products;
drop policy if exists "Allow all operations on banners" on public.banners;
drop policy if exists "Allow all operations on coupons" on public.coupons;
drop policy if exists "Allow all operations on customers" on public.customers;
drop policy if exists "Allow all operations on orders" on public.orders;
drop policy if exists "Allow all operations on admins" on public.admins;
drop policy if exists "Allow all operations on admin_audit" on public.admin_audit;
drop policy if exists "Allow public read categories" on public.categories;
drop policy if exists "Allow public read products" on public.products;
drop policy if exists "Allow public read banners" on public.banners;
drop policy if exists "Allow public read active coupons" on public.coupons;

-- Enable RLS across all tables
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.banners enable row level security;
alter table public.coupons enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.admins enable row level security;
alter table public.admin_audit enable row level security;

-- Public READ for catalogue & marketing
drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories"
on public.categories for select
using (true);

drop policy if exists "Public can read published products" on public.products;
create policy "Public can read published products"
on public.products for select
using (status = 'published');

drop policy if exists "Public can read active banners" on public.banners;
create policy "Public can read active banners"
on public.banners for select
using (active = true);

drop policy if exists "Public can view active coupons" on public.coupons;
create policy "Public can view active coupons"
on public.coupons for select
using (active = true and (end_date is null or end_date > now()));

-- Customer data isolation
drop policy if exists "Customers can view their own record" on public.customers;
create policy "Customers can view their own record"
on public.customers for select
using (auth.uid()::text = id or auth.jwt()->>'sub' = id);

drop policy if exists "Customers can update their own record" on public.customers;
create policy "Customers can update their own record"
on public.customers for update
using (auth.uid()::text = id or auth.jwt()->>'sub' = id)
with check (auth.uid()::text = id or auth.jwt()->>'sub' = id);

drop policy if exists "Customers can read own orders" on public.orders;
create policy "Customers can read own orders"
on public.orders for select
using (
  customer_id is not null 
  and (auth.uid()::text = customer_id or auth.jwt()->>'sub' = customer_id)
);

drop policy if exists "Customers can read own order items" on public.order_items;
create policy "Customers can read own order items"
on public.order_items for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.customer_id is not null
      and (auth.uid()::text = o.customer_id or auth.jwt()->>'sub' = o.customer_id)
  )
);

-- Permissive service_role and backend API access
drop policy if exists "Service role full access categories" on public.categories;
create policy "Service role full access categories"
on public.categories for all
using (true) with check (true);

drop policy if exists "Service role full access products" on public.products;
create policy "Service role full access products"
on public.products for all
using (true) with check (true);

drop policy if exists "Service role full access banners" on public.banners;
create policy "Service role full access banners"
on public.banners for all
using (true) with check (true);

drop policy if exists "Service role full access coupons" on public.coupons;
create policy "Service role full access coupons"
on public.coupons for all
using (true) with check (true);

drop policy if exists "Service role full access customers" on public.customers;
create policy "Service role full access customers"
on public.customers for all
using (true) with check (true);

drop policy if exists "Service role full access orders" on public.orders;
create policy "Service role full access orders"
on public.orders for all
using (true) with check (true);

drop policy if exists "Service role full access order_items" on public.order_items;
create policy "Service role full access order_items"
on public.order_items for all
using (true) with check (true);

drop policy if exists "Service role full access admins" on public.admins;
create policy "Service role full access admins"
on public.admins for all
using (true) with check (true);

drop policy if exists "Service role full access admin_audit" on public.admin_audit;
create policy "Service role full access admin_audit"
on public.admin_audit for all
using (true) with check (true);


-- ============================================================================
-- COUCHKRAFT: PRODUCT CUSTOMIZATION & BESPOKE WHATSAPP REQUESTS MIGRATION
-- ============================================================================

-- 1. Add customization_options JSONB column to public.products if not exists
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS customization_options jsonb DEFAULT '{}'::jsonb;

-- 2. Create public.custom_requests table for bespoke enquiries
CREATE TABLE IF NOT EXISTS public.custom_requests (
    id text PRIMARY KEY,
    customer_id text,
    customer_name text NOT NULL,
    customer_email text,
    customer_phone text NOT NULL,
    product_id text,
    product_name text,
    product_url text,
    seating_capacity text,
    dimensions jsonb DEFAULT '{}'::jsonb,
    material text,
    fabric text,
    color text,
    budget text,
    notes text,
    status text DEFAULT 'new', -- 'new', 'under_review', 'quoted', 'approved', 'archived'
    admin_notes text DEFAULT '',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on custom_requests
ALTER TABLE public.custom_requests ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow public insert of custom requests" ON public.custom_requests;
    CREATE POLICY "Allow public insert of custom requests" 
    ON public.custom_requests FOR INSERT 
    WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for authenticated/service on custom requests" ON public.custom_requests;
    CREATE POLICY "Allow all for authenticated/service on custom requests" 
    ON public.custom_requests FOR ALL 
    USING (true);
END $$;

-- 3. Create public.store_settings table
CREATE TABLE IF NOT EXISTS public.store_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow public read of store settings" ON public.store_settings;
    CREATE POLICY "Allow public read of store settings" 
    ON public.store_settings FOR SELECT 
    USING (true);

    DROP POLICY IF EXISTS "Allow all for authenticated/service on store settings" ON public.store_settings;
    CREATE POLICY "Allow all for authenticated/service on store settings" 
    ON public.store_settings FOR ALL 
    USING (true);
END $$;

-- Seed default WhatsApp concierge settings if not yet present
INSERT INTO public.store_settings (key, value)
VALUES (
    'whatsapp',
    '{"businessPhone": "+91 63607 04340", "businessName": "CouchKraft Bespoke Concierge", "enabled": true, "leadTimeWeeks": 4}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
