# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: online arcade platform where users play games and compete for high scores (UI copy is in Spanish). The project follows Spec Driven Design (`/spec` and `/spec-impl` skills from `Klerith/fernando-skills`, per README).

## Skills

Usa siempre /frontend-design para diseñar la interface de usuario

## Next.js version warning

Next 16.4.2 + React 19.3 with breaking changes versus common training data. Per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, …) before writing Next code, and heed deprecation notices. For example, the root layout is typed with the global `LayoutProps<"/">` helper, not hand-written props.

`next.config.ts` enables `cacheComponents`, `partialPrefetching` and `experimental.agentFeedback`, and routes `*.css` through `@tailwindcss/turbopack` (Tailwind v4, configured via `@import "tailwindcss"` and `@theme inline` in `app/globals.css`, no `tailwind.config`). `cacheComponents` changes caching/dynamic-rendering semantics, so check the docs before using dynamic data or `fetch`. Verify HTTP status codes with `npm run build` + `next start`, not with `next dev` (dev and the production PPR shell disagree, e.g. `notFound()` is 404 in dev but 200 in production).

## Supabase

The app is wired to an existing Supabase project (`https://ydpynaeesipudonboqbr.supabase.co`) managed through the Supabase MCP. No real auth yet (`user_id` is always `null`); the session (`av_user`) still lives in `localStorage`.

- **Tables** (SPEC 05): `games` (`id` text PK, `title`, `short`, `long`, `cat`, `cover`, `color`, `created_at`; read-only from the app, only `asteroids` and `tetris` are seeded) and `scores` (`id` uuid, `game_id` FK → `games.id`, `player_name`, `score`, `user_id` nullable, `created_at`). There is no `best`/`plays` column: `best` is derived from the top score at query time.
- **RLS is on** with permissive policies only: `select` on both tables, `insert` on `scores` with `check (user_id is null and score >= 0)`. No `update`/`delete`. To be tightened in the security spec.
- **Clients** live in `app/data/supabase/`: `client.ts` (`createClient()` for Client Components, `createBrowserClient`) and `server.ts` (async `createClient()` for Server Components and route handlers, `createServerClient` + `cookies()`). Both are typed with `Database` from `database.types.ts` and throw an error naming the missing env var.
- **`.ts` vs `.server.ts`**: `server.ts` imports `next/headers`, so anything a Client Component imports must not touch it. Client-safe files (`games.ts`, `scores.ts`: types, `CATS`, browser `getLeaderboard`, `toLeaderboardRows`, `saveScore`, `getPlayerName`/`setPlayerName` for `av_player_name`) never import `server.ts`. Server reads live in `games.server.ts` (`getGames`, `getGame`) and `scores.server.ts` (`getLeaderboard`), both with `import "server-only"`. `Game` and `ScoreRow` come from `Database`; `LeaderboardRow` is the UI shape (rank, name, score, date).
- **`cookies()` under `cacheComponents`**: the server client only works in dynamic code (route handlers, or Server Components inside `<Suspense>`). `/games/[id]` and each game's `jugar` route (`/games/asteroids/jugar`, `/games/tetris/jugar`) export `instant = false` and read the game before any `<Suspense>`; in `next dev` an unknown id returns 404, but the production build serves the PPR shell with 200 plus the not-found UI and `noindex` (accepted soft 404, SPEC 05; a real 404 is deferred to the Auth spec, once `proxy.ts` exists).
- **Env vars** (`.env.local`, git-ignored; template in `.env.example`): `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`). Never store the `service_role`/secret key in the repo or in `NEXT_PUBLIC_*` variables.
- **Access rule**: only `app/data/` imports `@supabase/*` or `app/data/supabase/`. Components and pages stay unaware of where data comes from.
- **Schema changes**: apply them as migrations and keep every `.sql` in `supabase/migrations/`. After each migration, regenerate `app/data/supabase/database.types.ts` with the MCP `generate_typescript_types`.
- Session refresh (`proxy.ts`) arrives with the auth spec.

## Games

