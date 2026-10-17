# SPEC 04 — Primer juego jugable: Asteroids

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-17
> **Objective:** Portar el juego Asteroids de `references/started-games/02-asteroids/` a un juego nuevo del catálogo (`/games/asteroids`) con su propio reproductor en `/games/asteroids/jugar`, donde el canvas conserva su HUD y sus controles, y avisa a React del puntaje, las vidas, el nivel y el game over.

---

## Por qué existe este spec

Hoy el reproductor (`game-player.tsx`) es una simulación: suma puntaje aleatorio sobre una arena decorativa. Asteroids es el primer juego real y fija el patrón con el que se integrarán los siguientes (Tetris, Arkanoid). Por eso se decide aquí que cada juego vive aislado, con su propia ruta de reproductor, y que el contenedor React y el canvas se comunican por una API explícita, sin variables globales.

El juego de referencia (`game.js`, 510 líneas) es un script de navegador: usa `document.getElementById`, escucha `keydown`/`keyup` en `window`, arranca solo con `initGame()` y no tiene forma de pausarse ni de detenerse. Para vivir dentro de un Client Component hay que encapsularlo.

**Asteroids no es ROCAS.** El catálogo ya tiene `rocas` (SHOOTER, simulado, con OVNIs en su texto). Son entradas distintas: `rocas` no se toca y no se mezcla con este juego.

---

## Alcance

**Dentro:**

- Entrada nueva en `GAMES` de `app/data/games.ts`: `asteroids`, título `ASTEROIDS`, categoría `SHOOTER`, color `cyan`, portada `cover-asteroids`. Se agrega al final (9 juegos).
- Clase `.cover-asteroids` en `app/globals.css` con una portada propia (nave triangular y asteroides poligonales en vectorial).
- Motor del juego en `app/components/asteroids/asteroids-engine.ts`: port de `game.js` a TypeScript, encapsulado en `createAsteroids(canvas, callbacks)`, sin globals ni acceso al DOM fuera del canvas recibido.
  - Se conservan las reglas del original: lógica, constantes, dibujo vectorial blanco sobre negro, canvas 800×600, envolvimiento toroidal, 3 vidas, invencibilidad de 3 s al reaparecer, división de asteroides en 3 tamaños, partículas y el power-up de triple disparo (`3x`).
  - Se conserva el **HUD dibujado en el canvas** (SCORE, NIVEL, vidas, contador del `3x`) y el overlay `GAME OVER` del canvas.
- Reproductor propio del juego en `app/components/asteroids/asteroids-player.tsx` (Client Component) que monta el canvas y muestra, además, el **HUD de React** (jugador, puntuación, vidas, nivel), los botones PAUSA/REANUDAR, FIN y SALIR, el overlay "EN PAUSA" y el modal de fin de juego (guardar puntuación, JUGAR DE NUEVO, VOLVER AL VAULT). Ambos HUD conviven.
- Ruta estática `app/games/asteroids/jugar/page.tsx`, que Next prioriza sobre `app/games/[id]/jugar/`. `GamePlayer` genérico y `[id]/jugar` **no se modifican**.
- API de comunicación contenedor ↔ juego:
  - El canvas notifica a React: cambios de puntaje, vidas y nivel, y game over.
  - React controla: pausa, reanudar, reiniciar, terminar y destruir. El juego implementa la pausa; el contenedor decide cuándo.
- Teclado del original: `←` `→` rotan, `↑` propulsa, `Espacio` dispara. Mientras el juego está montado y el foco no está en un campo de texto, esas teclas no hacen scroll de la página.
- Guardado de puntuación con `saveScore` existente (`app/data/scores.ts`), con `game: "asteroids"`.
- Leyenda de controles en la barra inferior del CRT (`crt-bottom`).
- Actualizar `CLAUDE.md` con el patrón de juego aislado (ruta estática, motor + reproductor, API de callbacks).

**Fuera de alcance (para otros specs):**

