# SPEC 05 — Tabla de juegos y leaderboard con Supabase

> **Estado:** Aprobado
> **Depende de:** 04-juego-asteroids
> **Fecha:** 2026-10-17
> **Objetivo:** Migrar los datos de juegos a una tabla `games` en Supabase y conectar
> los leaderboards (global y por juego) a una tabla `scores` real, guardando el score
> de Asteroids al finalizar cada partida.

---

## Scope

**In:**

- Crear tabla `games` en Supabase con los campos del tipo `Game` actual; seed manual
  con la entrada `asteroids`.
- Crear tabla `scores` en Supabase: `id` (uuid PK), `game_id` (text, FK a `games`),
  `player_name` (text), `score` (int), `user_id` (uuid, nullable), `created_at` (timestamptz).
- Guardar cada `.sql` en `supabase/migrations/` y regenerar
  `app/data/supabase/database.types.ts` con el MCP `generate_typescript_types`
  (convención de SPEC 03; sustituye a los tipos manuales).
- Exponer en `app/data/games.ts` el tipo `Game` derivado de la fila de `games` y en
  `app/data/scores.ts` el tipo de fila de `scores`, ambos a partir de `Database`.
- Eliminar el array `GAMES` local de `app/data/games.ts` y la función `seededScores`
  de `app/data/scores.ts`; sustituirlos con lecturas a Supabase en:
  - `app/games/page.tsx` — lista de juegos (cards), solo muestra los que estén en Supabase.
  - `app/games/[id]/page.tsx` — detalle del juego + leaderboard top 10 por juego.
  - `app/salon/page.tsx` — leaderboard global con tabs solo para juegos reales.
- Guardar score al terminar partida en `app/components/asteroids/asteroids-player.tsx`
  (ruta `app/games/asteroids/jugar/page.tsx`):
  - Al abrir el modal de game over, el campo `name` se pre-rellena con
    `localStorage.getItem('av_player_name')` si existe.
  - Al confirmar, se persiste el nombre en `av_player_name` y se inserta el score
    en Supabase vía cliente browser.
  - Todo acceso a `localStorage` y a Supabase pasa por helpers de `app/data/`
    (regla de SPEC 03/04); el componente no los toca directamente.
- Estado vacío en leaderboards: mensaje "Sé el primero en entrar al salón de la fama"
  cuando no hay scores para ese juego.

**Fuera de alcance:**

- Supabase Auth — `user_id` se almacena como `null` en todos los scores por ahora.
- RLS (Row Level Security) — se configura en un spec futuro de seguridad.
- Panel de administración de juegos — la tabla `games` es solo lectura desde la app.
- Actualización automática de `best` y `plays` en la tabla `games` — no existen como
  columnas; el `best` se calcula en tiempo de consulta desde `scores`.
- Realtime — los leaderboards no se actualizan en vivo; solo al cargar la página.
- Paginación del leaderboard — se muestran los top 10 fijos (top 12 en el salón).
- Mejor score del usuario en el salón — requiere Auth. `getUserBest` se elimina y se
  retira de `hall-of-fame.tsx` sin reemplazo en el paso 6.
- Los 8 juegos simulados (`rocas`, `bloque-buster`, `caida`, etc.) desaparecen de la UI
  al eliminar el array local; no se migran a Supabase en este spec. `GamePlayer` y
  `app/games/[id]/jugar/` quedan sin uso y no se tocan.
- La landing (`getRecentScores`, `getTopPlayers`) y los datos mock de `plays`/`best`
  en tarjetas: se ajustan solo lo mínimo para compilar con el nuevo tipo `Game`.

---

## Data model

### Tabla `games` (Supabase)

| Columna    | Tipo        | Notas                                        |
| ---------- | ----------- | -------------------------------------------- |
| id         | text        | PK, e.g. `'asteroids'`                       |
| title      | text        |                                              |
| short      | text        |                                              |
| long       | text        |                                              |
| cat        | text        | `'ARCADE'`, `'PUZZLE'`, `'SHOOTER'`, `'VERSUS'` |
| cover      | text        | CSS class, e.g. `'cover-asteroids'`          |
| color      | text        | `'cyan'`, `'magenta'`, `'yellow'`, `'green'` |
| created_at | timestamptz | default `now()`                              |

Seed inicial (copiar los valores reales de `asteroids` en `app/data/games.ts` antes
de borrarlo):

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'asteroids', 'ASTEROIDS', '<short actual>', '<long actual>',
  '<cat actual>', '<cover actual>', '<color actual>'
);
```

### Tabla `scores` (Supabase)

| Columna     | Tipo        | Notas                           |
| ----------- | ----------- | ------------------------------- |
| id          | uuid        | PK, default `gen_random_uuid()` |
| game_id     | text        | FK → `games.id`                 |
| player_name | text        |                                 |
| score       | int         |                                 |
| user_id     | uuid        | nullable, sin FK por ahora      |
| created_at  | timestamptz | default `now()`                 |

### Tipos TypeScript

Se generan con el MCP en `app/data/supabase/database.types.ts`; la app deriva los
suyos de ahí:

```ts
// app/data/games.ts
export type Game = Database["public"]["Tables"]["games"]["Row"];

