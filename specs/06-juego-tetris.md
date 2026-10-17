# SPEC 06 — Juego Tetris

> **Estado:** Aprobado
> **Depende de:** 04-juego-asteroids, 05-leaderboard-y-tabla-de-juegos
> **Fecha:** 2026-10-17
> **Objetivo:** Portar el Tetris de `references/started-games/03-tetris/` como segundo juego real del catálogo (`/games/tetris`), con su propio reproductor en `/games/tetris/jugar` y su leaderboard conectado a Supabase.

---

## Por qué existe este spec

Asteroids (SPEC 04) fijó el patrón de juego aislado y SPEC 05 conectó el catálogo y los scores a Supabase. Tetris es el primer juego que se agrega sobre ese patrón ya implementado, así que este spec solo lo aplica: no cambia la plataforma.

Hay tres decisiones no obvias:

- **El original tiene 8 piezas, no 7.** `game.js` genera una pieza `N` («tuerca», 3×3 con hueco central, gris) que el README no menciona. Se conserva tal cual.
- **El panel lateral del original es HTML.** `SCORE`, `LINES`, `LEVEL`, el canvas `NEXT` y la lista de controles viven fuera del `<canvas id="board">`. El motor de Arcade Vault recibe un único canvas, así que ese panel pasa a dibujarse dentro del canvas.
- **El original no es encapsulable tal cual.** Usa `document.getElementById`, estado de módulo, `document.addEventListener('keydown')`, pausa con la tecla `P` y un interruptor de tema que escribe en `localStorage`. Hay que reescribirlo dentro de `createTetris`.

---

## Alcance

**Dentro:**

- Fila nueva en la tabla `games`: `tetris`, título `TETRIS`, categoría `PUZZLE`, color `magenta`, portada `cover-tetris`, mediante una migración de seed.
- Regenerar `app/data/supabase/database.types.ts` con el MCP `generate_typescript_types` (puede quedar sin cambios porque no hay columnas nuevas; se regenera igual por convención de SPEC 03).
- Clase `.cover-tetris` en `app/globals.css`, diseñada con `/frontend-design` (piezas cayendo en magenta/neón). `.cover-tetro` existente no se toca ni se reutiliza.
- Motor en `app/components/tetris/tetris-engine.ts`: port de `game.js` a TypeScript, encapsulado en `createTetris(canvas, callbacks)`, sin globals ni acceso al DOM fuera del canvas recibido.
  - Se conservan las reglas del original: tablero 10×20, bloques de 30 px, 8 piezas, rotación horaria con wall kicks, soft drop, hard drop, pieza fantasma, pieza siguiente, puntuación por líneas, niveles y velocidad.
  - Canvas lógico de **480×600**: tablero de 300×600 a la izquierda y un panel de 180 px a la derecha, dibujado en el canvas, con `SCORE`, `LINES`, `LEVEL` y la pieza `NEXT` (HUD del canvas).
  - Overlay `GAME OVER` dibujado en el canvas, con `PUNTAJE: n`.
- Reproductor en `app/components/tetris/tetris-player.tsx` (Client Component), copiando el armazón de `asteroids-player.tsx`: HUD de React (jugador, puntuación, líneas, nivel), botones PAUSA/REANUDAR, FIN y SALIR, overlay "EN PAUSA" y modal de fin de juego (guardar puntuación, JUGAR DE NUEVO, VOLVER AL VAULT). Ambos HUD conviven.
- Ruta estática `app/games/tetris/jugar/page.tsx`, igual a la de Asteroids.
- Guardado de puntuación con `saveScore` y `setPlayerName` de `app/data/scores.ts`, con `game_id: "tetris"`.
- Leyenda de controles en `crt-bottom` (sustituye a la lista de controles del panel HTML original).
- Actualizar `CLAUDE.md` para reflejar que `tetris` es el segundo juego real del catálogo.

**Fuera de alcance (para otros specs):**

