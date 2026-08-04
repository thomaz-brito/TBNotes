-- TBNotes — migração 002: locais/máquinas globais do usuário
--
-- ADITIVA E NÃO DESTRUTIVA: só acrescenta duas colunas à tabela settings.
-- Nenhum dado existente é lido, alterado ou apagado.
--
-- Como aplicar: painel do Supabase → SQL Editor → New query → colar → Run.
-- Rodar duas vezes não causa problema (IF NOT EXISTS).

alter table public.settings
  add column if not exists setups jsonb not null default '[]'::jsonb,
  add column if not exists default_setup text;

-- A migração 001 colocava esses campos em "exercises"; agora os locais são
-- globais, então aquelas colunas ficaram sem uso. Se você chegou a rodar a
-- 001, pode removê-las (opcional — deixá-las também não atrapalha):
-- alter table public.exercises
--   drop column if exists setups,
--   drop column if exists default_setup;

-- Para desfazer esta migração:
-- alter table public.settings
--   drop column if exists setups,
--   drop column if exists default_setup;
