# Patrón de integración de un juego (SPEC 04 + SPEC 05)

Todo spec generado por `/add-game` debe cubrir estos puntos. `<id>` es el id kebab-case del juego (ej. `tetris`) y `<Id>` su forma PascalCase (ej. `Tetris`). Los archivos de Asteroids son el modelo a seguir.

## 1. Catálogo (Supabase)

- Migración nueva `supabase/migrations/<YYYYMMDDHHMMSS>_seed_game_<id>.sql` con `insert into public.games (id, title, short, long, cat, cover, color) values (...)`. Modelo: `supabase/migrations/20261017000000_create_games_and_scores.sql`.
- Aplicarla con el MCP `apply_migration` y regenerar `app/data/supabase/database.types.ts` con `generate_typescript_types`.
- No hay tablas ni columnas nuevas: `scores` ya sirve para todos los juegos (`game_id` FK). `best` se deriva de `scores`.
- `cat`: `ARCADE | PUZZLE | SHOOTER | VERSUS`. `color`: `cyan | magenta | yellow | green`.

## 2. Portada

- Clase `.cover-<id>` en `app/globals.css`. Invocar `/frontend-design` antes de diseñarla (regla de `CLAUDE.md`).

## 3. Motor

Archivo: `app/components/<id>/<id>-engine.ts` (TypeScript plano, solo canvas). Modelo: `app/components/asteroids/asteroids-engine.ts`.

```ts
export type <Id>Stats = { /* score + lo que muestre el HUD: vidas, nivel, líneas... */ };
export type <Id>Callbacks = {
  onStats(stats: <Id>Stats): void;      // solo cuando cambia un valor, nunca cada frame
  onGameOver(finalScore: number): void; // game over natural o end()
};
export type <Id>Handle = {
  pause(): void; resume(): void; restart(): void; end(): void; destroy(): void;
};
export function create<Id>(canvas: HTMLCanvasElement, cb: <Id>Callbacks): <Id>Handle;
```

Reglas:

- Todo el estado vive en el cierre de `create<Id>`; sin variables de módulo mutables ni `document.getElementById`.
- El teclado se escucha en `window`, se ignoran eventos de `input`/`textarea` y se llama `preventDefault` en las teclas del juego, salvo en game over (el modal debe seguir usable con teclado).
- `destroy()` cancela `requestAnimationFrame` y quita cada listener añadido (Strict Mode monta el efecto dos veces).
- Pausa: no corre `update()`; al reanudar se reinicia `lastTime` y se limpian las teclas, para que `dt` no salte. Conservar el tope de `dt` del original.
- En game over, la tecla de acción/disparo no reinicia: reinicia el modal de React vía `restart()`.
- Se conserva el HUD dibujado en el canvas del original; convive con el HUD de React.
- Si el original usa audio o assets: moverlos a `public/games/<id>/` y referenciarlos con rutas absolutas.
- Si el original tiene DOM fuera del canvas (paneles "siguiente", puntuación en HTML), decidir en el spec si pasa al canvas o al HUD de React.

## 4. Reproductor

Archivo: `app/components/<id>/<id>-player.tsx` (Client Component). Se copia el armazón de `asteroids-player.tsx` (duplicación aceptada a cambio de aislamiento, decisión SPEC 04):

- Monta el `<canvas>` en `.crt-screen` con `aspect-ratio` y `max-width: 100%`; crea el motor en `useEffect` y lo destruye en el cleanup.
- HUD de React con `onStats`; botones PAUSA/REANUDAR, FIN y SALIR (`/games/<id>`); overlay "EN PAUSA".
- Modal de fin: puntuación final, campo de nombre (máx. 10 caracteres, mayúsculas, pre-rellenado con `getPlayerName()`), GUARDAR PUNTUACIÓN, JUGAR DE NUEVO y VOLVER AL VAULT (`/games`).
- Guardado con `saveScore` y `setPlayerName` de `app/data/scores.ts`, con `game_id: "<id>"`. Deshabilitar el botón tras guardar. Los componentes nunca tocan `localStorage` ni Supabase.
- `blur()` en los botones tras el clic para que Espacio no los reactive.
- Leyenda de controles en `crt-bottom`.

