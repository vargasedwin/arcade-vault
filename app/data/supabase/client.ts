import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Cliente para Client Components. Las variables NEXT_PUBLIC_* se leen con acceso
// estático (process.env.NOMBRE) para que Next las incruste en el bundle.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) throw new Error("Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL");
  if (!key) {
    throw new Error("Falta la variable de entorno NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return createBrowserClient<Database>(url, key);
}
