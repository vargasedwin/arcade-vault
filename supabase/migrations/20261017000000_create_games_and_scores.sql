-- SPEC 05: tabla de juegos y leaderboard.
-- RLS queda fuera de alcance (spec futuro de seguridad): INSERT y SELECT abiertos.

create table public.games (
  id         text primary key,
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null,
  cover      text not null,
  color      text not null,
  created_at timestamptz not null default now()
);

create table public.scores (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null references public.games (id),
  player_name text not null,
  score       int not null,
  user_id     uuid,
  created_at  timestamptz not null default now()
);

insert into public.games (id, title, short, long, cat, cover, color)
values (
  'asteroids',
  'ASTEROIDS',
  'Rota, propulsa y dispara entre rocas en el vacío.',
  'Tu nave triangular flota en un espacio sin bordes. Rota, propulsa y dispara para partir cada roca en fragmentos más pequeños. Recoge el 3x para disparar en abanico. Tienes tres vidas.',
  'SHOOTER',
  'cover-asteroids',
  'cyan'
);
