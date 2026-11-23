# CouchKraft inventory playbook (admin)

CouchKraft uses **per-product** inventory — not warehouse bins or variant SKUs.

## Two modes

| Mode | Admin setting | Storefront behaviour | Stock on payment |
|------|---------------|---------------------|------------------|
| **Made to order (MTO)** | **Made to order** checked (default) | Unlimited quantity; lead time shown | Not decremented |
| **Ready to ship (RTS)** | **Made to order** unchecked + **Units in stock** set | Out-of-stock / low-stock badges; cart capped | Decremented after pay or COD confirm |

## Operating rules

1. **Catalogue & customs** — Keep **Made to order** on. Stock fields are ignored; you can leave units at 0.
2. **Display pieces & clearance** — Turn **Made to order** off. Set **Units in stock** and **Low-stock alert** (e.g. 2).
3. After receiving shipment or a floor sale, use **Admin → Inventory** for quick stock edits.
4. Stock is **not reserved** in the cart; checkout re-validates availability before payment.

## Where to edit

- **Products → edit → Stock & delivery** — full control per SKU
- **Inventory** — bulk stock, filters (in / low / out / MTO)

## Database

Apply migrations:

- `supabase/migrations/20261111210000_order_persistence_rpc.sql` — orders + payment RPCs
- `supabase/migrations/20261118210000_inventory_units_sold_on_pay.sql` — RTS decrement + `units_sold` / `revenue` roll-up

Verify deployed RPCs:

```bash
npm run verify:inventory
```

With live Supabase credentials in `.env` (and optional `COUCHKRAFT_INVENTORY_VERIFY=1` for a safe RTS decrement smoke test).