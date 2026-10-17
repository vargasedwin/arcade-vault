import "server-only";
import type { Game } from "./games";
import { createClient } from "./supabase/server";

// Lecturas con el cliente server: solo dentro de <Suspense> bajo cacheComponents.
export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`No se pudieron leer los juegos: ${error.message}`);
  return data;
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer el juego ${id}: ${error.message}`);
  return data;
}
