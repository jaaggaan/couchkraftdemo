# CouchKraft

Premium furniture storefront and administration portal for [CouchKraft](https://couchkraft.in).

The project includes a React storefront, a separate admin portal, a Vercel API, Supabase PostgreSQL persistence, customer authentication and a Razorpay/demo checkout flow. Cart and wishlist state remain device-local; orders are persisted server-side in Supabase.

## Run locally

```bash
cd "couch kraft"
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Demo coupon

Use `WARM10` in the bag for a 10% demonstration discount. It is not a live offer.

## Server configuration

The API requires `SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY`. Never expose
the service-role key through browser code or a `VITE_*` variable. Apply the order persistence
migration in `supabase/migrations/20261111210000_order_persistence_rpc.sql` and the inventory
rollup migration in `supabase/migrations/20261118210000_inventory_units_sold_on_pay.sql`
before enabling production checkout.

Inventory (MTO vs ready-to-ship) is documented in `docs/INVENTORY_PLAYBOOK.md`. After
migrations are applied, run `npm run verify:inventory` (optional live RTS smoke test:
`COUCHKRAFT_INVENTORY_VERIFY=1`).

## Verified contact

Address, phone and email in the footer and contact page are taken from couchkraft.in.

## Deploy to Vercel

Storefront (`/`), admin (`/admin`), and API (`/api/*`) ship as one project. See **`docs/VERCEL_DEPLOY.md`** for migrations, environment variables, and smoke tests.
