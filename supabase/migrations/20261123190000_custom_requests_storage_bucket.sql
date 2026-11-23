-- Public bucket for custom request reference photos (uploads via server service role).

insert into storage.buckets (id, name, public)
values ('custom-requests', 'custom-requests', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read custom request images" on storage.objects;
create policy "Public read custom request images"
on storage.objects for select
to public
using (bucket_id = 'custom-requests');