- Controles táctiles o versión móvil.
- Recolorear el juego al tema neón: se mantiene el vectorial blanco del original.
- OVNIs y cualquier mecánica nueva (el juego se porta tal cual).
- Motor de juegos genérico o compartido entre juegos (decisión: cada juego es específico y aislado).
- Modificar `GamePlayer` o `[id]/jugar` para los otros 8 juegos; siguen simulados.
- Leaderboards reales, puntuaciones en Supabase y auth. El guardado sigue en `localStorage` (`av_scores`).
- Sonido, pausa automática al perder el foco de la pestaña, pantalla completa.
- Tests automatizados.

---

## Modelo de datos

Entrada nueva del catálogo (valores `best` y `plays` son mock, como en el resto de entradas):

```ts
// app/data/games.ts — se agrega al final de GAMES
{
  id: "asteroids",
  title: "ASTEROIDS",
  short: "Rota, propulsa y dispara entre rocas en el vacío.",
  long: "Tu nave triangular flota en un espacio sin bordes. Rota, propulsa y dispara para partir cada roca en fragmentos más pequeños. Recoge el 3x para disparar en abanico. Tienes tres vidas.",
  cat: "SHOOTER",
  cover: "cover-asteroids",
  color: "cyan",
  best: 32600,
  plays: "2.1K",
}
```

API pública del motor (los tipos reales los fija la implementación; esto es el contrato):

```ts
// app/components/asteroids/asteroids-engine.ts
export type AsteroidsStats = { score: number; lives: number; level: number };

export type AsteroidsCallbacks = {
  onStats(stats: AsteroidsStats): void;   // solo cuando algún valor cambia, no cada frame
  onGameOver(finalScore: number): void;   // vidas = 0 o end()
};

export type AsteroidsHandle = {
  pause(): void;
  resume(): void;
  restart(): void;   // initGame(): puntaje 0, vidas 3, nivel 1
  end(): void;       // fuerza game over (botón FIN)
  destroy(): void;   // cancela requestAnimationFrame y quita los listeners
};

export function createAsteroids(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsHandle;
```

Convenciones:

- Coordenadas lógicas del canvas fijas en 800×600; en pantalla el canvas se escala con CSS manteniendo 4:3 dentro de `.crt-screen`.
- Todo el estado del juego (nave, balas, asteroides, partículas, power-ups, `score`, `lives`, `level`, `state`) vive en el cierre de `createAsteroids`, no en variables de módulo.
- Constantes y tablas del original sin cambios: `RADII = [0,16,30,50]`, `SPEEDS = [0,85,55,32]`, `POINTS = [0,100,50,20]`, `POWERUP_DROP_CHANCE = 0.15`, `POWERUP_DURATION = 5`, `POWERUP_TTL = 12`, `TRIPLE_SPREAD = 0.18`.
- Cambio deliberado respecto al original: en game over la tecla `Espacio` **ya no reinicia** (reinicia el modal de React vía `restart()`); el subtítulo del overlay del canvas pasa de `PUNTAJE: n — ESPACIO PARA REINICIAR` a `PUNTAJE: n`.
- Pausa: `update()` no corre mientras `paused`; el dibujo continúa; al reanudar se reinicia `lastTime` para que `dt` no salte, y se limpian `keys`/`justPressed`. El texto "EN PAUSA" lo dibuja React, no el canvas.
- Claves de `localStorage`: sin claves nuevas; se usa `av_scores` mediante `saveScore`.

---

## Plan de implementación

Antes del paso 1: leer en `node_modules/next/dist/docs/` las guías de Client Components (`"use client"` y efectos), precedencia de segmentos estáticos sobre dinámicos, `cacheComponents` y `metadata`, según `AGENTS.md`. Invocar `/frontend-design` antes de diseñar la portada (paso 2), según `CLAUDE.md`.

