-- CouchKraft order persistence and payment lifecycle
-- Apply manually after reviewing the deployed schema. This file is not executed by the application.

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

create or replace function public.create_order_transaction(
  p_customer jsonb,
  p_order jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_order public.orders;
  created_order public.orders;
  item jsonb;
  item_index integer := 0;
begin
  select *
    into existing_order
    from public.orders
   where checkout_key = p_order->>'checkout_key'
   limit 1
   for update;

  if existing_order.id is not null then
    return to_jsonb(existing_order);
  end if;

  insert into public.customers (
    id,
    name,
    email,
    phone,
    password_hash,
    email_verified,
    addresses,
    created_at,
    updated_at
  )
  values (
    p_customer->>'id',
    p_customer->>'name',
    p_customer->>'email',
    coalesce(p_customer->>'phone', ''),
    coalesce(p_customer->>'password_hash', 'synced_customer'),
    coalesce((p_customer->>'email_verified')::boolean, true),
    coalesce(p_customer->'addresses', '[]'::jsonb),
    coalesce((p_customer->>'created_at')::timestamptz, now()),
    now()
  )
  on conflict (id) do update set
    name = excluded.name,
    phone = excluded.phone,
    email_verified = excluded.email_verified,
    addresses = excluded.addresses,
    updated_at = now();

  begin
    insert into public.orders (
      id,
      number,
      customer_id,
      items,
      address,
      contact,
      coupon,
      checkout_key,
      subtotal,
      discount,
      shipping,
      tax,
      total,
      payment_method,
      payment_status,
      fulfilment_status,
      razorpay_order_id,
      razorpay_payment_id,
      created_at,
      updated_at
    )
    values (
      p_order->>'id',
      p_order->>'number',
      p_customer->>'id',
      coalesce(p_order->'items', '[]'::jsonb),
      p_order->'address',
      p_order->'contact',
      p_order->>'coupon',
      p_order->>'checkout_key',
      coalesce((p_order->>'subtotal')::numeric, 0),
      coalesce((p_order->>'discount')::numeric, 0),
      0,
      0,
      coalesce((p_order->>'total')::numeric, 0),
      coalesce(p_order->>'payment_method', 'razorpay'),
      coalesce(p_order->>'payment_status', 'pending'),
      coalesce(p_order->>'fulfilment_status', 'placed'),
      p_order->>'razorpay_order_id',
      p_order->>'razorpay_payment_id',
      coalesce((p_order->>'created_at')::timestamptz, now()),
      now()
    )
    returning * into created_order;
  exception
    when unique_violation then
      select *
        into existing_order
        from public.orders
       where checkout_key = p_order->>'checkout_key'
       limit 1
       for update;

      if existing_order.id is not null then
        return to_jsonb(existing_order);
      end if;

      raise;
  end;

  for item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    insert into public.order_items (
      id,
      order_id,
      product_id,
      quantity,
      price_at_purchase,
      product_name_snapshot,
      product_sku_snapshot,
      variant_details
    )
    values (
      'item_' || created_order.id || '_' || item_index,
      created_order.id,
      item->>'productId',
      greatest(coalesce((item->>'quantity')::integer, 1), 1),
      greatest(coalesce((item->>'unitPrice')::numeric, 0), 0),
      coalesce(item->>'name', 'Artisanal Piece'),
      coalesce(item->>'productId', ''),
      jsonb_build_object(
        'finish', item->>'finish',
        'customization', item->'customization'
      )
    )
    on conflict (id) do nothing;
    item_index := item_index + 1;
  end loop;

  return to_jsonb(created_order);
end;
$$;

create or replace function public.mark_order_paid_transaction(
  p_order_id text,
  p_customer_id text,
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_payment_method text,
  p_delivery_method text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.orders;
  updated_order public.orders;
  item jsonb;
begin
  select *
    into current_order
    from public.orders
   where id = p_order_id
     and customer_id = p_customer_id
   for update;

  if current_order.id is null then
    return null;
  end if;

  if nullif(trim(p_razorpay_order_id), '') is null
     or nullif(trim(p_razorpay_payment_id), '') is null
     or current_order.razorpay_order_id is distinct from p_razorpay_order_id then
    return null;
  end if;

  if current_order.payment_status = 'paid'
     and current_order.razorpay_payment_id is distinct from p_razorpay_payment_id then
    return null;
  end if;

  if current_order.payment_status = 'paid' then
    return to_jsonb(current_order);
  end if;

  update public.orders
     set payment_status = 'paid',
         fulfilment_status = case
           when fulfilment_status = 'placed' then 'confirmed'
           else fulfilment_status
         end,
         razorpay_payment_id = p_razorpay_payment_id,
         payment_method = coalesce(p_payment_method, 'razorpay'),
         delivery_method = p_delivery_method,
         tracking_number = coalesce(
           tracking_number,
           'CKTRK' || right(regexp_replace(number, '\D', '', 'g'), 6) || right(id, 4)
         ),
         payment_error = null,
         updated_at = now()
   where id = current_order.id
  returning * into updated_order;

  for item in select value from jsonb_array_elements(coalesce(updated_order.items, '[]'::jsonb))
  loop
    update public.products
       set ready_to_ship_stock = greatest(
         coalesce(ready_to_ship_stock, 0) - greatest(coalesce((item->>'quantity')::integer, 1), 1),
         0
       ),
           updated_at = now()
     where id = item->>'productId'
       and coalesce(made_to_order, true) = false;
  end loop;

  return to_jsonb(updated_order);
end;
$$;

create or replace function public.mark_order_cash_transaction(
  p_order_id text,
  p_customer_id text,
  p_razorpay_order_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.orders;
  updated_order public.orders;
  item jsonb;
begin
  select *
    into current_order
    from public.orders
   where id = p_order_id
     and customer_id = p_customer_id
   for update;

  if current_order.id is null
     or current_order.razorpay_order_id is distinct from p_razorpay_order_id then
    return null;
  end if;

  if current_order.delivery_method is not null then
    return to_jsonb(current_order);
  end if;

  update public.orders
     set payment_status = 'pending',
         payment_method = 'cash',
         fulfilment_status = case
           when fulfilment_status = 'placed' then 'confirmed'
           else fulfilment_status
         end,
         delivery_method = 'Cash on delivery',
         tracking_number = coalesce(
           tracking_number,
           'CKTRK' || right(regexp_replace(number, '\D', '', 'g'), 6) || right(id, 4)
         ),
         updated_at = now()
   where id = current_order.id
  returning * into updated_order;

  for item in select value from jsonb_array_elements(coalesce(updated_order.items, '[]'::jsonb))
  loop
    update public.products
       set ready_to_ship_stock = greatest(
         coalesce(ready_to_ship_stock, 0) - greatest(coalesce((item->>'quantity')::integer, 1), 1),
         0
       ),
           updated_at = now()
     where id = item->>'productId'
       and coalesce(made_to_order, true) = false;
  end loop;

  return to_jsonb(updated_order);
end;
$$;

revoke all on function public.create_order_transaction(jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.mark_order_paid_transaction(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.mark_order_cash_transaction(text, text, text) from public, anon, authenticated;
grant execute on function public.create_order_transaction(jsonb, jsonb, jsonb) to service_role;
grant execute on function public.mark_order_paid_transaction(text, text, text, text, text, text) to service_role;
grant execute on function public.mark_order_cash_transaction(text, text, text) to service_role;
