# Deploy CouchKraft to Vercel (storefront + admin + API)

One Vercel project serves:

| URL | What |
|-----|------|
| `/` | Customer storefront (`dist/`) |
| `/admin` | Admin SPA (`dist/admin/`) |
| `/api/*` | Node serverless function (`api/index.js`) |

Both portals share the **same Supabase project**. Browser code uses the **anon/publishable** key; the API uses the **service role** key (server-only).

## 1. Apply Supabase migrations (once per environment)

In the Supabase SQL editor or CLI, run migrations **in timestamp order** under `supabase/migrations/`, at least through:

- `20261111210000_order_persistence_rpc.sql`
- `20261118210000_inventory_units_sold_on_pay.sql`
- `20261018140000_product_customization_and_requests.sql` (or `20261123180000_latest_demo_features.sql` bundle)
- `20261123190000_custom_requests_storage_bucket.sql`
- `20261123200000_custom_request_payments.sql`
- `20261123210000_bespoke_commission_product.sql`
- `20261123220000_festive_discount_percent.sql`
- `20261123230000_extra_discount_type.sql`

Verify RPCs: `npm run verify:inventory` (optional live test with `COUCHKRAFT_INVENTORY_VERIFY=1`).

## 2. Vercel project settings

- **Framework preset:** Vite (or Other — `vercel.json` already defines rewrites).
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Install command:** `npm install` (root `postinstall` installs `admin/` deps).

`npm run build` runs TypeScript, storefront Vite build, admin build into `dist/admin`, and bundles `api/index.js`.

## 3. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** for Production (and Preview if needed).

### Server-only (API / never `VITE_*`)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret / service role key (`sb_secret_...`) |
| `COUCHKRAFT_AUTH_SECRET` | Long random string for customer session cookies |
| `RAZORPAY_KEY_ID` | Test or live key ID |
| `RAZORPAY_KEY_SECRET` | Matching secret |
| `COUCHKRAFT_DEMO_LOGIN_ENABLED` | `true` only for demo deployments |
| `COUCHKRAFT_UPI_VPA` / `COUCHKRAFT_UPI_PAYEE_NAME` | Optional UPI step |

Optional: `COUCHKRAFT_ADMIN_SECRET` (admin JWT signing; has a default).

### Build-time (exposed to browser — safe for anon key only)

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Same Supabase URL as above |
| `VITE_SUPABASE_ANON_KEY` | Publishable anon key (`sb_publishable_...`) |
| `VITE_STOREFRONT_URL` | Optional; admin resolves same-origin automatically on Vercel |

**Never** set `SUPABASE_SERVICE_ROLE_KEY` as a `VITE_*` variable.

## 4. Routing (`vercel.json`)

- `/api/(.*)` → single function with `__ck` path rewrite (already configured).
- `/admin` and `/admin/*` → `dist/admin/index.html`.
- Everything else → `dist/index.html` (storefront SPA).

## 5. Dual-portal database behaviour

- **Products, categories, orders, customers, custom requests (production):** Supabase.
- **Custom requests on Vercel:** Stored and listed from Supabase (not ephemeral `/tmp` JSON).
- **Admin login:** Default demo admin is created per cold start unless you add a persistent admin store; use the documented demo credentials or extend to Supabase-backed admins for production.
- **Coupons, banners, site settings (file-backed):** Changes on Vercel may not survive across instances; prefer Supabase-backed marketing if you need persistence at scale.

## 6. Deploy

```bash
# From repo root — must pass before pushing
npm run build

# CLI (optional)
npx vercel --prod
```

Or connect the Git repo in Vercel and deploy on push to `main`.

## 7. Post-deploy smoke test

1. **Storefront** `/` — products load (Supabase connection badge green if enabled).
2. **Admin** `/admin` — login, dashboard stats, product edit.
3. **Custom request** — submit with image upload; appears in admin **Custom requests**.
4. **Approve + quote** — customer **Account → Custom requests** → pay commission.
5. **Checkout** — test order with RTS/MTO rules and Razorpay test mode.

## 8. Common errors

| Symptom | Fix |
|---------|-----|
| Admin shows no custom requests | Run migrations; set `SUPABASE_*` on Vercel; redeploy API bundle |
| Storefront empty products | Set `VITE_SUPABASE_*` and rebuild |
| `500` on `/api/*` | Missing `SUPABASE_SERVICE_ROLE_KEY` or `COUCHKRAFT_AUTH_SECRET` |
| Commission pay fails FK | Apply `20261123210000_bespoke_commission_product.sql` |
| Images 404 in admin | Same-origin fix in admin assets; optional `VITE_STOREFRONT_URL` |