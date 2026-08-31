-- Novas categorias: cama/mesa/banho, pratos e colunas para plantas.
-- Cole no SQL Editor do Supabase e clique em Run.
-- Pode rodar mais de uma vez sem duplicar (usa o slug como chave).

insert into categorias (nome, slug, descricao, imagem) values
  ('Cama, Mesa e Banho', 'cama-mesa-e-banho', 'Toalhas, roupas de cama e itens para o banho.', ''),
  ('Pratos', 'pratos', 'Pratos e utensílios para a sua mesa.', ''),
  ('Colunas para Plantas', 'colunas-para-plantas', 'Suportes e colunas para decorar com plantas.', '')
on conflict (slug) do nothing;