- Mecánicas modernas: hold, bolsa de 7 (7-bag), SRS, lock delay, DAS/ARR propios. El port es fiel: pieza aleatoria, wall kicks `[0, -1, 1, -2, 2]` y auto-repeat de teclado del sistema operativo.
- Controles táctiles o versión móvil.
- Sonido y música (el original no tiene audio).
- Pausa automática al perder el foco de la pestaña y pantalla completa.
- Interruptor de tema claro/oscuro del original (`tetris-theme`): se elimina.
- Motor o shell de reproductor compartido entre juegos (decisión de SPEC 04).
- Cambios de RLS, auth o tablas: `scores` ya sirve a todos los juegos; `user_id` sigue en `null`.
- Realtime en el leaderboard: las puntuaciones se ven al recargar (SPEC 05).
- Tests automatizados.

---

## Modelo de datos

No hay tablas ni columnas nuevas. `scores.game_id` ya referencia `games.id` y `best` se deriva de `scores` (SPEC 05).

### Fila de `games`

| Columna | Valor |
| ------- | ----- |
| id      | `tetris` |
| title   | `TETRIS` |
| short   | `Encaja las piezas, limpia líneas y no te quedes sin espacio.` |
| long    | `Las piezas caen sobre un tablero de 10×20. Muévelas, rótalas y encájalas para completar líneas. Cada 10 líneas sube el nivel y la caída se acelera. Ojo con la tuerca: una pieza gris con hueco en el centro.` |
| cat     | `PUZZLE` |
| cover   | `cover-tetris` |
| color   | `magenta` |

Migración `supabase/migrations/20261017000200_seed_game_tetris.sql` (modelo: `20261017000000_create_games_and_scores.sql`):

```sql
insert into public.games (id, title, short, long, cat, cover, color)
values (
  'tetris',
  'TETRIS',
  'Encaja las piezas, limpia líneas y no te quedes sin espacio.',
  'Las piezas caen sobre un tablero de 10×20. Muévelas, rótalas y encájalas para completar líneas. Cada 10 líneas sube el nivel y la caída se acelera. Ojo con la tuerca: una pieza gris con hueco en el centro.',
  'PUZZLE',
  'cover-tetris',
  'magenta'
);
```

### API del motor

Los tipos reales los fija la implementación; esto es el contrato:

```ts
// app/components/tetris/tetris-engine.ts
export type TetrisStats = { score: number; lines: number; level: number };

export type TetrisCallbacks = {
  onStats(stats: TetrisStats): void;      // solo cuando algún valor cambia, no cada frame
  onGameOver(finalScore: number): void;   // la pieza nueva colisiona al aparecer, o end()
};

export type TetrisHandle = {
  pause(): void;
  resume(): void;
  restart(): void;   // equivale a init(): tablero vacío, puntaje 0, líneas 0, nivel 1, en marcha
  end(): void;       // fuerza game over (botón FIN)
  destroy(): void;   // cancela requestAnimationFrame y quita los listeners
};

export function createTetris(
  canvas: HTMLCanvasElement,
  callbacks: TetrisCallbacks,
): TetrisHandle;
```

### Constantes y reglas del original que se conservan sin cambios

- `COLS = 10`, `ROWS = 20`, `BLOCK = 30`.
- `COLORS` (índices 1–8): `#4dd0e1` I, `#ffd54f` O, `#ba68c8` T, `#81c784` S, `#e57373` Z, `#90caf9` J, `#ffb74d` L, `#9e9e9e` N (tuerca).
- `PIECES`: las matrices de I, O, T, S, Z, J, L y N (tuerca `[[8,8,8],[8,0,8],[8,8,8]]`).
- Pieza aleatoria uniforme entre las 8 (`Math.floor(Math.random() * 8) + 1`); aparece en `x = floor(COLS/2) - floor(ancho/2)`, `y = 0`.
- Rotación horaria `rotateCW` (transponer + invertir filas) con wall kicks en este orden: `[0, -1, 1, -2, 2]`; si ninguno cabe, no rota.
- `LINE_SCORES = [0, 100, 300, 500, 800]` multiplicado por el nivel vigente al limpiar.
- Soft drop: +1 punto por fila. Si la pieza no puede bajar, `↓` la fija en el acto (comportamiento del original).
- Hard drop: +2 puntos por celda recorrida y fija la pieza.
- Nivel = `floor(líneas / 10) + 1`; intervalo de caída = `max(100, 1000 - (nivel - 1) * 90)` ms; arranca en 1000 ms.
- Pieza fantasma: proyección de la pieza actual hasta colisionar, dibujada con `globalAlpha = 0.2`.
- Game over: la pieza que aparece ya colisiona (`spawn`).
- Dibujo del bloque: cuadro relleno de `BLOCK - 2` con franja de brillo `rgba(255,255,255,0.12)` de 4 px.

