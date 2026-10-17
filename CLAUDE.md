# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: online arcade platform where users play games and compete for high scores (UI copy is in Spanish). The project follows Spec Driven Design (`/spec` and `/spec-impl` skills from `Klerith/fernando-skills`, per README).

## Skills

Usa siempre /frontend-design para diseñar la interface de usuario

## Next.js version warning

Next 16.4.2 + React 19.3 with breaking changes versus common training data. Per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, …) before writing Next code, and heed deprecation notices. For example, the root layout is typed with the global `LayoutProps<"/">` helper, not hand-written props.

`next.config.ts` enables `cacheComponents`, `partialPrefetching` and `experimental.agentFeedback`, and routes `*.css` through `@tailwindcss/turbopack` (Tailwind v4, configured via `@import "tailwindcss"` and `@theme inline` in `app/globals.css`, no `tailwind.config`). `cacheComponents` changes caching/dynamic-rendering semantics, so check the docs before using dynamic data or `fetch`.

## Supabase

The app is wired to an existing Supabase project (`https://ydpynaeesipudonboqbr.supabase.co`) managed through the Supabase MCP. Integration base only (SPEC 03): no domain tables, no real auth yet; session and scores still live in `localStorage`.

- **Clients** live in `app/data/supabase/`: `client.ts` (`createClient()` for Client Components, `createBrowserClient`) and `server.ts` (async `createClient()` for Server Components and route handlers, `createServerClient` + `cookies()`). Both are typed with `Database` from `database.types.ts` and throw an error naming the missing env var.
- **`cookies()` under `cacheComponents`**: the server client only works in dynamic code (route handlers, or Server Components inside `<Suspense>`).
- **Env vars** (`.env.local`, git-ignored; template in `.env.example`): `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`). Never store the `service_role`/secret key in the repo or in `NEXT_PUBLIC_*` variables.
- **Access rule**: only `app/data/` imports `@supabase/*` or `app/data/supabase/`. Components and pages stay unaware of where data comes from.
- **Schema changes**: apply them as migrations and keep every `.sql` in `supabase/migrations/`. After each migration, regenerate `app/data/supabase/database.types.ts` with the MCP `generate_typescript_types`.
- Session refresh (`proxy.ts`) arrives with the auth spec.

## Games

Each real game is isolated (SPEC 04). Only `asteroids` is real; the other 8 catalog games (including `rocas`, which is **not** Asteroids) still use the simulated generic player `app/components/game-player.tsx` via `app/games/[id]/jugar/`.

- **Static route per game**: `app/games/<id>/jugar/page.tsx` takes precedence over `[id]/jugar` and renders the game's own player. Don't touch `GamePlayer` or `[id]/jugar` to add a game, and don't build a shared engine until several real games exist.
- **Engine + player** live in `app/components/<id>/`: `<id>-engine.ts` (plain TS, canvas only) and `<id>-player.tsx` (Client Component with the React HUD, pause/FIN/SALIR and the game-over modal). All game state lives inside the `createX(canvas, callbacks)` closure, no module-level mutable state.
- **Engine API** (`app/components/asteroids/asteroids-engine.ts`): `createAsteroids(canvas, { onStats, onGameOver })` returns `{ pause, resume, restart, end, destroy }`. The canvas notifies React (`onStats` only when a value changes, `onGameOver(finalScore)`); React controls pause/restart/end. The game keeps its own canvas HUD alongside the React one. `destroy()` must cancel `requestAnimationFrame` and remove every listener (Strict Mode mounts effects twice).
- **Keyboard**: the engine listens on `window`, ignores events from text inputs, and calls `preventDefault` on its keys except in game over so the modal stays keyboard-usable. Player buttons call `blur()` after click so Space fires instead of re-triggering them.
- **Scores**: players save through `saveScore` from `app/data/scores.ts` (`localStorage` `av_scores`); components never touch `localStorage` directly.
- **Catalog**: add the game to `GAMES` in `app/data/games.ts` and a `.cover-<id>` class in `app/globals.css`.

## Architecture

State of the repo: `app/` is still the untouched `create-next-app` scaffold (`layout.tsx` with default metadata, `page.tsx` boilerplate). The real product is a **design prototype in `references/templates/`** that is meant to be ported into the Next.js app. Path alias: `@/*` → repo root.

The prototype is a no-build, in-browser React 18 + Babel app (`Arcade Vault.html` loads `data.jsx`, `nav.jsx`, `biblioteca.jsx`, `detalle.jsx`, `reproductor.jsx`, `auth.jsx`, `salon.jsx`, `app.jsx` as `text/babel` scripts, plus `styles.css`). Things to know when porting:

- **Shared globals, not modules.** Files share function components through the global scope; hooks are aliased per-file (e.g. `useStateApp`) to avoid redeclaration collisions. Convert to real imports/exports when porting.
- **Routing** is a single `route` object (`{name: "biblioteca" | "detalle" | "player" | "auth" | "salon", id?}`) in `app.jsx`, serialized into `location.hash`. Maps to Next routes: library, game detail, player, auth, hall of fame (salón).
- **Persistence is localStorage mock**: `av_user` (session) and `av_scores` (array of score entries with `at` timestamp). `data.jsx` holds mock `GAMES` (id, title, cat, cover class, neon `color`, best, plays) and other fixtures. Real backend/auth does not exist yet.
- **Styling** is a hand-written retro/neon theme in `styles.css` (CSS variables like `--line`, `--ink-faint`, `--mono`; fonts Press Start 2P, Courier Prime, JetBrains Mono), with `.av-bg`/`.av-noise` overlay layers. The Next scaffold currently uses Geist/Tailwind defaults instead.
