alter table public.products
  add column if not exists festive_discount_percent integer default 0;

comment on column public.products.festive_discount_percent is
  'Extra percent off selling price (1–100). 0 = no festive/additional discount.';