### Cambios deliberados respecto al original

- **Sin DOM externo.** `SCORE`, `LINES`, `LEVEL` y `NEXT` se dibujan en el panel derecho del canvas (480×600). El canvas se rellena a sí mismo con un fondo oscuro fijo (`#1a1a25`) y rejilla fija (`#22222e`), porque el original los tomaba de variables CSS del `body`.
- **Se elimina el interruptor de tema.** No hay `tetris-theme` ni modo claro; el canvas usa una paleta fija oscura.
- **Se elimina la tecla `P`.** La pausa la dispara React con `pause()`/`resume()`; el overlay "EN PAUSA" lo dibuja React.
- **Se elimina el botón `Reiniciar` del overlay HTML.** En game over, ninguna tecla reinicia (ni `Espacio`); reinicia el modal de React con `restart()`. El overlay del canvas dice `GAME OVER` y `PUNTAJE: n`.
- **`preventDefault` en todas las teclas del juego** (`←` `→` `↑` `↓` `X` `Espacio`) mientras el juego está activo o en pausa y el foco no está en un `input`/`textarea`; el original solo lo hacía con `Espacio`, por lo que las flechas hacían scroll. En game over no se llama `preventDefault`, para que el modal siga usable con teclado.
- **Los listeners pasan de `document` a `window`** y se quitan en `destroy()`.
- **Sin `getComputedStyle`.** El dibujo no lee el DOM.
- **Pausa:** `update()` no corre mientras `paused`; el dibujo continúa; al reanudar se reinicia `lastTime` y `dropAccum` se conserva. El original no limita `dt`, y como `dropAccum` se pone en 0 tras cada caída, un `dt` grande solo provoca una caída extra; no se agrega tope.
- **Teclado en pausa:** las teclas de movimiento se ignoran mientras `paused` (igual que el original), pero siguen con `preventDefault`.

### Convenciones

