alter table public.products
  add column if not exists extra_discount_type text;

comment on column public.products.extra_discount_type is
  'Storefront label when festive_discount_percent > 0: festive | standard';