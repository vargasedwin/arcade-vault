# SPEC 02 — Landing page en `/` y Biblioteca en `/games`

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-10-16
> **Objective:** Implementar en `/` la landing page del prototipo `references/templates/home-about/` (hero, por qué Arcade Vault, juegos, stats, actividad en vivo, precios y CTA final) y mover la Biblioteca y el detalle de juego a `/games`.

---

## Por qué existe este spec

El SPEC 01 dejó la Biblioteca en `/`. El prototipo nuevo (`references/templates/home-about/home.jsx`) separa dos pantallas: una landing de marketing y la biblioteca. Para que la landing sea la portada hay que liberar `/`, y eso arrastra cambios de rutas: Biblioteca en `/games` y detalle/reproductor bajo `/games/[id]`, un solo prefijo en inglés. Las URLs viejas (`/juegos/...`) deben seguir funcionando con un redirect, porque ya son enlaces compartibles.

El `home-about/styles.css` es el `styles.css` anterior más 794 líneas añadidas (estilos de home y about); no cambia ninguna regla existente. Solo se porta lo que el home usa.

---

## Alcance

**Dentro:**

- Landing en `/`, réplica fiel de `home.jsx` con sus seis bloques:
  - Hero: eyebrow "▸ INSERTA UNA MONEDA_", título en 3 líneas, subtítulo, CTAs, indicador "DESLIZA" y 8 siluetas pixel flotantes.
  - `// 01 ¿POR QUÉ ARCADE VAULT?`: 4 tarjetas de características con ícono pixel.
  - `// 02 JUEGOS DISPONIBLES AHORA`: riel con 6 mini-tarjetas y botón "VER TODOS LOS JUEGOS →".
  - Stats: 3 bloques ("12+ JUEGOS", "MILES DE PARTIDAS", "GLOBAL RANKING").
  - `// 03 ACTIVIDAD EN VIVO`: "ÚLTIMAS PUNTUACIONES" (7 filas) y "TOP JUGADORES · HOY" (5 filas con barra) con link "VER SALÓN →".
  - `// 04 PRECIOS`: tarjeta "JUGADOR VAULT $0 / SIEMPRE" con 6 beneficios, 3 preguntas frecuentes y CTA final "¿LISTO PARA JUGAR?".
- Animación de entrada `.reveal` (clase `in` al entrar en viewport) mediante un hook de cliente `useReveal`.
- Rutas nuevas:
  - `/games` → Biblioteca (lo que hoy es `/`).
  - `/games/[id]` → Detalle (hoy `/juegos/[id]`).
  - `/games/[id]/jugar` → Reproductor (hoy `/juegos/[id]/jugar`).
- Redirect permanente de `/juegos/:path*` a `/games/:path*` en `next.config.ts`.
- Navegación:
  - Botones "EXPLORAR JUEGOS" y "VER TODOS LOS JUEGOS →" → `/games`; "CREAR CUENTA" y "EMPEZAR GRATIS →" → `/auth`; "VER SALÓN →" → `/salon`; "INSERTAR MONEDA →" → `/games`; clic en mini-tarjeta → `/games/<id>`.
  - Todos los links que hoy apuntan a la Biblioteca (`/`) pasan a `/games`: "VOLVER AL VAULT" del detalle, "VOLVER AL VAULT" del modal del reproductor, el botón del salón y los dos `router.push("/")` de `auth-form.tsx`.
  - El Nav gana el link "Inicio" (`/`); "Biblioteca" apunta a `/games`. El logo apunta a `/`, como en el prototipo.
- Estilos: agregar a `app/globals.css` las reglas de home que falten, tomadas de `references/templates/home-about/styles.css`.
- Datos mock de actividad y ranking en `app/data/scores.ts`, accedidos con funciones `async`.

**Fuera de alcance (para otros specs):**

- Página "Acerca de" y formulario de contacto (`about.jsx`). Es un spec aparte; el Nav **no** muestra "Acerca de" todavía.
- Datos reales o en vivo: "Actividad en vivo" y "Top jugadores" son fijos, igual que el prototipo.
- Precios reales, pagos, planes o cualquier backend.
- Cambios de diseño respecto al prototipo.
- Tests automatizados.
- SEO más allá de `metadata` en español para `/` y `/games`.

