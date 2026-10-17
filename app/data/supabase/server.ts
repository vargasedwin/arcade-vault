import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

// Cliente para Server Components y route handlers. cookies() es una API de
// request-time: con cacheComponents solo debe llamarse desde código dinámico
// (route handlers o Server Components dentro de <Suspense>).
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) throw new Error("Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL");
  if (!key) {
    throw new Error("Falta la variable de entorno NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Llamado desde un Server Component, donde no se pueden escribir cookies.
          // Se ignora: el refresco de sesión irá en proxy.ts (spec de auth).
        }
      },
    },
  });
}
