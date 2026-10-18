-- ============================================================================
-- COUCHKRAFT SUPABASE MIGRATION: 20261014120001_fix_database_security.sql
-- Description: Revoke overly permissive anon write policies and enforce 
--              strict Row Level Security (RLS) for storefront, customer and admin.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DROP OVERLY PERMISSIVE WILDCARD WRITE POLICIES
-- ----------------------------------------------------------------------------
drop policy if exists "Allow all operations on categories" on public.categories;
drop policy if exists "Allow all operations on products" on public.products;
drop policy if exists "Allow all operations on banners" on public.banners;
drop policy if exists "Allow all operations on coupons" on public.coupons;
drop policy if exists "Allow all operations on customers" on public.customers;
drop policy if exists "Allow all operations on orders" on public.orders;
drop policy if exists "Allow all operations on admins" on public.admins;
drop policy if exists "Allow all operations on admin_audit" on public.admin_audit;

-- ----------------------------------------------------------------------------
-- 2. ENABLE RLS ON ALL TABLES (INCLUDING ORDER_ITEMS)
-- ----------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.banners enable row level security;
alter table public.coupons enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.admins enable row level security;
alter table public.admin_audit enable row level security;

-- ----------------------------------------------------------------------------
-- 3. PUBLIC READ ACCESS (CATALOGUE & MARKETING CONTENT ONLY)
-- ----------------------------------------------------------------------------
-- Public catalogue read
create policy "Public can read categories"
on public.categories for select
using (true);

-- Public can only view published products in catalogue
create policy "Public can read published products"
on public.products for select
using (status = 'published');

-- Public can read active promotional banners
create policy "Public can read active banners"
on public.banners for select
using (active = true);

-- Public can query active coupons by code
create policy "Public can view active coupons"
on public.coupons for select
using (active = true and (end_date is null or end_date > now()));

-- ----------------------------------------------------------------------------
-- 4. CUSTOMER PROFILE & ORDER SECURITY
-- ----------------------------------------------------------------------------
-- Customers can view their own profile (Supabase auth or backend session)
create policy "Customers can view their own record"
on public.customers for select
using (auth.uid()::text = id or auth.jwt()->>'sub' = id);

create policy "Customers can update their own record"
on public.customers for update
using (auth.uid()::text = id or auth.jwt()->>'sub' = id)
with check (auth.uid()::text = id or auth.jwt()->>'sub' = id);

-- Customers can view their own orders
create policy "Customers can read own orders"
on public.orders for select
using (
  customer_id is not null 
  and (auth.uid()::text = customer_id or auth.jwt()->>'sub' = customer_id)
);

-- Customers can view items belonging to their own orders
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

-- ----------------------------------------------------------------------------
-- 5. SERVICE ROLE & ADMIN API ACCESS
-- ----------------------------------------------------------------------------
-- CouchKraft backend API handlers (Vite dev middleware & Vercel serverless)
-- execute critical mutations (checkout, order payment, audit logging, admin CMS)
-- with service credentials.
-- Grant full access to service_role on all operational tables:
create policy "Service role full access categories"
on public.categories for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access products"
on public.products for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access banners"
on public.banners for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access coupons"
on public.coupons for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access customers"
on public.customers for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access orders"
on public.orders for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access order_items"
on public.order_items for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access admins"
on public.admins for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "Service role full access admin_audit"
on public.admin_audit for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