---

## Modelo de datos

Solo se agregan dos tipos y dos funciones en `app/data/scores.ts`. El resto del contenido de la landing (4 características, 3 stats, 6 beneficios, 3 FAQ, textos) es copia estática y vive dentro de los componentes, igual que en el prototipo.

```ts
// app/data/scores.ts
import type { NeonColor } from "./games";

export type RecentScore = {
  player: string;      // "NEONFOX"
  game: string;        // título legible: "Caída", "Bloque Buster"
  score: number;       // 184220
  ago: string;         // "hace 2 min"
  color: NeonColor;    // color neón del nombre del jugador
};

export type TopPlayer = {
  rank: number;        // 1..5
  player: string;
  score: number;
};

getRecentScores(): Promise<RecentScore[]>   // 7 filas, orden y valores fijos del prototipo
getTopPlayers(): Promise<TopPlayer[]>       // 5 filas, orden y valores fijos del prototipo
```

Convenciones:

- Los 7 valores de `getRecentScores` y los 5 de `getTopPlayers` se copian literalmente de `home.jsx`.
- Los 6 juegos del riel salen de `getGames()` con `.slice(0, 6)`, no se duplican.
- Formato de números: `toLocaleString("es-ES")`.
- Barra de cada fila de top: ancho `100 - i * 16` por ciento, como en el prototipo.
- No se introducen claves nuevas de `localStorage`.

---

## Plan de implementación

Antes del paso 1: leer en `node_modules/next/dist/docs/` las guías de `redirects` en `next.config.ts`, `Link`, Server y Client Components, `cacheComponents` y `metadata`, según `AGENTS.md`.

1. Crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` (Biblioteca) y metadata en español. `/` queda sin cambios. Verificar: `/games` muestra los 8 juegos.
2. Mover `app/juegos/[id]` a `app/games/[id]` (incluye `jugar/`) con `git mv`. Actualizar `PageProps<"/games/[id]">` y `PageProps<"/games/[id]/jugar">`, y los links `/juegos/...` en `game-card.tsx`, `game-detail.tsx` y `game-player.tsx`. Agregar `redirects()` en `next.config.ts` (`/juegos/:path*` → `/games/:path*`, `permanent: true`). Verificar: `/games/caida` abre el detalle; `/juegos/caida` y `/juegos/caida/jugar` redirigen a `/games/caida` y `/games/caida/jugar`.
3. Cambiar a `/games` los links a la Biblioteca en `game-detail.tsx`, `game-player.tsx`, `hall-of-fame.tsx` y los dos `router.push` de `auth-form.tsx`. En `nav.tsx`: agregar "Inicio" (activo solo con `pathname === "/"`), "Biblioteca" → `/games` (activo con `/games*`), en barra y panel móvil; el logo sigue en `/`. Verificar: `npx tsc --noEmit` pasa y el flujo detalle → VOLVER AL VAULT termina en `/games`.
4. Agregar a `app/globals.css` las reglas de home que falten, copiándolas de `references/templates/home-about/styles.css` (home, hero, siluetas, secciones, tarjetas, stats, actividad, precios, CTA final, `.reveal`). No tocar reglas existentes ni agregar las de about/contacto. Verificar: `npm run dev` compila sin errores de CSS.
5. Agregar `RecentScore`, `TopPlayer`, `getRecentScores` y `getTopPlayers` a `app/data/scores.ts`. Verificar: `tsc` pasa.
6. Crear `app/components/use-reveal.ts` (hook de cliente con `IntersectionObserver`, umbral 0.12, añade `in` y deja de observar), `app/components/feature-icon.tsx` (4 íconos SVG: GAMEPAD, FREE, TROPHY, ROCKET) y `app/components/home-silhouettes.tsx` (las 8 siluetas `s1`–`s8`).
7. Crear `app/components/mini-card.tsx` (portada con `cover-bg` + título + categoría, envuelta en `Link` a `/games/<id>`) y `app/components/home.tsx` (Client Component) con el hero y la sección `// 01`. Reescribir `app/page.tsx` como Server Component que obtiene datos y renderiza `<Home />`, con `metadata` en español. Verificar: `/` muestra hero y las 4 tarjetas; "EXPLORAR JUEGOS" navega a `/games`.
8. Agregar a `home.tsx` la sección `// 02` (6 mini-tarjetas desde `getGames()`) y el bloque de stats. Verificar: clic en una mini-tarjeta abre `/games/<id>`.
9. Agregar la sección `// 03` (últimas puntuaciones y top jugadores desde `getRecentScores()` y `getTopPlayers()`). Verificar: 7 filas y 5 filas; "VER SALÓN →" navega a `/salon`.
10. Agregar la sección `// 04` (tarjeta de precios, FAQ) y el CTA final. Verificar: "EMPEZAR GRATIS →" navega a `/auth`; "INSERTAR MONEDA →" navega a `/games`.
11. Comparar `/` contra el prototipo con Playwright: servir `references/templates/home-about/` por HTTP, abrir ambos a 1440×900 y a 390×844, y corregir diferencias de CSS hasta que coincidan. Ajustar `metadata` por ruta si aplica.

