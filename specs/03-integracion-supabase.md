# SPEC 03 — Integración base de Supabase en la app Next.js

> **Status:** Draft
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-17
> **Objective:** Conectar la app Next.js al proyecto Supabase existente con clientes de navegador y servidor tipados en `app/data/supabase/`, variables de entorno y carpeta de migraciones, sin crear tablas ni cambiar ninguna pantalla.

---

## Por qué existe este spec

Arcade Vault guarda hoy sesión y puntajes en `localStorage` (`av_user`, `av_scores`) y los rankings son datos semilla. El producto necesita base de datos, autenticación real y, más adelante, realtime y Edge Functions, y todo eso parte de tener a Supabase integrado. Este spec es deliberadamente **solo la base**: deja la conexión, el entorno y el versionado de esquema listos para que los specs siguientes (auth, perfiles, puntuaciones, leaderboards reales) se concentren en su lógica y no en la plomería.

Estado verificado del proyecto Supabase al escribir este spec (vía MCP):

- URL: `https://ydpynaeesipudonboqbr.supabase.co`.
- Esquema `public` sin tablas y sin migraciones aplicadas.

---

## Alcance

**Dentro:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (clave publicable moderna `sb_publishable_...`) en `.env.local`, más `.env.example` versionado sin valores secretos.
- Dos helpers tipados en `app/data/supabase/`:
  - `client.ts`: `createClient()` para Client Components (`createBrowserClient`).
  - `server.ts`: `createClient()` asíncrono para Server Components y route handlers (`createServerClient` con `cookies()`).
- `app/data/supabase/database.types.ts`: tipos generados con el MCP de Supabase (`generate_typescript_types`), usados como genérico `Database` en ambos clientes.
- Carpeta `supabase/migrations/` en la raíz del repo, lista para recibir los `.sql` de los specs siguientes.
- Verificación de conexión con un health check temporal (se elimina al final del plan).
- Actualizar `CLAUDE.md` con la sección de Supabase (ubicación de clientes, variables, regla de acceso).

**Fuera de alcance (para otros specs):**

- Autenticación real (email + contraseña) y reemplazo de `/auth`. Spec posterior.
- `proxy.ts` de refresco de sesión por cookies. Va con el spec de auth, cuando exista una sesión que refrescar.
- Modo invitado: cuando se implemente, el invitado **no** guarda en la base. Spec posterior.
- Tablas de dominio (`profiles`, `scores`, etc.), RLS y migraciones de esquema.
- Persistencia de puntuaciones y lectura de leaderboards, salón y landing desde la base.
- Realtime y Edge Functions.
- OAuth (Google/GitHub), magic link.
- Migrar o eliminar `localStorage` (`av_user`, `av_scores`): sigue funcionando igual.
- Supabase local con CLI/Docker.
- Tests automatizados.

---

## Modelo de datos

Este spec no introduce estructuras de dominio nuevas ni tablas. Solo agrega:

```ts
// app/data/supabase/client.ts
export function createClient(): SupabaseClient<Database>              // navegador

// app/data/supabase/server.ts
export async function createClient(): Promise<SupabaseClient<Database>> // servidor, lee cookies()

// app/data/supabase/database.types.ts
export type Database = { /* generado; hoy el esquema public está vacío */ }
```

Variables de entorno:

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Convenciones:

- Solo `app/data/` importa de `@supabase/*` y de `app/data/supabase/`. Componentes y páginas siguen sin conocer el origen de los datos (regla del SPEC 01, ahora extendida a Supabase).
- Solo se usa la clave **publicable**. La `service_role` / clave secreta no se guarda en el repo ni en variables `NEXT_PUBLIC_*`.
- Si faltan las variables de entorno, los helpers lanzan un error explícito con el nombre de la variable que falta.
- `.gitignore` ya ignora `.env*`; se agrega la excepción `!.env.example`.

---

## Plan de implementación

Antes del paso 1: leer en `node_modules/next/dist/docs/` las guías de variables de entorno, `cookies()` bajo `cacheComponents`, route handlers y `proxy`, según `AGENTS.md`; y la guía de Supabase para Next.js con `@supabase/ssr` (MCP `search_docs`).

