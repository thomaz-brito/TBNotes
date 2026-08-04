-- TBNotes — migração 001: SUPERSEDIDA pela 002 (locais agora são globais).
-- Mantida só por histórico; não precisa ser aplicada.
-- (versão antiga) local/máquina por exercício
--
-- ADITIVA E NÃO DESTRUTIVA: só acrescenta duas colunas à tabela exercises.
-- Nenhum dado existente é lido, alterado ou apagado; exercícios atuais ficam
-- com a lista vazia e sem padrão, exatamente como se comportam hoje.
--
-- Como aplicar: painel do Supabase → SQL Editor → New query → colar → Run.
-- Rodar duas vezes não causa problema (IF NOT EXISTS).

alter table public.exercises
  add column if not exists setups jsonb not null default '[]'::jsonb,
  add column if not exists default_setup text;

-- Para desfazer (nada além destas colunas seria perdido):
-- alter table public.exercises
--   drop column if exists setups,
--   drop column if exists default_setup;