Cada paso deja la app ejecutable y es commiteable por separado.

---

## Criterios de aceptación

- [x] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [x] `/` muestra la landing; `/games` muestra los 8 juegos de la Biblioteca con búsqueda y chips funcionando como en el SPEC 01.
- [x] `/games/caida` muestra el detalle con 10 filas de leaderboard y `/games/caida/jugar` abre el reproductor.
- [x] `/juegos/caida` responde con redirect permanente a `/games/caida`, y `/juegos/caida/jugar` a `/games/caida/jugar`.
- [x] `/games/no-existe` y `/games/no-existe/jugar` devuelven la página 404.
- [x] En el hero aparecen el eyebrow con cursor parpadeante, las 3 líneas del título ("EL ARCADE" / "CLÁSICO ESTÁ" / "DE VUELTA"), el subtítulo, los botones "EXPLORAR JUEGOS" y "CREAR CUENTA", el indicador "DESLIZA" y 8 siluetas.
- [x] "EXPLORAR JUEGOS" y "VER TODOS LOS JUEGOS →" navegan a `/games`; "CREAR CUENTA" y "EMPEZAR GRATIS →" a `/auth`; "VER SALÓN →" a `/salon`; "INSERTAR MONEDA →" a `/games`.
- [x] La landing tiene 4 tarjetas de características, 6 mini-tarjetas, 3 bloques de stats, 7 filas en "ÚLTIMAS PUNTUACIONES", 5 filas en "TOP JUGADORES · HOY" (con `#01`…`#05`, las 3 primeras destacadas), 6 beneficios, 3 preguntas frecuentes y el CTA final.
- [x] La primera mini-tarjeta es BLOQUE BUSTER y las 6 salen de `getGames()`; clic en una abre `/games/<id>` de ese juego.
- [x] Las secciones con `.reveal` obtienen la clase `in` al entrar en viewport al hacer scroll, y no antes.
- [x] Desde el detalle y el reproductor, "VOLVER AL VAULT" navega a `/games`; en el salón, el botón de volver también.
- [x] Tras enviar el formulario de `/auth` (y tras "Jugar como invitado") la app redirige a `/games`.
- [x] El Nav muestra "Inicio", "Biblioteca" y "Salón de la Fama" (sin "Acerca de"); "Inicio" está activo solo en `/` y "Biblioteca" en `/games` y sus subrutas; el panel móvil muestra los mismos links.
- [x] El logo del Nav navega a `/`.
- [ ] Con ancho ≤ 768 px la landing no genera scroll horizontal y el menú ≡ abre y cierra el panel móvil.
- [x] La captura de `/` a 1440×900 coincide con la del prototipo servido por HTTP en layout, textos, fuentes y colores; solo difieren las fases de animación y el badge de Next.js en modo dev.
- [x] Ningún archivo bajo `app/components/` ni las páginas acceden a `localStorage`; solo lo hace `app/data/`.
- [x] No queda ninguna referencia a `/juegos` en `app/` fuera de `next.config.ts`.

