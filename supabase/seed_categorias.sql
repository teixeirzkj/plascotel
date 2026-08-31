-- Popula as categorias iniciais da Plascotel.
-- Cole no SQL Editor do Supabase e clique em Run.
-- Pode rodar mais de uma vez sem duplicar (usa o slug como chave).

insert into categorias (nome, slug, descricao, imagem) values
  ('Cadeiras', 'cadeiras', 'Conforto e estilo para todos os ambientes.', 'https://images.unsplash.com/photo-1503602642458-232111445657?q=80&w=800&auto=format&fit=crop'),
  ('Mesas', 'mesas', 'O ponto de encontro da sua casa.', 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=800&auto=format&fit=crop'),
  ('Sofás', 'sofas', 'Conforto que abraça sua família.', 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=800&auto=format&fit=crop'),
  ('Poltronas', 'poltronas', 'Seu canto de descanso favorito.', 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?q=80&w=800&auto=format&fit=crop'),
  ('Armários', 'armarios', 'Organização com muito estilo.', 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=800&auto=format&fit=crop'),
  ('Estantes', 'estantes', 'Exiba seus objetos com elegância.', 'https://images.unsplash.com/photo-1594620302200-9a762244a156?q=80&w=800&auto=format&fit=crop'),
  ('Racks', 'racks', 'Modernidade para sua sala de estar.', 'https://images.unsplash.com/photo-1601000937967-b2d4c05fc0ba?q=80&w=800&auto=format&fit=crop'),
  ('Aparadores', 'aparadores', 'Charme e praticidade em um só móvel.', 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=800&auto=format&fit=crop')
on conflict (slug) do nothing;
