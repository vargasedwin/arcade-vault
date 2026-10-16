# SPEC 01 — MVP visual: pantallas de Arcade Vault

> **Status:** Implementado
> **Depends on:** Ninguno
> **Date:** 2026-10-16
> **Objective:** Portar a Next.js las 5 pantallas del prototipo `references/templates/` (biblioteca, detalle, reproductor, auth, salón de la fama) como rutas reales con datos mock tras una capa `app/data`, sin implementar ningún juego.

---

## Por qué existe este spec

`app/` sigue siendo el scaffold de `create-next-app`, pero el diseño ya está resuelto en el prototipo (React 18 + Babel en el navegador) y los estilos ya viven en `app/globals.css` (commit `de7a437`). Falta convertir el prototipo en rutas y componentes reales. La decisión no obvia es que **ningún componente toca `localStorage` ni los datos mock directamente**: todo pasa por `app/data`, para poder reemplazarlo por una base de datos sin cambiar las pantallas.

---

## Alcance

**Dentro:**

- Rutas del App Router:
  - `/` → Biblioteca (hero, búsqueda por nombre, chips de categoría, grilla de tarjetas, estado "NO HAY RESULTADOS").
  - `/juegos/[id]` → Detalle (portada, tags, descripción, stat-strip, leaderboard top 10, botones JUGAR AHORA / VOLVER AL VAULT).
  - `/juegos/[id]/jugar` → Reproductor (HUD, pausa, FIN, salir, marco CRT con arena decorativa, puntaje simulado por timer, modal de fin de juego con guardado de puntuación).
  - `/auth` → Iniciar sesión / Crear cuenta (pestañas), jugar como invitado, botones sociales inertes.
  - `/salon` → Salón de la Fama (tabs por juego, podio top 3, tabla top 12, fila "tu mejor marca" si hay sesión).
- Layout compartido: `Nav` (links, contador de créditos estático "CRÉDITOS · 03", botón de sesión, menú móvil con backdrop) y footer.
- Capa de datos en `app/data` (juegos, categorías, puntajes semilla, sesión, guardado de puntuación).
- Sesión y puntuaciones mock persistidas en `localStorage` (`av_user`, `av_scores`), accedidas solo desde `app/data`.
- Componentes en TypeScript (TSX) con imports reales; layout y espaciado nuevos con Tailwind; clases retro/neón ya existentes en `globals.css` reutilizadas tal cual.
- Estado 404 para `id` de juego inexistente.

**Fuera de alcance (para otros specs):**

- Cualquier juego jugable. La arena del reproductor es decorativa.
- Backend, base de datos, autenticación real, validación de formularios, OAuth real (Google/GitHub).
- Leer `av_scores` en detalle o salón: el salón y el detalle muestran solo puntajes semilla, igual que el prototipo.
- Créditos dinámicos, perfil/cuenta de usuario, menú desplegable de usuario (el botón de usuario cierra sesión directamente, como en el prototipo).
- Tests automatizados.
- Cambios de diseño respecto al prototipo.

---

## Modelo de datos

Todo vive en `app/data`. Los tipos se exportan desde ahí; los componentes no definen tipos de dominio propios.

```ts
// app/data/games.ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type NeonColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;          // slug: "bloque-buster", "caida", ...
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;       // clase CSS existente: "cover-bricks", "cover-tetro", ...
  color: NeonColor;
  best: number;
  plays: string;       // "12.4K" (texto, como en el prototipo)
};

export const GAMES: Game[];                       // los 8 juegos de references/templates/data.jsx
export const CATS: ("TODOS" | Category)[];

// app/data/scores.ts
export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date "DD/MM/2026"
export type SavedScore = { game: string; score: number; name: string; at: number }; // at = Date.now()

// app/data/session.ts
export type User = { name: string };              // MAYÚSCULAS, máx. 10 caracteres
```

Funciones públicas de la capa (asíncronas, para que el reemplazo por una base de datos no cambie las firmas):

```ts
// app/data/games.ts
getGames(): Promise<Game[]>
getGame(id: string): Promise<Game | null>

// app/data/scores.ts
getLeaderboard(gameId: string, limit: number): Promise<ScoreRow[]>   // determinista, usa seededScores
getUserBest(gameId: string, user: User): Promise<ScoreRow | null>    // marca simulada, igual que el prototipo
saveScore(entry: Omit<SavedScore, "at">): Promise<void>              // escribe en av_scores

// app/data/session.ts
getSession(): Promise<User | null>
signIn(user: User | null): Promise<void>                             // null = invitado
signOut(): Promise<void>
```