1. Instalar `@supabase/supabase-js` y `@supabase/ssr`. Verificar: `npm run build` sigue pasando.
2. Crear `.env.example`, agregar `!.env.example` a `.gitignore` y crear `.env.local` con la URL y la clave publicable obtenidas con el MCP (`get_project_url`, `get_publishable_keys`). Verificar: `git status` muestra `.env.example` y no `.env.local`.
3. Generar `app/data/supabase/database.types.ts` con el MCP `generate_typescript_types`. Verificar: el archivo exporta `Database`.
4. Crear `app/data/supabase/client.ts` con `createClient()` tipado, validando las variables. Verificar: `npx tsc --noEmit` pasa.
5. Crear `app/data/supabase/server.ts` con `createClient()` asíncrono usando `cookies()` de `next/headers`. Verificar: `tsc` pasa.
6. Crear la ruta temporal `app/api/supabase-health/route.ts` que usa el cliente de servidor, llama a `GET {URL}/auth/v1/settings` con el header `apikey` y devuelve `{ ok: true }` si responde 200. Verificar con `npm run dev`: `GET /api/supabase-health` devuelve `{"ok":true}`; con la clave alterada devuelve `ok: false`.
7. Crear `supabase/migrations/.gitkeep`. Verificar: la carpeta existe y está versionada.
8. Eliminar `app/api/supabase-health/` y actualizar `CLAUDE.md` (sección Supabase: ubicación, variables, regla de acceso, carpeta de migraciones). Verificar: `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.

Cada paso deja la app ejecutable y es commiteable por separado.

---

## Criterios de aceptación

- [ ] `npm run lint`, `npx tsc --noEmit` y `npm run build` terminan sin errores.
- [ ] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr`.
- [ ] Existen `app/data/supabase/client.ts`, `app/data/supabase/server.ts` y `app/data/supabase/database.types.ts`, y ambos clientes usan `Database` como genérico.
- [ ] `.env.example` está versionado con las dos variables vacías; `.env.local` no aparece en `git status`.
- [ ] Con `npm run dev` y el health check temporal, la llamada al servidor responde `ok: true` contra `https://ydpynaeesipudonboqbr.supabase.co`; con una clave inválida responde `ok: false`.
- [ ] Sin las variables de entorno, `createClient()` lanza un error que nombra la variable faltante.
- [ ] El health check temporal fue eliminado: no existe `app/api/supabase-health/` en el commit final.
- [ ] Existe `supabase/migrations/` versionada y el esquema `public` del proyecto sigue sin tablas.
- [ ] Ningún archivo bajo `app/components/` ni las páginas importan `@supabase/*` ni `app/data/supabase/`.
- [ ] La clave `service_role` / secreta no aparece en el repo (`grep` en el árbol sin coincidencias).
- [ ] `/`, `/games`, `/auth` y `/salon` se comportan igual que antes (sesión y puntajes siguen en `localStorage`).
- [ ] `CLAUDE.md` documenta la integración de Supabase.

---

## Decisiones

- **Sí:** spec de solo integración. Auth, invitado, tablas, puntuaciones, realtime y Edge Functions se hacen en specs propios; mezclar todo haría un spec que toca más de tres áreas.
- **Sí:** proyecto Supabase existente administrado vía MCP, con los `.sql` versionados en `supabase/migrations/`. Decisión del usuario.
- **No:** Supabase local con CLI/Docker. No se pidió y agrega requisitos de entorno.
- **Sí:** `@supabase/supabase-js` + `@supabase/ssr` con helpers de navegador y servidor. El SSR de cookies será necesario para la auth real con App Router.
- **No:** solo `supabase-js`. Habría que reemplazarlo al implementar auth.
- **No:** `proxy.ts` de refresco de sesión en este spec. Sin login no hay sesión que refrescar; va con el spec de auth.
- **Sí:** clientes en `app/data/supabase/` en lugar de `lib/supabase/`. Mantiene la decisión del SPEC 01 de que todo acceso a datos vive en `app/data`.
- **Sí:** sin tablas de dominio en este spec (decisión del usuario). El diseño de `profiles` y `scores` depende de cómo se usen y se decide en sus specs.
- **Sí:** clave publicable `sb_publishable_...` en `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, recomendada por Supabase por su rotación independiente.
- **No:** clave `service_role` en la app. No hace falta aún y es un secreto de alto riesgo.
- **Sí:** tipos generados con el MCP y usados como genérico `Database`, para que las consultas de los specs siguientes salgan tipadas.
- **Sí:** health check temporal que se borra al terminar. Verifica la conexión real sin dejar una ruta pública.
- **No:** `/api/health` permanente. Agrega superficie pública sin un uso actual.
- **Sí:** `localStorage` intacto. Reemplazarlo es parte de los specs de auth y puntuaciones.

---

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Filtrar una clave secreta al repo o al bundle del cliente. | Solo se usa la clave publicable en `NEXT_PUBLIC_*`; `.env.local` ignorado; criterio de aceptación con `grep` del árbol. |
| `cookies()` bajo `cacheComponents` exige contexto dinámico y puede romper el build en Next 16. | Leer la guía antes del paso 5; el helper de servidor solo se llama desde código dinámico (route handlers, Server Components con `Suspense`). |
| `.env.example` queda ignorado por la regla `.env*` y no se versiona. | El paso 2 agrega `!.env.example` y verifica con `git status`. |
| Los tipos generados quedan desactualizados al crear tablas. | Cada spec con migraciones regenera `database.types.ts` como último paso. |
| Cambios hechos con el MCP en el proyecto remoto sin quedar en el repo. | Regla: todo cambio de esquema se aplica como migración con su `.sql` en `supabase/migrations/`. |

---

## Qué **no** está en este spec

- Autenticación real y reemplazo de `/auth`.
- Modo invitado con Supabase.
- Tablas, RLS y migraciones de esquema.
- Guardado y lectura de puntuaciones, perfiles y leaderboards reales.
- Realtime y Edge Functions.
- `proxy.ts` de sesión, OAuth y magic link.
- Supabase local y tests automatizados.

Cada uno, si llega, va en su propio spec.