1. Agregar la entrada `asteroids` a `GAMES` y la clase `.cover-asteroids` a `app/globals.css`. Verificar: `/games` muestra 9 tarjetas con ASTEROIDS al final; `/games/asteroids` abre el detalle con 10 filas de leaderboard; "JUGAR" lleva a `/games/asteroids/jugar` (aún el reproductor simulado).
2. Crear `app/components/asteroids/asteroids-engine.ts`: port completo de `game.js` dentro de `createAsteroids`, con `onStats`, `onGameOver` y el handle completo (`pause`, `resume`, `restart`, `end`, `destroy`), y los dos cambios deliberados de Modelo de datos. Verificar: `npx tsc --noEmit` y `npm run lint` pasan.
3. Crear `app/components/asteroids/asteroids-player.tsx` y `app/games/asteroids/jugar/page.tsx` (Server Component con `generateMetadata` en español: `Jugando ASTEROIDS · Arcade Vault`, `getGame("asteroids")`, `notFound()` si falta). El componente monta el `<canvas width=800 height=600>` en `.crt-screen`, crea el motor en `useEffect`, lo destruye en el cleanup y muestra el HUD de React con `onStats`. Verificar: `/games/asteroids/jugar` muestra el juego jugable con ambos HUD sincronizados; el flujo `/games/rocas/jugar` sigue mostrando el reproductor simulado.
4. Agregar PAUSA/REANUDAR (`pause()`/`resume()`), el overlay "EN PAUSA", FIN (`end()`) y SALIR (`/games/asteroids`). Verificar: con PAUSA los asteroides quedan quietos; al reanudar no hay salto de movimiento; FIN termina la partida.
5. Agregar el modal de fin de juego: se abre con `onGameOver`, muestra la puntuación final, campo de iniciales, GUARDAR PUNTUACIÓN (`saveScore({ game: "asteroids", score, name })`), JUGAR DE NUEVO (`restart()` y cierra el modal) y VOLVER AL VAULT (`/games`). Verificar: tras perder las 3 vidas se abre el modal; guardar deja una entrada en `av_scores` con `game: "asteroids"`.
6. Manejo de teclado y escala: bloquear scroll por `←` `→` `↑` `Espacio` fuera de campos de texto (sin romper el campo de iniciales del modal), quitar el foco del botón tras pulsarlo para que `Espacio` no lo reactive, escalar el canvas con CSS manteniendo 4:3, y poner la leyenda de controles en `crt-bottom`. Verificar: la página no hace scroll al jugar; se puede escribir con espacios en el modal; el canvas se ve completo a 1440×900 y a 390×844.
7. Actualizar `CLAUDE.md` (patrón de juego aislado, rutas estáticas por juego, API de callbacks, lista de juegos reales vs simulados). Verificar: `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.

Cada paso deja la app ejecutable y es commiteable por separado.

---

## Criterios de aceptación

- [x] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [x] `/games` muestra 9 juegos; ASTEROIDS aparece con categoría SHOOTER, color cian y la portada `cover-asteroids`; la landing `/` sigue mostrando los mismos 6 juegos del riel.
- [x] `/games/asteroids` muestra el detalle con 10 filas de leaderboard y el botón "JUGAR" navega a `/games/asteroids/jugar`.
- [x] `/games/rocas` y `/games/rocas/jugar` se comportan igual que antes (reproductor simulado) y `game-player.tsx` no tiene cambios en el diff.
- [x] Al abrir `/games/asteroids/jugar` aparece el canvas de 800×600 con la nave en el centro, 4 asteroides grandes fuera de un radio de 130 px del centro y el HUD del canvas (`SCORE 0`, `NIVEL 1`, 3 iconos de vida).
- [x] El HUD de React muestra jugador, puntuación 0, 3 vidas y nivel 01, y coincide en todo momento con el HUD del canvas.
- [x] `←` `→` rotan la nave, `↑` propulsa y `Espacio` dispara (cadencia máxima de una bala cada 0,2 s).
- [x] Con el juego activo, `←` `→` `↑` `Espacio` no hacen scroll de la página.
- [x] Destruir un asteroide grande suma 20, uno mediano 50 y uno pequeño 100, y la puntuación de React se actualiza.
- [x] Un choque con un asteroide (fuera de invencibilidad) baja las vidas de 3 a 2 en ambos HUD; la nave reaparece a los 2 s en el centro, parpadeando 3 s.
- [ ] Al destruir todos los asteroides el nivel pasa a 2 en ambos HUD y aparecen 5 asteroides grandes.
- [x] PAUSA detiene el movimiento de nave, balas y asteroides, muestra "EN PAUSA" (de React) y cambia el botón a REANUDAR; REANUDAR continúa sin saltos de posición.
- [x] Al perder la tercera vida el canvas muestra `GAME OVER` con `PUNTAJE: n` y se abre el modal de React con la misma puntuación final.
- [x] El botón FIN termina la partida y abre el modal igual que un game over.
- [x] Con el modal abierto, `Espacio` fuera del campo de iniciales no reinicia el juego; dentro del campo se pueden escribir espacios; el campo limita a 10 caracteres en mayúsculas.
- [x] GUARDAR PUNTUACIÓN muestra "▸ PUNTUACIÓN GUARDADA_" y deja en `av_scores` una entrada con `game: "asteroids"`, el puntaje final y el nombre.
- [x] JUGAR DE NUEVO cierra el modal y deja puntuación 0, 3 vidas, nivel 1 y un campo de asteroides nuevo.
- [x] SALIR navega a `/games/asteroids` y VOLVER AL VAULT a `/games`.
- [ ] Tras salir y volver a entrar a `/games/asteroids/jugar` (y en `npm run dev` con Strict Mode), una pulsación de `Espacio` dispara una sola bala y la nave se mueve a velocidad normal: no quedan loops ni listeners duplicados.
- [x] `asteroids-engine.ts` no usa `document.getElementById` ni variables de módulo mutables, y cada `addEventListener` tiene su `removeEventListener` en `destroy()`.
- [x] Ningún archivo bajo `app/components/` accede a `localStorage`; solo lo hace `app/data/`.
- [ ] La consola del navegador no muestra errores ni warnings de React durante una partida completa.
- [x] El canvas se ve completo y sin deformar a 1440×900 y a 390×844.
- [x] `CLAUDE.md` documenta el patrón de juego aislado.

---

## Decisiones

- **Sí:** Asteroids es un juego **nuevo** (`asteroids`, título `ASTEROIDS`) y no reemplaza a `rocas`. Decisión del usuario; son juegos distintos y no deben mezclarse.
- **No:** reutilizar o editar la entrada `rocas`. Su texto menciona OVNIs que este juego no tiene y su reproductor sigue simulado.
- **Sí:** reproductor aislado en ruta estática `app/games/asteroids/jugar/`. Decisión del usuario ("play-page separada"); un segmento estático gana sobre `[id]`, así que cada juego queda sin tocar a los demás.
- **No:** registro de componentes dentro de `[id]/jugar`. Haría que la ruta genérica conozca a todos los juegos.
- **Sí:** juego **específico**, encapsulado y que vive dentro del canvas. Decisión del usuario; el motor no se generaliza hasta que existan dos o tres juegos reales.
- **No:** motor genérico compartido. Se abstrae tarde, con ejemplos reales, no antes.
- **Sí:** el canvas notifica a React (`onStats`, `onGameOver`); React no lee el estado interno del juego. Decisión del usuario.
- **Sí:** la pausa está implementada en el juego pero la dispara el contenedor (`pause()`/`resume()`). Decisión del usuario; el botón PAUSA ya vive en el HUD de React.
- **Sí:** el game over lo detecta el canvas y React abre el modal. Decisión del usuario.
- **Sí:** se conserva el HUD del canvas y se agrega el de React; conviven. Decisión del usuario: no se borra el HUD del juego.
- **Sí:** `Espacio` deja de reiniciar en game over; reinicia solo el modal. Evita que la tecla de disparo cierre el modal por accidente y deje dos flujos de reinicio.
- **Sí:** `onStats` emite solo cuando cambia un valor. Evita re-renders de React a 60 fps.
- **Sí:** el estado del juego vive en el cierre de `createAsteroids`. Hace posible montar, destruir y volver a montar sin residuos (Strict Mode incluido).
- **Sí:** se conserva el vectorial blanco sobre negro, sin recolorear. El pedido es adaptar el juego existente; el marco CRT ya aporta el estilo del vault.
- **Sí:** el reproductor de Asteroids duplica el armazón visual de `GamePlayer` (HUD, CRT, modal) con las mismas clases CSS. Duplicación aceptada a cambio de aislamiento total.
- **No:** extraer un shell compartido ahora. Obligaría a tocar `GamePlayer`, que este spec deja intacto.
- **Sí:** leyenda de controles en `crt-bottom`. Supuesto de bajo riesgo para que el jugador sepa qué teclas usar; no fue pedido de forma explícita y se puede quitar sin impacto.
- **No:** controles táctiles, sonido, pausa por pérdida de foco ni pantalla completa. Cada uno es otro spec.
- **Sí:** `localStorage` vía `saveScore` sin cambios. Persistencia real llega con los specs de auth y puntuaciones.
- **Sí:** `best` y `plays` de la entrada son datos mock, como en el resto del catálogo.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Strict Mode de Next en dev monta el efecto dos veces y deja dos loops o listeners de teclado activos (el juego iría al doble de velocidad). | `destroy()` cancela `requestAnimationFrame` y quita los listeners; criterio de aceptación de una sola bala por `Espacio`. |
| `Espacio` activa el botón con foco (PAUSA/FIN) en lugar de disparar, o la página hace scroll. | Paso 6: `preventDefault` en las teclas de juego fuera de campos de texto y quitar el foco del botón tras el clic; verificar en el navegador. |
| El `preventDefault` global impide escribir espacios en el campo de iniciales del modal. | Ignorar el evento cuando el objetivo es `input`/`textarea`; criterio de aceptación específico. |
| `dt` salta tras la pausa o tras cambiar de pestaña y los objetos se teletransportan. | Reiniciar `lastTime` al reanudar; se conserva el tope de `dt` en 50 ms del original. |
| `onStats` provoca re-renders constantes y baja el rendimiento. | Emitir solo al cambiar puntaje, vidas o nivel. |
| El canvas escalado por CSS se ve borroso o deforma la proporción en móvil. | Mantener 800×600 lógico con `aspect-ratio: 4/3` y `max-width: 100%`; criterio a 1440×900 y 390×844. |
| El catálogo pasa de 8 a 9 juegos y los criterios del SPEC 02 que dicen "8 juegos" quedan desactualizados. | Es esperado: el SPEC 02 está implementado y no se reescribe; la landing usa `slice(0, 6)` y no cambia. |
| Una ruta estática `app/games/asteroids/` junto a `app/games/[id]/` genera confusión en `generateStaticParams` o tipos de ruta. | `[id]` seguirá generando `/games/asteroids` (detalle); solo `jugar` se sobreescribe. Verificar con `next build` y `PageProps` regenerados. |

---

## Qué **no** está en este spec

- Los otros 8 juegos del catálogo: siguen simulados.
- Motor de juegos genérico, shell de reproductor compartido o cambios a `GamePlayer`.
- Controles táctiles, sonido, pantalla completa, OVNIs y mecánicas nuevas.
- Recolorear el juego al tema neón.
- Leaderboards reales, guardado en Supabase y autenticación.
- Tetris y Arkanoid de `references/started-games/`.
- Tests automatizados.

Cada uno, si llega, va en su propio spec.
