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
