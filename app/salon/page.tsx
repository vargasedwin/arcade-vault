import type { Metadata } from "next";
import { HallOfFame } from "@/app/components/hall-of-fame";
import { getGames } from "@/app/data/games";
import { getLeaderboard } from "@/app/data/scores";

export const metadata: Metadata = { title: "Salón de la Fama · Arcade Vault" };

export default async function Page() {
  const games = await getGames();
  const entries = await Promise.all(
    games.map(async (g) => [g.id, await getLeaderboard(g.id, 12)] as const),
  );
  return <HallOfFame games={games} boards={Object.fromEntries(entries)} />;
}
