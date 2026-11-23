-- Placeholder catalog row so bespoke commission orders satisfy order_items.product_id FK.

insert into public.products (
  id,
  slug,
  name,
  sku,
  price,
  category,
  category_id,
  space,
  description,
  images,
  finishes,
  status,
  made_to_order,
  ready_to_ship_stock
)
values (
  'prod_bespoke_commission',
  'bespoke-commission',
  'Bespoke atelier commission',
  'CK-BESPOKE',
  0,
  'Custom',
  'cat_sofas',
  'living',
  'Internal line item for custom request commission payments. Not sold on the storefront.',
  '[]'::jsonb,
  '["Atelier commission"]'::jsonb,
  'archived',
  true,
  0
)
on conflict (id) do update set
  name = excluded.name,
  category_id = excluded.category_id,
  status = excluded.status,
  made_to_order = excluded.made_to_order;