- Coordenadas lógicas fijas en 480×600; en pantalla el canvas se escala con CSS dentro de `.crt-screen` manteniendo la proporción 4:5.
- Todo el estado (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropAccum`, `dropInterval`, `lastTime`, `animId`) vive en el cierre de `createTetris`; no hay variables de módulo mutables.
- `onStats` se emite solo cuando cambia `score`, `lines` o `level`: el motor compara con el último valor emitido antes de llamar al callback.
- `onGameOver` se emite **una sola vez por partida**. Si la partida ya terminó, `end()` no hace nada; `restart()` rearma el aviso.
- Tetris no tiene vidas: `TetrisStats` no lleva `lives` y el HUD de React sustituye la celda de vidas de Asteroids por `LÍNEAS`.
- Sin claves nuevas de `localStorage`: se usan `av_player_name` y la persistencia de `saveScore` de `app/data/`.

---

## Plan de implementación

Antes del paso 1: leer en `node_modules/next/dist/docs/` las guías de Client Components (`"use client"` y efectos), `cacheComponents` con `<Suspense>` y `metadata`, según `AGENTS.md`. Invocar `/frontend-design` antes de diseñar la portada (paso 1), según `CLAUDE.md`. Leer `app/components/asteroids/asteroids-player.tsx` y `app/games/asteroids/jugar/page.tsx` como modelo.

1. Crear `supabase/migrations/20261017000200_seed_game_tetris.sql`, aplicarla con `apply_migration`, regenerar `app/data/supabase/database.types.ts` y agregar `.cover-tetris` a `app/globals.css`. Verificar: `select id, cat, color, cover from games` devuelve `asteroids` y `tetris`; `/games` muestra la card TETRIS (PUZZLE, magenta, portada nueva); `/games/tetris` abre el detalle con estado vacío del leaderboard; JUGAR lleva a `/games/tetris/jugar` (404 hasta el paso 3).
2. Crear `app/components/tetris/tetris-engine.ts` con la API completa (`pause`, `resume`, `restart`, `end`, `destroy`, `onStats`, `onGameOver`), las constantes del original, el panel dibujado en canvas, el overlay `GAME OVER` del canvas y los cambios deliberados. Verificar: `npx tsc --noEmit` y `npm run lint` pasan; el archivo no contiene `document.`, `localStorage` ni `let` a nivel de módulo; `onGameOver` se emite una sola vez aunque se llame `end()` tras perder.
3. Crear `app/components/tetris/tetris-player.tsx` y `app/games/tetris/jugar/page.tsx` (Server Component con `export const instant = false`, `getGame("tetris")`, `generateMetadata` `Jugando TETRIS · Arcade Vault` y `notFound()` si falta). El componente monta `<canvas width=480 height=600>` en `.crt-screen`, crea el motor en `useEffect`, lo destruye en el cleanup y muestra el HUD de React (jugador, puntuación, líneas, nivel) con `onStats`. Verificar: `/games/tetris/jugar` muestra el juego jugable con ambos HUD sincronizados; `/games/asteroids/jugar` sigue igual.
4. Agregar PAUSA/REANUDAR (`pause()`/`resume()`), overlay "EN PAUSA", FIN (`end()`) y SALIR (`/games/tetris`). Verificar: con PAUSA la pieza deja de caer; al reanudar no hay salto; FIN abre el modal.
5. Agregar el modal de fin: se abre con `onGameOver`, muestra la puntuación final, campo de nombre pre-rellenado con `getPlayerName()`, GUARDAR PUNTUACIÓN (`saveScore` con `game_id: "tetris"` y `setPlayerName`), JUGAR DE NUEVO (`restart()` y cierra el modal) y VOLVER AL VAULT (`/games`). Verificar: tras perder se abre el modal; guardar inserta una fila en `scores` con `game_id = 'tetris'`, visible en `/games/tetris` y en `/salon` (tab TETRIS) tras recargar.
6. Teclado, escala y leyenda: `preventDefault` en las teclas del juego fuera de campos de texto (sin romper el campo de nombre del modal), `blur()` en los botones tras el clic, canvas escalado por CSS con `aspect-ratio: 4/5` y sin desbordar la altura de la ventana, y leyenda de controles (`← →` mover, `↑ X` rotar, `↓` bajar, `ESPACIO` caída) en `crt-bottom`. Verificar: la página no hace scroll al jugar; se puede escribir con espacios en el modal; el canvas se ve completo y sin deformar a 1440×900 y a 390×844.
7. Actualizar `CLAUDE.md` (juegos reales: `asteroids` y `tetris`; ruta estática y motor/reproductor de Tetris como segundo ejemplo del patrón). Verificar: `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.

Cada paso deja la app ejecutable y es commiteable por separado.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] La fila `tetris` existe en `games` con los valores de este spec, la migración está en `supabase/migrations/` y `database.types.ts` está regenerado.
- [ ] `/games` muestra la card TETRIS con categoría PUZZLE, color magenta y la portada `cover-tetris`; la card de Asteroids sigue igual.
- [ ] `/games/tetris` muestra el detalle y el leaderboard top 10 (o el estado vacío "Sé el primero en entrar al salón de la fama"); JUGAR navega a `/games/tetris/jugar`.
- [ ] `/salon` muestra el tab TETRIS junto al de ASTEROIDS y lista hasta 12 filas.
- [ ] Al abrir `/games/tetris/jugar` aparece el canvas de 480×600 con el tablero 10×20 vacío, una pieza cayendo y el panel con `SCORE 0`, `LINES 0`, `LEVEL 1` y la pieza `NEXT`.
- [ ] El HUD de React muestra jugador, puntuación 0, líneas 0 y nivel 01, y coincide en todo momento con el panel del canvas.
- [ ] `←` y `→` mueven la pieza una columna sin atravesar paredes ni bloques.
- [ ] `↑` y `X` rotan la pieza en sentido horario; pegada a una pared rota aplicando el wall kick (`0, -1, 1, -2, 2`).
- [ ] `↓` baja la pieza una fila y suma 1 punto; con la pieza apoyada, la fija.
- [ ] `Espacio` baja la pieza hasta el fondo, la fija y suma 2 puntos por celda recorrida.
- [ ] La pieza fantasma se dibuja con opacidad 0,2 donde aterrizará la pieza actual.
- [ ] Las 8 piezas aparecen en partidas largas, incluida la tuerca gris con hueco central.
- [ ] Completar 1, 2, 3 y 4 líneas a la vez en nivel 1 suma 100, 300, 500 y 800 puntos.
- [ ] Con 10 líneas el nivel pasa a 2 en ambos HUD y el intervalo de caída baja de 1000 a 910 ms; nunca baja de 100 ms.
- [ ] Cuando la pieza nueva colisiona al aparecer, el canvas muestra `GAME OVER` con `PUNTAJE: n` y se abre el modal de React con la misma puntuación.
- [ ] FIN termina la partida y abre el modal igual que un game over.
- [ ] Con el modal abierto, `Espacio` fuera del campo de nombre no reinicia ni deja caer piezas; dentro del campo se pueden escribir espacios; el campo limita a 10 caracteres en mayúsculas.
- [ ] Las teclas `P` y `Esc` no pausan ni hacen nada en el canvas, y no existe interruptor de tema; el motor no lee ni escribe `tetris-theme`.
- [ ] `onStats` no se invoca en los frames sin cambio de `score`, `lines` o `level`.
- [ ] Con PAUSA activa el canvas sigue dibujándose, pero las teclas de movimiento no mueven ni rotan la pieza.
- [ ] `onGameOver` se dispara una sola vez por partida (llamar FIN tras perder no abre un segundo modal).
- [ ] PAUSA detiene la caída, muestra "EN PAUSA" (de React) y cambia el botón a REANUDAR; REANUDAR continúa sin saltos.
- [ ] Con el juego activo, `←` `→` `↑` `↓` `Espacio` no hacen scroll de la página.
- [ ] GUARDAR PUNTUACIÓN inserta una fila en `scores` con `game_id: "tetris"`, el puntaje final y el nombre, deshabilita el botón tras el primer envío y la fila aparece en `/games/tetris` y en `/salon` al recargar.
- [ ] El nombre se pre-rellena desde `av_player_name` en la partida siguiente.
- [ ] JUGAR DE NUEVO cierra el modal y deja tablero vacío, puntuación 0, líneas 0 y nivel 1.
- [ ] SALIR navega a `/games/tetris` y VOLVER AL VAULT a `/games`.
- [ ] Tras salir y volver a entrar a `/games/tetris/jugar` (y en `npm run dev` con Strict Mode), una pulsación de `←` mueve la pieza una sola columna y la pieza cae a velocidad normal: no quedan loops ni listeners duplicados.
- [ ] `tetris-engine.ts` no usa `document.getElementById` ni variables de módulo mutables, y cada `addEventListener` tiene su `removeEventListener` en `destroy()`.
- [ ] Ningún archivo bajo `app/components/` accede a `localStorage` ni importa `@supabase/*`.
- [ ] La consola del navegador no muestra errores ni warnings de React durante una partida completa.
- [ ] El canvas se ve completo y sin deformar a 1440×900 y a 390×844.
- [ ] `CLAUDE.md` lista `tetris` como juego real del catálogo.
- [ ] Ninguna ruta existente (`/`, `/games`, `/games/asteroids`, `/games/asteroids/jugar`, `/salon`) devuelve 500.

