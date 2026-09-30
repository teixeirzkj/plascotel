-- =========================================================
-- Plascotel — Storage (upload de imagens de produtos/categorias)
-- Cole no SQL Editor do Supabase e execute, depois de já ter rodado
-- schema.sql. Pode rodar novamente sem problemas.
-- =========================================================

-- Bucket público "imagens": qualquer visitante consegue ver as fotos
-- (necessário para elas aparecerem no site), mas só um admin logado pode
-- enviar, substituir ou apagar arquivos.
--
-- file_size_limit/allowed_mime_types são reforçados AQUI, no bucket —
-- validar só no navegador (src/lib/storage.ts) não impede alguém de
-- chamar a Storage API do Supabase direto (com um token de admin válido)
-- pulando o front. Isso trava no servidor mesmo que o front seja
-- contornado, sem depender só do MIME que o cliente informa no upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imagens', 'imagens', true, 8388608, -- 8 MiB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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