// app/data/scores.ts
export type ScoreRow = Database["public"]["Tables"]["scores"]["Row"];
```

`cat` y `color` llegan como `string` desde la base; `games.ts` los acota a las
uniones `Category` y `NeonColor` existentes al leer.

### `best` por juego

No se almacena como campo en `games`. Se calcula en tiempo de consulta:

```sql
SELECT MAX(score) FROM scores WHERE game_id = $1;
```

---

## Implementation plan

Antes del paso 1: leer en `node_modules/next/dist/docs/` las guías de `cacheComponents`
con `<Suspense>` para datos dinámicos, según `AGENTS.md`. Invocar `/frontend-design`
antes del paso 6 (estados vacíos), según `CLAUDE.md`.

1. **Crear tablas en Supabase** — migración con `apply_migration` y su `.sql` en
   `supabase/migrations/`:
   - Tabla `games` con las columnas del data model.
   - Tabla `scores` con las columnas del data model.
   - Seed de la entrada `asteroids` en `games`.
     Verificación: `list_tables` muestra ambas tablas y `select * from games`
     devuelve la fila de asteroids.

2. **Regenerar tipos** — `generate_typescript_types` sobre
   `app/data/supabase/database.types.ts`; definir `Game` y `ScoreRow` como se indica
   en el data model.
   Verificación: `npx tsc --noEmit` no reporta errores en los tipos nuevos.

3. **Eliminar datos locales** — en `app/data/games.ts` borrar el array `GAMES`;
   en `app/data/scores.ts` borrar `seededScores` y `getUserBest`. Separar los helpers
   por entorno dentro de `app/data/`, porque `server.ts` importa `next/headers` y
   `games.ts`/`scores.ts` los importan Client Components:
   - `games.ts` y `scores.ts` quedan client-safe (tipos, `CATS`, `localStorage`,
     cliente browser). `scores.ts` expone la función pura `toLeaderboardRows`
     (`ScoreRow[]` → `LeaderboardRow[]`, con rank y fecha) y `getLeaderboard`
     versión browser (cliente `client.ts`).
   - `games.server.ts` expone `getGames()` y `getGame(id)`; `scores.server.ts`
     expone `getLeaderboard(gameId, limit)` versión servidor (`score DESC`). Ambos
     usan el cliente `server.ts` e `import "server-only"` (dependencia `server-only`).
   Verificación: `npm run build` falla únicamente en los archivos que consumen
   los símbolos eliminados (esperado — se arreglan en los pasos siguientes).

4. **Migrar `app/games/page.tsx`** — Server Component; lee todos los juegos con
   `getGames()` dentro de `<Suspense>` (necesario por `cookies()` bajo
   `cacheComponents`) y pasa el array como prop a `library.tsx`, que sigue siendo
   `"use client"` por el hover/filtros.
   Verificación: `/games` carga y muestra únicamente la card de Asteroids.

5. **Migrar `app/games/[id]/page.tsx`** — lectura del juego por `id` y top 10 scores
   de ese juego (ordenados por `score DESC`); calcular `best` como el primer
   resultado. Si el juego no existe → `notFound()`. Quitar `generateStaticParams`
   si ya no aplica.
   Verificación: `/games/asteroids` carga con los datos reales; un id inválido
   devuelve 404.

6. **Migrar `app/salon/page.tsx`** — lectura de todos los juegos para construir los
   tabs; top 12 scores del juego activo, y al cambiar de tab se vuelve a pedir
   client-side con el helper de `app/data/` que usa el cliente browser. Estado vacío
   en el detalle y en el salón; corregir el podio para menos de 3 filas y la clave de
   fila de `GameDetail` (por `rank`, no por `name`).
   Verificación: `/salon` muestra solo el tab de Asteroids; cambiar de tab
   recarga los scores correctamente; con 0, 1 o 2 filas no lanza errores.

7. **Guardar score en `asteroids-player.tsx`** — helpers en `app/data/scores.ts`:
   `getPlayerName()`, `setPlayerName(name)` (clave `av_player_name`) y
   `saveScore` pasa a insertar en `scores` vía `createClient` browser
   (`{ game_id: 'asteroids', player_name: name, score, user_id: null }`). Al abrir el
   modal de game over se pre-rellena `name`. Al confirmar:
   - Persistir el nombre con `setPlayerName`.
   - Insertar el score en Supabase.
   - Marcar `saved: true` para deshabilitar el botón y evitar doble envío.
     Verificación: tras una partida, el score aparece en `/games/asteroids` y en
     `/salon`; al volver a jugar, el nombre está pre-rellenado.

8. **Verificación final** — `npm run lint`, `npx tsc --noEmit` y `npm run build`
   completan sin errores. Ninguna ruta existente devuelve 500. Actualizar
   `CLAUDE.md` (tablas, helpers y que solo `asteroids` está en el catálogo).

---

## Acceptance criteria

- [ ] Las tablas `games` y `scores` existen en Supabase con las columnas del data model.
- [ ] La fila `asteroids` está presente en la tabla `games`.
- [ ] Las migraciones están en `supabase/migrations/` y `database.types.ts` refleja ambas tablas.
- [ ] El array `GAMES` local y la función `seededScores` han sido eliminados del codebase.
- [ ] `/games` carga y muestra únicamente los juegos presentes en Supabase (solo Asteroids).
- [ ] `/games/asteroids` muestra los datos reales del juego y el leaderboard top 10.
- [ ] `/games/[id]` con un id inexistente devuelve 404.
- [ ] `/salon` muestra únicamente tabs de juegos presentes en Supabase.
- [ ] Cuando no hay scores, los leaderboards muestran el mensaje de estado vacío
      en lugar de datos falsos.
- [ ] Al terminar una partida de Asteroids, el modal pre-rellena el nombre desde
      `localStorage` si existe.
- [ ] Al confirmar el nombre en el modal, el score se inserta en Supabase y el
      nombre se persiste en `localStorage` para la próxima partida.
- [ ] El botón de guardar se deshabilita tras el primer envío (sin doble inserción).
- [ ] El score guardado aparece en `/games/asteroids` y en `/salon` al recargar.
- [ ] Ningún componente ni página importa `@supabase/*` ni `app/data/supabase/`, y
      ningún archivo de `app/components/` accede a `localStorage`.
- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` completan sin errores.
- [ ] Ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: Un solo spec para tabla de juegos y leaderboard** — ambas funcionalidades
  comparten el mismo momento de migración a Supabase y las mismas tablas base;
  separarlas hubiera generado un spec intermedio sin valor visible.

- **Sí: `best` calculado desde `scores` en tiempo de consulta** — en lugar de
  almacenarlo como campo en `games`. Razón: evita lógica de sincronización;
  con top 10 scores ya cargados, el máximo es trivial de derivar.

- **Sí: `user_id` nullable sin FK** — la plataforma permite jugar sin cuenta.
  Razón: la fricción de registro reduce la participación; la FK se añade cuando
  llegue el spec de Supabase Auth.

- **Sí: Nombre pre-rellenado desde `av_player_name` en localStorage** — separado
  de `av_user` (el nick de sesión). Razón: un jugador puede tener un nick de
  sesión distinto al nombre que quiere en el leaderboard; además funciona aunque
  no haya sesión activa.

- **Sí: Server Components para los fetches de juegos y scores** — excepto
  `/salon` que necesita cambio de tab en cliente. Razón: menos JavaScript
  en el bundle y datos frescos en cada request sin useState/useEffect. Bajo
  `cacheComponents` las lecturas con `server.ts` van dentro de `<Suspense>`.

- **Sí: Tipos generados con el MCP en `app/data/supabase/database.types.ts`** — en
  lugar de tipos manuales en `lib/supabase/types.ts`. Razón: es la convención de
  SPEC 03 y evita que los tipos se desincronicen del esquema.

- **Sí: Acceso a Supabase y `localStorage` solo desde `app/data/`** — los
  componentes reciben datos por props o llaman helpers. Razón: regla vigente de
  SPEC 03/04.

- **Sí: Separar `.ts` (client-safe) de `.server.ts` (solo servidor) en `app/data/`** —
  `games.server.ts` y `scores.server.ts` usan el cliente `server.ts` con
  `import "server-only"`; `games.ts` y `scores.ts` solo importan el cliente browser.
  Razón: `server.ts` importa `next/headers`, y Client Components como `library.tsx` o
  `asteroids-player.tsx` importan `games.ts` y `scores.ts`; mezclarlos rompería el
  build. La conversión `ScoreRow` → `LeaderboardRow` vive en una función pura en
  `scores.ts` para no duplicarla entre las versiones servidor y browser.

- **Sí: Mantener RLS con políticas permisivas** — RLS viene activo por defecto en el
  proyecto; se mantienen RLS y políticas permisivas (select en ambas tablas, insert en
  scores) en lugar de deshabilitarlo, para no exponer update/delete. Se endurece en el
  spec de seguridad.

- **No: RLS en este spec** — las tablas quedan abiertas (INSERT y SELECT públicos).
  Razón: RLS requiere definir roles y políticas; hacerlo bien merece su propio spec.
  Riesgo asumido: cualquier cliente puede insertar scores (incluso falsos) con la
  clave publicable; se mitiga en spec futuro.

- **No: Realtime en leaderboards** — los scores se ven al recargar la página.
  Razón: la complejidad de subscriptions no aporta valor con un solo juego activo.

- **No: Migrar los 8 juegos simulados a Supabase** — desaparecen de la UI al
  borrar el array local. Razón: no son jugables; añadirlos a Supabase sería datos
  sin funcionalidad real.
