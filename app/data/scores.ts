import type { NeonColor } from "./games";
import { createClient } from "./supabase/client";
import type { Database } from "./supabase/database.types";

export type ScoreRow = Database["public"]["Tables"]["scores"]["Row"];

export type RecentScore = {
  player: string;
  game: string;
  score: number;
  ago: string;
  color: NeonColor;
};
export type TopPlayer = {
  rank: number;
  player: string;
  score: number;
};
export type LeaderboardRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
};
export type NewScore = {
  game: string;
  score: number;
  name: string;
};

// Nombre del jugador para el leaderboard; independiente del nick de sesión (av_user).
const PLAYER_NAME_KEY = "av_player_name";

export function getPlayerName(): string | null {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY);
  } catch {
    // localStorage no disponible: no hay nombre recordado.
    return null;
  }
}

export function setPlayerName(name: string): void {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name);
  } catch {
    // localStorage no disponible: el nombre no se recuerda para la próxima partida.
  }
}

// Filas de `scores` ya ordenadas por score DESC → filas de UI con rank y fecha.
// Pura: la usan la versión servidor (scores.server.ts) y la de browser.
export function toLeaderboardRows(rows: ScoreRow[]): LeaderboardRow[] {
  return rows.map((r, i) => {
    const [y, m, d] = r.created_at.slice(0, 10).split("-");
    return { rank: i + 1, name: r.player_name, score: r.score, date: `${d}/${m}/${y}` };
  });
}

// Versión browser, para recargar el leaderboard al cambiar de tab en el salón.
export async function getLeaderboard(
  gameId: string,
  limit: number,
): Promise<LeaderboardRow[]> {
  const supabase = createClient();
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

// Actividad de la landing: valores fijos del prototipo (home.jsx).
const RECENT_SCORES: RecentScore[] = [
  { player: "NEONFOX", game: "Caída", score: 184220, ago: "hace 2 min", color: "magenta" },
  { player: "PX_KAI", game: "Glotón", score: 96400, ago: "hace 5 min", color: "yellow" },
  { player: "Z3R0COOL", game: "Invasores", score: 54190, ago: "hace 8 min", color: "green" },
  { player: "VAULT_07", game: "Rocas", score: 41200, ago: "hace 12 min", color: "cyan" },
  { player: "GLITCHA", game: "Bloque Buster", score: 28450, ago: "hace 18 min", color: "cyan" },
  { player: "ARKADYA", game: "Serpentina", score: 7820, ago: "hace 24 min", color: "green" },
  { player: "CYBER_LU", game: "Ranaria", score: 18900, ago: "hace 31 min", color: "yellow" },
];

const TOP_PLAYERS: TopPlayer[] = [
  { rank: 1, player: "NEONFOX", score: 312840 },
  { rank: 2, player: "PX_KAI", score: 248110 },
  { rank: 3, player: "M00NRYU", score: 196720 },
  { rank: 4, player: "VAULT_07", score: 154300 },
  { rank: 5, player: "GLITCHA", score: 138900 },
];

export async function getRecentScores(): Promise<RecentScore[]> {
  return RECENT_SCORES;
}

export async function getTopPlayers(): Promise<TopPlayer[]> {
  return TOP_PLAYERS;
}

// Inserta el score en Supabase desde el browser. user_id es null hasta el spec de Auth.
export async function saveScore(entry: NewScore): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scores").insert({
    game_id: entry.game,
    player_name: entry.name,
    score: entry.score,
    user_id: null,
  });
  if (error) throw new Error(`No se pudo guardar la puntuación: ${error.message}`);
}
