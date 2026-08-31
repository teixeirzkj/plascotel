-- =========================================================
-- Plascotel — Storage (upload de imagens de produtos/categorias)
-- Cole no SQL Editor do Supabase e execute, depois de já ter rodado
-- schema.sql. Pode rodar novamente sem problemas.
-- =========================================================

-- Bucket público "imagens": qualquer visitante consegue ver as fotos
-- (necessário para elas aparecerem no site), mas só um admin logado pode
-- enviar, substituir ou apagar arquivos.
insert into storage.buckets (id, name, public)
values ('imagens', 'imagens', true)
on conflict (id) do nothing;

drop policy if exists "imagens_select_publico" on storage.objects;
create policy "imagens_select_publico" on storage.objects
  for select using (bucket_id = 'imagens');

drop policy if exists "imagens_admin_insert" on storage.objects;
create policy "imagens_admin_insert" on storage.objects
  for insert with check (bucket_id = 'imagens' and auth.role() = 'authenticated');

drop policy if exists "imagens_admin_update" on storage.objects;
create policy "imagens_admin_update" on storage.objects
  for update using (bucket_id = 'imagens' and auth.role() = 'authenticated');

drop policy if exists "imagens_admin_delete" on storage.objects;
create policy "imagens_admin_delete" on storage.objects
  for delete using (bucket_id = 'imagens' and auth.role() = 'authenticated');