---

## Decisiones

- **Sí:** `id` `tetris` y título `TETRIS`. Decisión del usuario; no choca con ninguna migración, carpeta ni ruta existente.
- **Sí:** categoría `PUZZLE` y color `magenta`. Decisión del usuario; cian ya lo usa Asteroids y el magenta encaja con la T púrpura.
- **Sí:** conservar las 8 piezas, incluida la tuerca. Decisión del usuario; es lo que hace el código del original aunque el README hable de 7, y el texto `long` la menciona.
- **No:** quitar la tuerca para dejar las 7 piezas estándar. Cambiaría el juego que se pidió portar.
- **Sí:** `TetrisStats = { score, lines, level }`. Decisión del usuario; son las tres cifras que el original lleva en su panel.
- **No:** incluir `next` en `TetrisStats`. La pieza siguiente se dibuja en el canvas, no en React.
- **Sí:** panel lateral dibujado en un canvas único de 480×600. Decisión del usuario; el motor recibe un solo canvas y el panel hace de HUD del canvas, que convive con el HUD de React (patrón de SPEC 04).
- **No:** canvas solo del tablero con `NEXT` en React. Obligaría a exponer la pieza siguiente por `onStats`.
- **Sí:** overlay `GAME OVER` en el canvas y listeners en `window`. Decisión del usuario; sigue el patrón de Asteroids.
- **Sí:** eliminar la tecla `P` y dejar la pausa solo por botón. Decisión del usuario; evita sumar un callback `onPause` a la API estándar.
- **Sí:** en game over ninguna tecla reinicia; reinicia solo el modal. Evita que `Espacio` (hard drop) cierre el modal por accidente y deja un único flujo de reinicio.
- **Sí:** eliminar el interruptor de tema claro/oscuro. Decisión del usuario; el vault ya tiene su tema CRT/neón y los componentes no pueden tocar `localStorage`.
- **No:** conservar el tema con un helper en `app/data/`. Añadiría un botón y una clave de `localStorage` sin relación con el leaderboard.
- **Sí:** `preventDefault` también en las flechas. Es un cambio necesario: en el original solo `Espacio` lo tenía y las flechas hacían scroll dentro de la página del vault.
- **Sí:** textos `short` y `long` con mención de la tuerca. Decisión del usuario.
- **Sí:** portada nueva `.cover-tetris`, diseñada con `/frontend-design`. Decisión del usuario; `.cover-tetro` se deja intacta.
- **Sí:** guardar la puntuación al terminar, top 10 en el detalle y 12 en el salón. Decisión del usuario; son los valores de SPEC 05 y no requieren código de lectura nuevo.
- **Sí:** el reproductor de Tetris duplica el armazón visual de `asteroids-player.tsx`. Duplicación aceptada a cambio de aislamiento (decisión de SPEC 04).
- **No:** motor, hook o shell de reproductor compartido con Asteroids. Con dos juegos reales sigue siendo pronto; se reevalúa en un spec aparte cuando llegue el tercer juego (Arkanoid), con tres casos reales para abstraer.
- **Sí:** doble HUD (panel del canvas + HUD de React) y ambos deben coincidir. Mantiene el juego legible como pieza autónoma dentro del canvas y la coherencia con Asteroids.
- **No:** modelar una "vida" artificial (1 vida que cae a 0 al perder) para encajar con el HUD de Asteroids. Tetris no tiene vidas; el HUD de React muestra `LÍNEAS` en su lugar y el tipo `TetrisStats` no lleva `lives`.
- **No:** segundo `<canvas>` para la pieza `NEXT`. El motor recibe un solo canvas y el panel de 180 px dibuja la pieza siguiente.
- **Sí:** `onGameOver` una sola vez por partida; `end()` tras game over es no-op. Evita un segundo modal si el jugador pulsa FIN justo al perder.
- **No:** INSERT manual en el SQL Editor de Supabase. El seed va como migración versionada en `supabase/migrations/` aplicada con `apply_migration` (convención de SPEC 05).
- **No:** `dynamic(..., { ssr: false })` en la página de juego. El canvas solo se toca dentro de `useEffect`, así que el Client Component es seguro en SSR sin él.
- **Sí:** leyenda de controles en `crt-bottom`, sustituyendo la lista del panel HTML del original.
- **No:** mecánicas modernas (hold, 7-bag, SRS, lock delay, DAS/ARR), controles táctiles, sonido, pausa por pérdida de foco ni pantalla completa. Decisión del usuario; cada uno es otro spec.
- **No:** limitar `dt`. El original no lo hace y `dropAccum` se reinicia en cada caída, así que un salto de tiempo solo produce una caída extra.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Strict Mode de Next en dev monta el efecto dos veces y deja dos loops o listeners activos (las piezas caerían al doble de velocidad y `←` movería dos columnas). | `destroy()` cancela `requestAnimationFrame` y quita los listeners; criterio de aceptación de una sola columna por pulsación. |
| `Espacio` activa el botón con foco (PAUSA/FIN) en lugar de hacer hard drop, o la página hace scroll con las flechas. | Paso 6: `preventDefault` en las teclas del juego fuera de inputs y `blur()` tras el clic; verificar en el navegador. |
| El `preventDefault` global impide escribir espacios en el campo de nombre del modal. | Ignorar el evento cuando el objetivo es `input`/`textarea`; criterio de aceptación específico. |
| `dt` salta tras la pausa o al cambiar de pestaña. | Reiniciar `lastTime` al reanudar; `dropAccum` se pone en 0 tras cada caída, así que el efecto máximo es una caída extra. |
| `onStats` provoca re-renders constantes (el soft drop cambia el puntaje en cada fila). | Emitir solo cuando cambia `score`, `lines` o `level`; comparar con el último valor emitido. |
| El canvas de 480×600 (4:5) es más alto que ancho y `.crt-screen`, pensado para 4:3 de Asteroids, lo recorta o lo desborda a 1440×900 o a 390×844. | Paso 6: `aspect-ratio: 4/5`, `max-width: 100%` y límite de altura; verificar a ambos tamaños. Si hace falta, ajustar solo con una clase propia del reproductor de Tetris. |
| El texto del panel dibujado en canvas se ve borroso al escalar por CSS. | Coordenadas lógicas fijas 480×600 y fuentes monoespaciadas ya cargadas por la app; verificar a 1440×900. |
| La pieza `N` (tuerca) con hueco central produce reglas de colisión o de rotación inesperadas en los wall kicks. | Se conserva la matriz del original (simétrica, rota a sí misma); criterio de aceptación de que las 8 piezas aparecen y rotan. |
| Un `game.js` con `let` de módulo y `init()` reutilizado acaba como estado compartido entre montajes. | Todo el estado dentro del cierre de `createTetris`; criterio y revisión del paso 2 (sin `let` a nivel de módulo). |
| `/games/tetris` y `/games/tetris/jugar` con id inexistente caen en el soft 404 de `cacheComponents`. | Aceptado en SPEC 05 (200 con UI de no encontrado y `noindex`); no se cambia aquí. |
| El motor accede a `canvas`/`window` durante el render del servidor y rompe SSR o el build. | Crear el motor solo dentro de `useEffect`; nada de acceso a `window` en el cuerpo del módulo ni del componente. |
| `FIN` pulsado a la vez que el game over natural dispara `onGameOver` dos veces y abre dos modales o guarda dos scores. | `onGameOver` una sola vez por partida y `end()` no-op tras game over; criterio de aceptación específico. |
| Cualquier cliente puede insertar scores falsos con la clave publicable (RLS permisiva). | Riesgo asumido en SPEC 05; se resuelve en el spec de seguridad. |

---

## Qué **no** está en este spec

- Arkanoid de `references/started-games/04-arkanoid`.
- Motor de juegos genérico, shell de reproductor compartido o cambios a `asteroids-player.tsx` o `asteroids-engine.ts`.
- Mecánicas modernas de Tetris (hold, 7-bag, SRS, lock delay, DAS/ARR), controles táctiles, sonido, pausa por pérdida de foco y pantalla completa.
- Interruptor de tema claro/oscuro.
- Cambios de tablas, RLS, auth o `scores`.
- Tests automatizados.

Cada uno, si llega, va en su propio spec.
