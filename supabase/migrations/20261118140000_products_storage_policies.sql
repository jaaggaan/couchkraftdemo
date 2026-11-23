-- Optional: allow public read + authenticated admin uploads from the browser.
-- The admin app now uploads via the server service-role API, so these policies are not required for uploads.

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
on storage.objects for select
to public
using (bucket_id = 'products');

drop policy if exists "Public insert product images" on storage.objects;
create policy "Public insert product images"
on storage.objects for insert
to public
with check (bucket_id = 'products');