Convenciones:

- `seededScores(seed, count)` se porta tal cual desde el prototipo (mismo generador congruencial) para que los puntajes semilla sean idénticos. Las semillas se mantienen: detalle `id.length * 17 + 3` con 10 filas; salón `id.length * 23 + 7` con 12 filas.
- Claves de `localStorage`: `av_user` (objeto `User`) y `av_scores` (arreglo de `SavedScore`). Solo `app/data/session.ts` y `app/data/scores.ts` las conocen.
- Todo acceso a `localStorage` va dentro de `try/catch`; si falla, la app funciona sin persistir.
- Formato de números: `toLocaleString("es-ES")`.

---

## Plan de implementación

Antes del paso 1: leer en `node_modules/next/dist/docs/` las guías de rutas dinámicas (`params` asíncrono), `cacheComponents`, `generateStaticParams`, `notFound` y Client Components, según `AGENTS.md`.

1. Crear `app/data/games.ts` con tipos, `GAMES`, `CATS`, `getGames` y `getGame`. Verificar: `npx tsc --noEmit` pasa.
2. Crear `app/data/scores.ts` con `seededScores`, `getLeaderboard`, `getUserBest` y `saveScore`. Verificar: `tsc` pasa.
3. Crear `app/data/session.ts` con `getSession`, `signIn`, `signOut`.
4. Crear un proveedor de sesión de cliente (`app/components/session-provider.tsx`) que lea `getSession()` al montar y exponga `user`, `signIn`, `signOut` por contexto. Las pantallas consumen este contexto, nunca `app/data/session.ts` directamente.
5. Crear `app/components/nav.tsx` (con menú móvil) y `app/components/footer.tsx`; integrarlos en `app/layout.tsx` junto con `<main className="av-main">` y el proveedor. Verificar: `npm run dev` muestra Nav y footer sobre la página scaffold; el link activo se resalta según `usePathname()`.
6. Implementar `/` : `app/components/game-card.tsx` (tilt 3D con `useRef`) y `app/components/library.tsx` (búsqueda + chips + estado vacío); reescribir `app/page.tsx`. Verificar: filtrar por texto y categoría funciona.
7. Implementar `/juegos/[id]`: `app/juegos/[id]/page.tsx` + `app/components/game-detail.tsx`; `notFound()` si el juego no existe. Verificar: clic en tarjeta abre el detalle y el leaderboard muestra 10 filas.
8. Implementar `/auth`: `app/auth/page.tsx` + `app/components/auth-form.tsx`; al enviar llama `signIn` y navega a `/`; "Jugar como invitado" llama `signIn(null)`. Verificar: el Nav muestra el nombre en mayúsculas; recargar conserva la sesión.
9. Implementar `/salon`: `app/salon/page.tsx` + `app/components/hall-of-fame.tsx` (tabs, podio, tabla, fila "tu mejor marca" solo con sesión).
10. Implementar `/juegos/[id]/jugar`: `app/juegos/[id]/jugar/page.tsx` + `app/components/game-player.tsx` (HUD, pausa, FIN, SALIR, CRT, modal, `saveScore`, JUGAR DE NUEVO). Verificar: tras GUARDAR PUNTUACIÓN aparece "PUNTUACIÓN GUARDADA_" y `av_scores` en localStorage tiene la entrada.
11. Revisar `app/globals.css` contra el prototipo; agregar solo lo que falte. Ajustar `metadata` por ruta (título en español) si aplica.

Cada paso deja la app ejecutable y es commiteable por separado.

