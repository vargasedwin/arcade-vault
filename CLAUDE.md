# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arcade Vault: online arcade platform where users play games and compete for high scores (UI copy is in Spanish). The project follows Spec Driven Design (`/spec` and `/spec-impl` skills from `Klerith/fernando-skills`, per README).

## Commands

- `npm run dev` — dev server (Turbopack)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- No test runner is configured.

## Next.js version warning

Next 16.4.2 + React 19.3 with breaking changes versus common training data. Per `AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, …) before writing Next code, and heed deprecation notices. For example, the root layout is typed with the global `LayoutProps<"/">` helper, not hand-written props.

`next.config.ts` enables `cacheComponents`, `partialPrefetching` and `experimental.agentFeedback`, and routes `*.css` through `@tailwindcss/turbopack` (Tailwind v4, configured via `@import "tailwindcss"` and `@theme inline` in `app/globals.css`, no `tailwind.config`). `cacheComponents` changes caching/dynamic-rendering semantics, so check the docs before using dynamic data or `fetch`.

## Architecture

State of the repo: `app/` is still the untouched `create-next-app` scaffold (`layout.tsx` with default metadata, `page.tsx` boilerplate). The real product is a **design prototype in `references/templates/`** that is meant to be ported into the Next.js app. Path alias: `@/*` → repo root.

The prototype is a no-build, in-browser React 18 + Babel app (`Arcade Vault.html` loads `data.jsx`, `nav.jsx`, `biblioteca.jsx`, `detalle.jsx`, `reproductor.jsx`, `auth.jsx`, `salon.jsx`, `app.jsx` as `text/babel` scripts, plus `styles.css`). Things to know when porting:

- **Shared globals, not modules.** Files share function components through the global scope; hooks are aliased per-file (e.g. `useStateApp`) to avoid redeclaration collisions. Convert to real imports/exports when porting.
- **Routing** is a single `route` object (`{name: "biblioteca" | "detalle" | "player" | "auth" | "salon", id?}`) in `app.jsx`, serialized into `location.hash`. Maps to Next routes: library, game detail, player, auth, hall of fame (salón).
- **Persistence is localStorage mock**: `av_user` (session) and `av_scores` (array of score entries with `at` timestamp). `data.jsx` holds mock `GAMES` (id, title, cat, cover class, neon `color`, best, plays) and other fixtures. Real backend/auth does not exist yet.
- **Styling** is a hand-written retro/neon theme in `styles.css` (CSS variables like `--line`, `--ink-faint`, `--mono`; fonts Press Start 2P, Courier Prime, JetBrains Mono), with `.av-bg`/`.av-noise` overlay layers. The Next scaffold currently uses Geist/Tailwind defaults instead.
