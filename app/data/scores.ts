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
export type SavedScore = {
  game: string;
  score: number;
  name: string;
  at: number;
};

const SCORES_KEY = "av_scores";

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

export async function saveScore(
  entry: Omit<SavedScore, "at">,
): Promise<void> {
  try {
    const all: SavedScore[] = JSON.parse(
      localStorage.getItem(SCORES_KEY) || "[]",
    );
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {
    // localStorage no disponible o JSON corrupto: la app sigue sin persistir.
  }
}
