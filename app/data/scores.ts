import type { NeonColor } from "./games";
import type { User } from "./session";

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
export type ScoreRow = {
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

const PLAYERS = [
  "PX_KAI", "NEONFOX", "Z3R0COOL", "M00NRYU", "VAULT_07", "GLITCHA",
  "ATARI_KID", "CYBER_LU", "MAGENTA88", "SCANLINE", "BIT_LORD", "ARKADYA",
  "DROID_X", "RGB_QUEEN", "PIXEL_DAD", "RETROVIRA", "VECTORX", "JOY_STK",
];

export function seededScores(seed: number, count = 12): ScoreRow[] {
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const used = new Set<string>();
  const rows: ScoreRow[] = [];
  for (let i = 0; i < count; i++) {
    let name: string;
    do {
      name = PLAYERS[Math.floor(rand() * PLAYERS.length)];
    } while (used.has(name) && used.size < PLAYERS.length);
    used.add(name);
    const base = Math.floor(50000 + rand() * 250000);
    const score = base - i * Math.floor(2000 + rand() * 4000);
    const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");
    const mon = String(1 + Math.floor(rand() * 12)).padStart(2, "0");
    rows.push({
      rank: i + 1,
      name,
      score: Math.max(score, 1000),
      date: `${day}/${mon}/2026`,
    });
  }
  return rows
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

// Semillas del prototipo: detalle (10 filas) y salón (12 filas).
const DETAIL_LIMIT = 10;

function seedFor(gameId: string, limit: number): number {
  return limit === DETAIL_LIMIT ? gameId.length * 17 + 3 : gameId.length * 23 + 7;
}

export async function getLeaderboard(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  return seededScores(seedFor(gameId, limit), limit);
}

// Marca simulada del usuario en el salón, igual que el prototipo.
export async function getUserBest(
  gameId: string,
  user: User,
): Promise<ScoreRow | null> {
  const rows = seededScores(gameId.length * 23 + 7, 12);
  return {
    rank: 8 + (gameId.length % 4),
    name: user.name,
    score: rows[5] ? rows[5].score - 2400 : 9999,
    date: "11/05/2026",
  };
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
