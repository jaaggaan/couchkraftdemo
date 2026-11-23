-- CouchKraft: on paid / COD confirm, decrement RTS stock and roll up units_sold + revenue per product line.

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
  line_qty integer;
  line_total numeric;
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
    line_qty := greatest(coalesce((item->>'quantity')::integer, 1), 1);
    line_total := line_qty * coalesce((item->>'unitPrice')::numeric, 0);

    update public.products
       set ready_to_ship_stock = case
             when coalesce(made_to_order, true) = false then
               greatest(coalesce(ready_to_ship_stock, 0) - line_qty, 0)
             else ready_to_ship_stock
           end,
           units_sold = coalesce(units_sold, 0) + line_qty,
           revenue = coalesce(revenue, 0) + line_total,
           updated_at = now()
     where id = item->>'productId';
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
  line_qty integer;
  line_total numeric;
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
    line_qty := greatest(coalesce((item->>'quantity')::integer, 1), 1);
    line_total := line_qty * coalesce((item->>'unitPrice')::numeric, 0);

    update public.products
       set ready_to_ship_stock = case
             when coalesce(made_to_order, true) = false then
               greatest(coalesce(ready_to_ship_stock, 0) - line_qty, 0)
             else ready_to_ship_stock
           end,
           units_sold = coalesce(units_sold, 0) + line_qty,
           revenue = coalesce(revenue, 0) + line_total,
           updated_at = now()
     where id = item->>'productId';
  end loop;

  return to_jsonb(updated_order);
end;
$$;

revoke all on function public.mark_order_paid_transaction(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.mark_order_cash_transaction(text, text, text) from public, anon, authenticated;
grant execute on function public.mark_order_paid_transaction(text, text, text, text, text, text) to service_role;
grant execute on function public.mark_order_cash_transaction(text, text, text) to service_role;