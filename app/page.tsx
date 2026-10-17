import type { Metadata } from "next";
import { getGames } from "@/app/data/games";
import { getRecentScores, getTopPlayers } from "@/app/data/scores";
import { Home } from "./components/home";

export const metadata: Metadata = {
  title: "Arcade Vault · El arcade clásico está de vuelta",
  description:
    "Juega los mejores clásicos arcade en tu navegador, sin descargas y sin costo. Compite por el ranking global.",
};

export default async function Page() {
  const [games, recent, top] = await Promise.all([
    getGames(),
    getRecentScores(),
    getTopPlayers(),
  ]);
  return <Home games={games} recent={recent} top={top} />;
}