---

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores.
- [ ] `npx tsc --noEmit` termina sin errores.
- [ ] `/` muestra los 8 juegos; escribir "caí" deja solo CAÍDA; elegir la categoría SHOOTER deja INVASORES y ROCAS; una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Clic en una tarjeta o en JUGAR navega a `/juegos/<id>` del juego correcto.
- [ ] `/juegos/<id>` muestra tags, descripción, partidas, mejor global y exactamente 10 filas de leaderboard con las 3 primeras destacadas.
- [ ] `/juegos/no-existe` y `/juegos/no-existe/jugar` devuelven la página 404.
- [ ] JUGAR AHORA navega a `/juegos/<id>/jugar`; VOLVER AL VAULT navega a `/`.
- [ ] En el reproductor, el puntaje aumenta cada ~220 ms; PAUSA detiene el incremento y muestra "EN PAUSA"; REANUDAR lo retoma.
- [ ] FIN abre el modal con la puntuación final; GUARDAR PUNTUACIÓN muestra "PUNTUACIÓN GUARDADA_" y agrega una entrada con `game`, `score`, `name` y `at` al arreglo `av_scores`.
- [ ] JUGAR DE NUEVO reinicia puntaje (0), vidas (3) y nivel (01); VOLVER AL VAULT navega a `/`; SALIR navega a `/juegos/<id>`.
- [ ] En `/auth`, las pestañas alternan entre INICIAR SESIÓN y CREAR CUENTA (esta última muestra el campo de correo).
- [ ] Enviar el formulario con usuario "px_kai_extra" guarda `av_user` como `{"name":"PX_KAI_EXT"}`, redirige a `/` y el Nav muestra `PX_KAI_EXT`.
- [ ] Enviar el formulario con usuario vacío inicia sesión como `PLAYER1`.
- [ ] "Jugar como invitado" redirige a `/` y el Nav muestra "Iniciar Sesión".
- [ ] Recargar la página conserva la sesión; pulsar el nombre en el Nav la cierra y borra `av_user`.
- [ ] `/salon` muestra 8 tabs (uno por juego); cambiar de tab cambia podio y tabla; la tabla tiene 12 filas.
- [ ] En `/salon`, la fila "TU MEJOR MARCA EN <JUEGO>" aparece solo con sesión iniciada.
- [ ] Con ancho ≤ 768 px aparece el botón ≡ y abre/cierra el panel móvil con backdrop.
- [ ] Ningún archivo bajo `app/components/` ni las páginas importan `localStorage` ni acceden a `window.localStorage`; solo lo hace `app/data/`.
- [ ] Los puntajes semilla de un mismo juego son idénticos entre recargas.
- [ ] Las fuentes Press Start 2P, Courier Prime y JetBrains Mono cargan vía `next/font` (ya configurado en `app/layout.tsx`).

---

## Decisiones

- **Sí:** rutas reales del App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/auth`, `/salon`). URLs compartibles y uso real del framework.
- **No:** una sola página con `location.hash` como el prototipo. Habría que desmontarlo después.
- **Sí:** capa `app/data` con funciones `async`, aunque hoy lean de `localStorage` o memoria. Cambiar a una base de datos no altera las firmas ni las pantallas.
- **No:** `lib/` para los datos mock. Decisión del usuario: van en `app/data`.
- **Sí:** contexto de sesión (`SessionProvider`) para compartir el usuario entre Nav, auth, salón y reproductor sin que cada uno lea el almacenamiento.
- **Sí:** reproductor como réplica del prototipo (puntaje simulado, modal de fin de juego) para validar el flujo completo sin un juego real.
- **No:** reproductor estático con botones deshabilitados. No permitiría revisar el modal ni el guardado.
- **Sí:** `av_scores` se escribe pero no se lee en ninguna pantalla. Mantiene el alcance del prototipo; leerlo es un spec aparte.
- **Sí:** reutilizar `app/globals.css` como está (variables, CRT, scanlines, neón, animaciones) y usar Tailwind solo para layout, espaciado y componentes nuevos. El CSS ya fue migrado en `de7a437`.
- **No:** reescribir el CSS del prototipo en utilidades Tailwind. Riesgo de divergir visualmente.
- **Sí:** TypeScript con imports/exports reales; los hooks ya no necesitan alias por archivo.
- **Sí:** "tu mejor marca" del salón usa la marca simulada del prototipo vía `getUserBest`, no un cálculo real.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| `cacheComponents` y APIs de Next 16 difieren de lo conocido (`params` asíncrono, datos dinámicos). | Leer las guías en `node_modules/next/dist/docs/` antes de escribir rutas (primer paso del plan). |
| Desajuste de hidratación: el servidor no conoce la sesión de `localStorage`. | `SessionProvider` lee la sesión después de montar; el Nav renderiza el estado "sin sesión" hasta entonces. |
| `localStorage` deshabilitado (modo privado) o JSON corrupto. | `try/catch` en `app/data`; si falla, la sesión vive solo en memoria y la app sigue funcionando. |
| `Math.random()` en el puntaje simulado del reproductor rompe el render del servidor. | `game-player.tsx` es Client Component y el incremento corre solo dentro de `useEffect`. |
| Clases CSS del prototipo ausentes en `globals.css`. | Paso 11: auditoría contra `references/templates/styles.css`. |

---

## Qué **no** está en este spec

- Ningún juego jugable (la arena es decorativa).
- Backend, base de datos y autenticación real.
- OAuth real con Google o GitHub.
- Lectura de `av_scores` en detalle o salón.
- Créditos dinámicos, perfil de usuario y tests automatizados.

Cada uno, si llega, va en su propio spec.