---

## Decisiones

- **Sí:** landing en `/` y Biblioteca en `/games`. Decisión del usuario; la portada del sitio pasa a ser marketing, como en el prototipo.
- **No:** Biblioteca en `/biblioteca` o `/juegos`. Se eligió `/games`, en minúscula, por decisión del usuario.
- **Sí:** mover también `/juegos/[id]` a `/games/[id]` para tener un solo prefijo. Decisión del usuario.
- **Sí:** redirect `/juegos/:path*` → `/games/:path*` en `next.config.ts`, con `permanent: true` (308). Las URLs viejas ya eran compartibles y el destino es definitivo.
- **No:** dejar las rutas viejas sin redirect. Rompería enlaces ya compartidos.
- **Sí:** el logo del Nav va a `/` (landing). Es lo que hace el prototipo y es lo esperable de un logo; solo "Biblioteca" y los "VOLVER AL VAULT" apuntan a `/games`.
- **Sí:** "Inicio" en el Nav. Decisión del usuario.
- **Sí:** datos de actividad y ranking tras `app/data` con funciones `async`, igual que el resto de datos mock (convención del SPEC 01). Cambiar a un backend no tocará los componentes.
- **No:** incrustar esos datos en el componente. Habría que moverlos después.
- **Sí:** textos de características, stats, precios y FAQ como constantes dentro de los componentes. Es copy de marketing, no datos de dominio.
- **Sí:** `useReveal` como hook de cliente con `IntersectionObserver`, equivalente al del prototipo. Es lo que hace que la landing se vea igual.
- **No:** omitir las animaciones de reveal. La landing no quedaría idéntica al prototipo.
- **Sí:** botones de navegación como `Link` con las clases `btn` existentes, en lugar del `navigate()` del prototipo. Prefetch y navegación real de Next.
- **Sí:** copiar a `globals.css` solo las reglas de home del prototipo, sin reescribirlas con utilidades Tailwind. Mismo criterio del SPEC 01: evitar divergencias visuales.
- **No:** incluir About y Contacto aquí. El pedido fue "el home-page"; va en otro spec.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| `.reveal` oculta el contenido hasta que `in` se aplica; si el hook falla o el JS tarda, las secciones quedan invisibles. | El hook se ejecuta en `useEffect` al montar `Home`; verificar con scroll real y con navegación cliente desde otra ruta (el efecto debe volver a correr). |
| Mover rutas rompe tipos: `PageProps<"/juegos/[id]">` deja de existir. | Paso 2 actualiza los tipos y `tsc` debe pasar antes de continuar; los tipos de ruta se regeneran con `next dev` o `next build`. |
| Un redirect permanente (308) queda cacheado por el navegador. | Es intencional: el destino `/games` es definitivo. Si cambiara, habría que usar un redirect nuevo, no revertir. |
| Links a la Biblioteca que se omitan y sigan apuntando a `/` (ahora la landing). | Criterios de aceptación recorren cada flujo; se busca `href="/"` y `push("/")` en `app/` al terminar el paso 3. |
| `cacheComponents` y las APIs de Next 16 difieren de lo conocido (redirects, datos asíncronos en `page.tsx`). | Leer las guías en `node_modules/next/dist/docs/` antes de escribir (primer paso del plan). |
| Diferencias visuales por clases de home ausentes en `globals.css`. | Paso 4 copia las reglas y el paso 11 compara capturas con Playwright en escritorio y móvil. |

---

## Qué **no** está en este spec

- Página "Acerca de", formulario de contacto y link "Acerca de" en el Nav.
- Actividad, ranking o stats reales (todo es mock fijo).
- Precios, pagos o planes reales.
- Backend, base de datos y autenticación real.
- Cambios de diseño respecto al prototipo y tests automatizados.

Cada uno, si llega, va en su propio spec.
