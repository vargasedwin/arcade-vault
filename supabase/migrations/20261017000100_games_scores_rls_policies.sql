-- SPEC 05: RLS viene activo por defecto en el proyecto. Se mantiene con políticas
-- permisivas mínimas; sin update ni delete. Se endurece en el spec de seguridad.

-- games: solo lectura desde la app.
create policy "games_select_public"
  on public.games
  for select
  to anon, authenticated
  using (true);

-- scores: lectura pública e inserción anónima (sin cuenta aún, user_id null).
create policy "scores_select_public"
  on public.scores
  for select
  to anon, authenticated
  using (true);

create policy "scores_insert_public"
  on public.scores
  for insert
  to anon, authenticated
  with check (user_id is null and score >= 0);
