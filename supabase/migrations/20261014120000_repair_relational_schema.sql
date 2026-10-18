-- ============================================================================
-- COUCHKRAFT SUPABASE MIGRATION: 20261014120000_repair_relational_schema.sql
-- Description: Establish relational integrity, foreign keys, backfills, 
--              and normalized order_items table.
-- ============================================================================

-- Enable pgcrypto for UUID generation if needed
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. CATEGORIES -> PRODUCTS RELATIONSHIP
-- ----------------------------------------------------------------------------

-- Add category_id column if it doesn't exist
alter table public.products 
add column if not exists category_id text;

-- Backfill category_id by matching existing category text or fallback
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

-- For any remaining products without a matched category, assign to default cat_sofas
update public.products
set category_id = 'cat_sofas'
where category_id is null;

-- Ensure category_id is not null now that it is backfilled
alter table public.products 
alter column category_id set not null;

-- Add foreign key constraint
alter table public.products
drop constraint if exists fk_products_category,
add constraint fk_products_category
  foreign key (category_id)
  references public.categories(id)
  on update cascade
  on delete restrict;

-- Index for category lookups
create index if not exists idx_products_category_id 
on public.products(category_id);


-- ----------------------------------------------------------------------------
-- 2. CUSTOMERS -> ORDERS RELATIONSHIP
-- ----------------------------------------------------------------------------

-- Clean up any invalid or orphaned customer_ids in orders (set to null to preserve historical guest orders)
update public.orders
set customer_id = null
where customer_id is not null
  and customer_id not in (select id from public.customers);

-- Add foreign key constraint (nullable to support guest checkouts and preservation on customer delete)
alter table public.orders
drop constraint if exists fk_orders_customer,
add constraint fk_orders_customer
  foreign key (customer_id)
  references public.customers(id)
  on update cascade
  on delete set null;

-- Index for customer order history
create index if not exists idx_orders_customer_id 
on public.orders(customer_id);


-- ----------------------------------------------------------------------------
-- 3. COUPONS -> ORDERS RELATIONSHIP
-- ----------------------------------------------------------------------------

-- Add coupon_id column to orders
alter table public.orders 
add column if not exists coupon_id text;

-- Map existing coupon code text in orders to coupons table
update public.orders o
set coupon_id = c.id
from public.coupons c
where o.coupon_id is null
  and o.coupon is not null
  and upper(trim(o.coupon)) = upper(trim(c.code));

-- Add foreign key constraint (on delete set null preserves order totals even if a coupon code expires)
alter table public.orders
drop constraint if exists fk_orders_coupon,
add constraint fk_orders_coupon
  foreign key (coupon_id)
  references public.coupons(id)
  on update cascade
  on delete set null;

-- Index for coupon usage tracking
create index if not exists idx_orders_coupon_id 
on public.orders(coupon_id);


-- ----------------------------------------------------------------------------
-- 4. ADMINS -> AUDIT LOGS RELATIONSHIP
-- ----------------------------------------------------------------------------

-- Assign any historical unlinked audit logs to default admin
update public.admin_audit
set admin_id = (select id from public.admins order by created_at asc limit 1)
where admin_id not in (select id from public.admins);

-- Add foreign key constraint
alter table public.admin_audit
drop constraint if exists fk_admin_audit_admin,
add constraint fk_admin_audit_admin
  foreign key (admin_id)
  references public.admins(id)
  on update cascade
  on delete cascade;

-- Index for admin audit trails
create index if not exists idx_admin_audit_admin_id 
on public.admin_audit(admin_id);

create index if not exists idx_admin_audit_created_at 
on public.admin_audit(created_at desc);


-- ----------------------------------------------------------------------------
-- 5. ORDERS -> ORDER ITEMS -> PRODUCTS RELATIONSHIP
-- ----------------------------------------------------------------------------

-- Create normalized order_items table
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

-- Indexes for fast order retrieval and product sales analytics
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);

-- Migrate existing JSON array in orders.items to normalized order_items rows
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
