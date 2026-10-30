-- Tabela de pontuações do TypeCar (execute no SQL Editor do Supabase)
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  player text not null check (char_length(player) between 1 and 16),
  wpm integer not null check (wpm between 0 and 300),
  accuracy numeric(5,1) not null check (accuracy between 0 and 100),
  time_ms integer not null check (time_ms > 0),
  position smallint not null,
  difficulty text not null,
  car text not null,
  created_at timestamptz not null default now()
);

create index if not exists scores_wpm_idx on public.scores (wpm desc);

alter table public.scores enable row level security;

-- Qualquer pessoa pode ler o ranking
create policy "scores are public" on public.scores for select using (true);

-- Inserção: anônimos sem user_id, ou usuário autenticado gravando com o próprio id
create policy "insert own scores" on public.scores for insert
  with check (user_id is null or user_id = auth.uid());
