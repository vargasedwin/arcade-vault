import { createClient } from "@/app/data/supabase/server";

// TEMPORAL (SPEC 03, paso 6): se elimina en el paso 8.
export async function GET() {
  try {
    await createClient();
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
      cache: "no-store",
    });
    return Response.json({ ok: res.status === 200 });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "desconocido" },
      { status: 500 },
    );
  }
}
