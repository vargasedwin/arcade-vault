import "server-only";
import { toLeaderboardRows, type LeaderboardRow } from "./scores";
import { createClient } from "./supabase/server";

// Lectura con el cliente server: solo dentro de <Suspense> bajo cacheComponents.
export async function getLeaderboard(
  gameId: string,
  limit: number,
): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);
  if (error) {
    throw new Error(`No se pudo leer el leaderboard de ${gameId}: ${error.message}`);
  }
  return toLeaderboardRows(data);
}
