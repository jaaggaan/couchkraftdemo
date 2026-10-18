-- ============================================================================
-- COUCHKRAFT SUPABASE PRODUCTION DATABASE SCHEMA
-- Project: https://qzpnxxlwlphxdcdlbiph.supabase.co
-- Generated for CouchKraft Bespoke Furniture
-- ============================================================================

-- Enable pgcrypto extension for UUIDs and hashing
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. CATEGORIES TABLE
-- ============================================================================
create table if not exists public.categories (
    id text primary key,
    name text not null,
    slug text not null unique,
    sub_classifications jsonb default '[]'::jsonb,
    description text default '',
    image text default '',
    product_count integer default 0,
    created_at timestamptz default now()
);

-- ============================================================================
-- 2. PRODUCTS TABLE
-- ============================================================================
create table if not exists public.products (
    id text primary key,
    slug text not null unique,
    name text not null,
    sku text not null,
    price numeric(12, 2) not null default 0,
    compare_at numeric(12, 2) default 0,
    gst_slab text default '18% GST (Standard Furniture)',
    hsn_code text default '9403 6000',
    category text not null,
    sub_category text default 'Standard',
    space text not null default 'living',
    tabs jsonb default '["bestsellers"]'::jsonb,
    short_excerpt text default '',
    description text default '',
    images jsonb default '[]'::jsonb,
    video_url text default '',
    finishes jsonb default '["Standard"]'::jsonb,
    color_swatches jsonb default '[]'::jsonb,
    care text default '',
    dimensions jsonb default '{"width": 200, "depth": 90, "height": 80, "seatHeight": 42}'::jsonb,
    net_weight text default '',
    seating_capacity text default '',
    warranty text default '5 Years Structural Frame',
    structural_wood text default 'Kiln-dried Teak & Sheesham Hardwood',
    foam_upholstery text default '38-Density Ultra-Cell Foam + Belgian Linen Blend',
    ready_to_ship_stock integer default 0,
    low_stock_threshold integer default 2,
    made_to_order boolean default true,
    lead_time_weeks integer default 3,
    customization_enabled boolean default true,
    customization_tolerance_cm integer default 15,
    allow_com_upholstery boolean default true,
    meta_title text default '',
    meta_description text default '',
    status text default 'published',
    units_sold integer default 0,
    revenue numeric(14, 2) default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ============================================================================
-- 3. PROMOTIONAL BANNERS TABLE
-- ============================================================================
create table if not exists public.banners (
    id text primary key,
    title text not null,
    subtitle text default '',
    desktop_image text not null,
    mobile_image text default '',
    cta_label text default 'Shop the Collection',
    cta_url text default '/shop',
    badge text default 'NEW COLLECTION',
    alignment text default 'right',
    tone text default 'dark',
    space text default 'living',
    active boolean default true,
    display_order integer default 1,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ============================================================================
-- 4. COUPONS TABLE
-- ============================================================================
create table if not exists public.coupons (
    id text primary key,
    code text not null unique,
    type text not null default 'percent',
    value numeric(10, 2) not null,
    min_order_value numeric(10, 2) default 0,
    max_discount numeric(10, 2),
    start_date timestamptz default now(),
    end_date timestamptz,
    usage_limit integer,
    used_count integer default 0,
    active boolean default true,
    description text default '',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ============================================================================
-- 5. CUSTOMERS TABLE
-- ============================================================================
create table if not exists public.customers (
    id text primary key,
    name text not null,
    email text not null unique,
    phone text default '',
    password_hash text not null,
    email_verified boolean default false,
    verify_token text,
    reset_token text,
    reset_expires bigint,
    addresses jsonb default '[]'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ============================================================================
-- 6. ORDERS TABLE
-- ============================================================================
create table if not exists public.orders (
    id text primary key,
    number text not null unique,
    customer_id text,
    items jsonb not null default '[]'::jsonb,
    address jsonb,
    coupon text,
    subtotal numeric(12, 2) not null default 0,
    discount numeric(12, 2) default 0,
    shipping numeric(12, 2) default 0,
    tax numeric(12, 2) default 0,
    total numeric(12, 2) not null default 0,
    payment_method text not null default 'razorpay',
    payment_status text not null default 'pending',
    fulfilment_status text not null default 'placed',
    razorpay_order_id text,
    razorpay_payment_id text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ============================================================================
-- 7. ADMIN USERS TABLE
-- ============================================================================
create table if not exists public.admins (
    id text primary key,
    name text not null,
    email text not null unique,
    role text not null default 'owner',
    avatar_url text,
    password_hash text not null,
    created_at timestamptz default now(),
    last_login_at timestamptz
);

-- ============================================================================
-- 8. ADMIN AUDIT LOGS TABLE
-- ============================================================================
create table if not exists public.admin_audit (
    id text primary key,
    admin_id text not null,
    admin_name text not null,
    action text not null,
    target_type text not null,
    target_id text,
    details jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.banners enable row level security;
alter table public.coupons enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.admins enable row level security;
alter table public.admin_audit enable row level security;

-- Public READ access for storefront
create policy "Allow public read categories" on public.categories for select using (true);
create policy "Allow public read products" on public.products for select using (true);
create policy "Allow public read banners" on public.banners for select using (true);
create policy "Allow public read active coupons" on public.coupons for select using (true);

-- Permissive write policies for API and Admin operations using anon key
create policy "Allow all operations on categories" on public.categories for all using (true) with check (true);
create policy "Allow all operations on products" on public.products for all using (true) with check (true);
create policy "Allow all operations on banners" on public.banners for all using (true) with check (true);
create policy "Allow all operations on coupons" on public.coupons for all using (true) with check (true);
create policy "Allow all operations on customers" on public.customers for all using (true) with check (true);
create policy "Allow all operations on orders" on public.orders for all using (true) with check (true);
create policy "Allow all operations on admins" on public.admins for all using (true) with check (true);
create policy "Allow all operations on admin_audit" on public.admin_audit for all using (true) with check (true);

-- ============================================================================
-- SEED INITIAL DATA
-- ============================================================================

-- Seed Categories
insert into public.categories (id, name, slug, sub_classifications, description, image, product_count)
values
('cat_sofas', 'Living Room > Sofas & Couches', 'sofas-and-couches', '["3-Seater Sofas", "Sectionals & L-Shapes", "Chesterfield Sofas", "Modular Loungers"]'::jsonb, 'Artisanal sofas crafted from kiln-dried hardwood and organic Belgian fabrics.', 'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=600&q=80', 1),
('cat_chairs', 'Bedroom > Lounge Chairs', 'lounge-chairs', '["Accent Chairs", "Recliners", "Rocking Chairs"]'::jsonb, 'Sculptural seating designed for quiet reading and relaxed conversation.', 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=600&q=80', 1),
('cat_storage', 'Dining > Benches & Storage', 'benches-and-storage', '["Sideboards", "Credenzas", "Dining Benches"]'::jsonb, 'Minimalist wooden storage units with architectural proportions.', 'https://images.unsplash.com/photo-1611967164521-abae8fba4668?auto=format&fit=crop&w=600&q=80', 1),
('cat_accent', 'Study > Accent Seating', 'accent-seating', '["Daybeds", "Ottomans", "Chaise Lounges"]'::jsonb, 'Versatile handcrafted accent daybeds and sloped seating.', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80', 1)
on conflict (id) do nothing;

-- Seed Arden Three-Seater Sofa
insert into public.products (
    id, slug, name, sku, price, compare_at, gst_slab, hsn_code, category, sub_category, space, tabs,
    short_excerpt, description, images, video_url, finishes, color_swatches, care,
    dimensions, net_weight, seating_capacity, warranty, structural_wood, foam_upholstery,
    ready_to_ship_stock, low_stock_threshold, made_to_order, lead_time_weeks,
    customization_enabled, customization_tolerance_cm, allow_com_upholstery,
    meta_title, meta_description, status, units_sold, revenue
) values (
    'ck-arden-sofa',
    'arden-three-seater-sofa',
    'Arden Three-Seater Sofa',
    'CK-SOF-001',
    78000,
    95000,
    '18% GST (Standard Furniture)',
    '9403 6000',
    'Living Room > Sofas & Couches',
    '3-Seater Sofas',
    'living',
    '["bestsellers", "classics", "sets"]'::jsonb,
    'Clean mid-century lines wrapped in natural woven textures. Ergonomic sloped cushions sculpted over sustainably sourced teakwood.',
    'The Arden Sofa embodies our philosophy of quiet luxury. Engineered for longevity, the structure integrates hand-carved kiln-dried teakwood arms with a supportive serpentine spring assembly. The cushions are enveloped in Belgian-milled linen blend fabric, resistant to piling and softly textured to the touch.

Every silhouette line is smoothed to architectural perfection, delivering a calm presence in both light-drenched contemporary apartments and storied traditional residences.',
    '["https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    'https://youtube.com/watch?v=couchkraft-arden-craft',
    '["Cream bouclé", "Warm oat linen", "Charcoal weave"]'::jsonb,
    '[
        {"name": "Terracotta Rust", "hex": "#B35438", "skuCode": "SKU-TRC", "active": true},
        {"name": "Warm Ivory", "hex": "#E8DFC9", "skuCode": "SKU-WIV", "active": true},
        {"name": "Olive Green", "hex": "#5D6B57", "skuCode": "SKU-OLV", "active": true},
        {"name": "Muted Taupe", "hex": "#9C8F84", "skuCode": "SKU-MTP", "active": true}
    ]'::jsonb,
    'Vacuum gently with soft brush. Spot clean with dry solvent cleaner.',
    '{"width": 215, "depth": 92, "height": 84, "seatHeight": 44}'::jsonb,
    '58 kg',
    '3 Persons (Max 360 kg)',
    '5 Years Structural Frame',
    'Kiln-dried Teak & Sheesham Hardwood',
    '38-Density Ultra-Cell Foam + Belgian Linen Blend',
    8,
    2,
    true,
    3,
    true,
    15,
    true,
    'Arden Three-Seater Sofa | CouchKraft Bespoke Teak Living',
    'Buy the handcrafted Arden Three-Seater Sofa at CouchKraft. Solid kiln-dried teakwood frame wrapped in organic linen upholstery. Handcrafted in India with white-glove delivery.',
    'published',
    24,
    1872000
) on conflict (id) do nothing;

-- Seed Other Products (Luma Chair, Nordic Sideboard, Solene Daybed)
insert into public.products (
    id, slug, name, sku, price, compare_at, gst_slab, hsn_code, category, sub_category, space, tabs,
    short_excerpt, description, images, finishes, color_swatches, care,
    ready_to_ship_stock, low_stock_threshold, status, units_sold, revenue
) values
(
    'ck-luma-chair',
    'luma-lounge-chair',
    'Luma Lounge Chair',
    'CK-CHR-002',
    42000,
    52000,
    '18% GST (Standard Furniture)',
    '9403 6000',
    'Bedroom > Lounge Chairs',
    'Accent Chairs',
    'lounge',
    '["bestsellers", "new"]'::jsonb,
    'An open oak frame with a deep, cushioned seat. Designed for reading, conversation and the slower hours.',
    'An open oak frame with a deep, cushioned seat. Designed for reading, conversation and the slower hours of the day.',
    '["https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    '["Natural oak", "Walnut stain"]'::jsonb,
    '[
        {"name": "Natural Oak", "hex": "#D2B48C", "skuCode": "SKU-NAT", "active": true},
        {"name": "Warm Oat", "hex": "#E5D3B3", "skuCode": "SKU-OAT", "active": true}
    ]'::jsonb,
    'Dust the frame with a dry cloth. Keep out of prolonged direct sun.',
    4, 2, 'published', 18, 756000
),
(
    'ck-nordic-sideboard',
    'nordic-walnut-sideboard',
    'Nordic Walnut Sideboard',
    'CK-STG-003',
    98000,
    115000,
    '18% GST (Standard Furniture)',
    '9403 6000',
    'Dining > Benches & Storage',
    'Sideboards',
    'living',
    '["bestsellers", "classics"]'::jsonb,
    'A three-drawer walnut sideboard with a quiet grain and a low, architectural profile.',
    'A three-drawer walnut sideboard with a quiet grain and a low, architectural profile. Storage that reads as furniture, not cabinetry.',
    '["https://images.unsplash.com/photo-1611967164521-abae8fba4668?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    '["Walnut"]'::jsonb,
    '[
        {"name": "Rich Walnut", "hex": "#5C4033", "skuCode": "SKU-WLN", "active": true}
    ]'::jsonb,
    'Wipe with a slightly damp cloth. Use coasters on the top surface.',
    3, 1, 'published', 9, 882000
),
(
    'ck-solene-daybed',
    'solene-upholstered-daybed',
    'Solene Upholstered Daybed',
    'CK-DYB-004',
    89000,
    108000,
    '18% GST (Standard Furniture)',
    '9403 6000',
    'Study > Accent Seating',
    'Daybeds',
    'bedroom',
    '["new", "classics"]'::jsonb,
    'A slender daybed in oatmeal linen. Equally at home as a sofa or a quiet place to rest.',
    'A slender daybed in oatmeal linen. Equally at home as a sofa, a guest bed or a quiet place to rest by a window.',
    '["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
    '["Oatmeal linen", "Forest velvet"]'::jsonb,
    '[
        {"name": "Warm Oat", "hex": "#E5D3B3", "skuCode": "SKU-OAT", "active": true},
        {"name": "Forest Green", "hex": "#2D4B39", "skuCode": "SKU-FST", "active": true}
    ]'::jsonb,
    'Spot clean fabric with gentle water-free foam.',
    2, 1, 'published', 7, 623000
) on conflict (id) do nothing;

-- Seed Banners
insert into public.banners (id, title, subtitle, desktop_image, mobile_image, cta_label, cta_url, badge, alignment, tone, space, active, display_order)
values
('banner_living', 'In soft sculpture', 'A quiet oak frame and generous bouclé contours that belong in a sunlit living room.', '/hero-living-hd.jpg', '/hero-living-scene.jpg', 'Shop the Collection', '/shop?space=living', 'NEW COLLECTION 2026', 'right', 'dark', 'living', true, 1),
('banner_dining', 'Gather beautifully', 'Solid teakwood dining centerpieces engineered for generational memory.', '/hero-dining-hd.jpg', '/hero-dining.jpg', 'Explore Dining', '/shop?space=dining', 'EDITORIAL FEATURE', 'left', 'dark', 'dining', true, 2),
('banner_lounge', 'A quieter kind of comfort', 'Deep sloped seats contoured around sustainably sourced Sheesham wood.', '/hero-lounge-hd.jpg', '/hero-lounge.jpg', 'Discover Lounge', '/shop?space=lounge', 'BESTSELLER', 'right', 'dark', 'lounge', true, 3)
on conflict (id) do nothing;

-- Seed Coupons
insert into public.coupons (id, code, type, value, min_order_value, max_discount, usage_limit, used_count, active, description)
values
('coup_warm10', 'WARM10', 'percent', 10, 20000, 15000, 500, 38, true, '10% off on all living and lounge handcrafted silhouettes.'),
('coup_festive15', 'FESTIVE15', 'percent', 15, 50000, 25000, 200, 14, true, 'Special Diwali & Festive season tier discount.'),
('coup_welcome5k', 'WELCOME5000', 'flat', 5000, 75000, null, 1000, 82, true, '₹5,000 off on first bespoke order above ₹75,000.')
on conflict (id) do nothing;

-- Seed Default Admin: Devang V. (Password: Admin@CouchKraft2026!)
insert into public.admins (id, name, email, role, avatar_url, password_hash)
values (
    'admin_devang_01',
    'Devang V.',
    'admin@couchkraft.in',
    'owner',
    'https://lh3.googleusercontent.com/aida/AEtjO1U-jXIhz33Xm08EzyafM8zL58IucpUMfP_Uh1YjU7Bi3wHrNQLs_txrVhHARZ6fMZPpH69tTPUfE_mPEjtFOE7OihQThW0QwICxknNz6Q7mmF1Nzx-x0RQwMIINjOpPvR3iUbX_vOzhimZkLpt5w2RoZrjMdNWGZ69QaRY6F0GIdBzDlqMCsc051Q9nBcvuMDDddNABcdnl2rGXeKcvFZg2i7uVDpVufulCakZsWBY5gkfz4L1MU8ClZ38C9fWHlAGysG2z9OHbSmQ',
    '$2a$10$iTz8iP9aQ1tIeQd7JkO1r.yXk9yqg6l2f3n3U1h3v7v1o1p9c8z1e'
) on conflict (id) do nothing;