## 5. Ruta

`app/games/<id>/jugar/page.tsx`, igual a `app/games/asteroids/jugar/page.tsx`: `export const instant = false`, `getGame("<id>")` de `app/data/games.server.ts`, `generateMetadata` (`Jugando <TITLE> · Arcade Vault`) y `notFound()` si falta. Sin ruta `[id]/jugar` genérica: un juego sin su propia ruta da 404 en JUGAR.

## 6. Leaderboard

Sin código nuevo. `/games`, `/games/<id>` y `/salon` lo muestran en cuanto la fila existe en `games`. Los helpers de lectura ya existen (`scores.ts`, `scores.server.ts`).

## 7. Reglas del repo

- Solo `app/data/` importa `@supabase/*` o `app/data/supabase/`.
- Antes de escribir código Next, leer la guía relevante en `node_modules/next/dist/docs/` (`AGENTS.md`).
- Verificar códigos HTTP con `npm run build` + `next start`, no con `next dev`.
- No construir motor ni shell compartido entre juegos (decisión SPEC 04); si el usuario lo pide, proponer un spec aparte.
- Último paso del plan: actualizar `CLAUDE.md` (lista de juegos reales en el catálogo).

## 8. Plan de implementación base (adaptar al juego)

1. Migración del juego + tipos regenerados + clase `.cover-<id>`. Verificar: card en `/games`, detalle en `/games/<id>`.
2. Motor `<id>-engine.ts` con la API completa. Verificar: `npx tsc --noEmit` y `npm run lint`.
3. Reproductor + ruta `jugar`. Verificar: juego jugable con ambos HUD sincronizados.
4. Pausa, FIN, SALIR y overlay.
5. Modal de fin y guardado de puntuación. Verificar: fila nueva en `scores`, visible en `/games/<id>` y `/salon`.
6. Teclado, escala y leyenda. Verificar a 1440×900 y 390×844.
7. `CLAUDE.md` + `npm run lint`, `npx tsc --noEmit`, `npm run build`.

Cada paso deja la app ejecutable y es commiteable por separado.

## 9. Criterios de aceptación base (adaptar, mantener verificables)

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] La fila del juego existe en `games` y `database.types.ts` está regenerado.
- [ ] `/games` muestra la card con su categoría, color y portada; `/games/<id>` muestra detalle y leaderboard top 10; JUGAR navega a `/games/<id>/jugar`.
- [ ] `/salon` muestra el tab del juego.
- [ ] El HUD del canvas y el de React coinciden en todo momento.
- [ ] Los controles del juego funcionan y las teclas del juego no hacen scroll.
- [ ] PAUSA detiene el juego y REANUDAR continúa sin saltos.
- [ ] Game over y FIN abren el modal con la puntuación final.
- [ ] GUARDAR inserta una fila en `scores` con `game_id: "<id>"`, no permite doble envío y la puntuación aparece al recargar.
- [ ] El nombre se pre-rellena desde `av_player_name`.
- [ ] Sin listeners ni loops duplicados tras volver a montar (Strict Mode).
- [ ] Ningún archivo de `app/components/` accede a `localStorage` ni a Supabase.
- [ ] El canvas se ve completo y sin deformar a 1440×900 y 390×844.
- [ ] `CLAUDE.md` refleja el juego nuevo.

## 10. Riesgos típicos

| Riesgo | Mitigación |
| ------ | ---------- |
| Strict Mode deja dos loops o listeners activos. | `destroy()` completo; criterio de una sola acción por tecla. |
| Espacio activa el botón con foco o hace scroll. | `preventDefault` fuera de inputs y `blur()` tras el clic. |
| `dt` salta tras pausa o cambio de pestaña. | Reiniciar `lastTime` al reanudar; tope de `dt`. |
| `onStats` provoca re-renders constantes. | Emitir solo al cambiar un valor. |
| Assets o audio con rutas relativas rotas. | Moverlos a `public/games/<id>/` y usar rutas absolutas. |
| DOM externo al canvas del original. | Decidirlo en el spec: canvas o HUD de React. |
| Cualquier cliente puede insertar scores falsos (RLS permisiva). | Riesgo asumido, se resuelve en el spec de seguridad. |
