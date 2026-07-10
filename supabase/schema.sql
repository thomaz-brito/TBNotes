-- TBNotes — esquema do banco.
-- Execute UMA vez no Supabase: painel do projeto → SQL Editor → New query →
-- cole tudo → Run.

-- Grupos musculares do usuário (uma linha por usuário)
create table public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  muscle_groups jsonb not null default '[]'::jsonb
);

-- Biblioteca de exercícios
create table public.exercises (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  muscle_group text not null,
  variations jsonb not null default '[]'::jsonb
);

-- Treinos reutilizáveis (templates)
create table public.routines (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sessões de treino registradas (o diário)
create table public.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_id uuid,
  routine_name text not null,
  started_at timestamptz not null,
  exercises jsonb not null default '[]'::jsonb
);

create index exercises_user on public.exercises (user_id);
create index routines_user on public.routines (user_id);
create index sessions_user_started on public.sessions (user_id, started_at);

-- Row Level Security: cada usuário só enxerga e altera as próprias linhas.
alter table public.settings enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.sessions enable row level security;

create policy "dono_settings" on public.settings
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "dono_exercises" on public.exercises
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "dono_routines" on public.routines
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "dono_sessions" on public.sessions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