Each real game is isolated (SPEC 04). `asteroids` and `tetris` are the real games and the only ones in the catalog (the `games` table); Tetris (SPEC 06) is the second application of the pattern below. The 8 simulated games and the generic `GamePlayer` / `app/games/[id]/jugar/` were removed in SPEC 05; `rocas` is **not** Asteroids.

- **Static route per game**: `app/games/<id>/jugar/page.tsx` renders the game's own player. There is no generic `[id]/jugar` any more, so a game added to `games` without its own `jugar` route gets a 404 on its JUGAR link. Don't build a shared engine until several real games exist.
- **Engine + player** live in `app/components/<id>/`: `<id>-engine.ts` (plain TS, canvas only) and `<id>-player.tsx` (Client Component with the React HUD, pause/FIN/SALIR and the game-over modal). All game state lives inside the `createX(canvas, callbacks)` closure, no module-level mutable state.
- **Engine API** (`app/components/asteroids/asteroids-engine.ts`; `tetris-engine.ts` follows the same contract with `createTetris`): `createAsteroids(canvas, { onStats, onGameOver })` returns `{ pause, resume, restart, end, destroy }`. The canvas notifies React (`onStats` only when a value changes, `onGameOver(finalScore)`); React controls pause/restart/end. The game keeps its own canvas HUD alongside the React one. `destroy()` must cancel `requestAnimationFrame` and remove every listener (Strict Mode mounts effects twice).
- **Keyboard**: the engine listens on `window`, ignores events from text inputs, and calls `preventDefault` on its keys except in game over so the modal stays keyboard-usable. Player buttons call `blur()` after click so Space fires instead of re-triggering them.
- **Scores**: players save through `saveScore` from `app/data/scores.ts`, which inserts into `scores` with the browser client (`user_id: null`). The modal pre-fills the name with `getPlayerName()` and persists it with `setPlayerName()` after saving (`av_player_name`, separate from the `av_user` session). Components never touch `localStorage` or Supabase directly.
- **Tetris specifics** (SPEC 06): logical canvas 480×600 (4:5), board on the left and the SCORE/LINES/LEVEL/NEXT panel drawn inside the canvas; its `.crt` spans the HUD width, the screen height is capped by the viewport, and the 4:5 canvas is centered with `object-fit: contain`. No pause key (React drives `pause()`/`resume()`), no lives (React HUD shows `LÍNEAS`), and in game over no key restarts: only the modal does.
- **Catalog**: insert the game as a migration (new `.sql` in `supabase/migrations/`, then regenerate types) and add a `.cover-<id>` class in `app/globals.css`. There is no local `GAMES` array.

## Architecture

State of the repo: `app/` is still the untouched `create-next-app` scaffold (`layout.tsx` with default metadata, `page.tsx` boilerplate). The real product is a **design prototype in `references/templates/`** that is meant to be ported into the Next.js app. Path alias: `@/*` → repo root.

The prototype is a no-build, in-browser React 18 + Babel app (`Arcade Vault.html` loads `data.jsx`, `nav.jsx`, `biblioteca.jsx`, `detalle.jsx`, `reproductor.jsx`, `auth.jsx`, `salon.jsx`, `app.jsx` as `text/babel` scripts, plus `styles.css`). Things to know when porting:

- **Shared globals, not modules.** Files share function components through the global scope; hooks are aliased per-file (e.g. `useStateApp`) to avoid redeclaration collisions. Convert to real imports/exports when porting.
- **Routing** is a single `route` object (`{name: "biblioteca" | "detalle" | "player" | "auth" | "salon", id?}`) in `app.jsx`, serialized into `location.hash`. Maps to Next routes: library, game detail, player, auth, hall of fame (salón).
- **Persistence is localStorage mock**: `av_user` (session) and `av_scores` (array of score entries with `at` timestamp). `data.jsx` holds mock `GAMES` (id, title, cat, cover class, neon `color`, best, plays) and other fixtures. Real backend/auth does not exist yet.
- **Styling** is a hand-written retro/neon theme in `styles.css` (CSS variables like `--line`, `--ink-faint`, `--mono`; fonts Press Start 2P, Courier Prime, JetBrains Mono), with `.av-bg`/`.av-noise` overlay layers. The Next scaffold currently uses Geist/Tailwind defaults instead.
