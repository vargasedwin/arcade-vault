import type { Metadata } from "next";
import { Suspense } from "react";
import { getGames } from "@/app/data/games.server";
import { getRecentScores, getTopPlayers } from "@/app/data/scores";
import { Home } from "./components/home";

export const metadata: Metadata = {
  title: "Arcade Vault · El arcade clásico está de vuelta",
  description:
    "Juega los mejores clásicos arcade en tu navegador, sin descargas y sin costo. Compite por el ranking global.",
};

// getGames() usa cookies() vía el cliente server: dinámico, dentro de <Suspense>.
async function HomeLoader() {
  const [games, recent, top] = await Promise.all([
    getGames(),
    getRecentScores(),
    getTopPlayers(),
  ]);
  return <Home games={games} recent={recent} top={top} />;
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="p-20 text-center text-(--ink-faint)">
          <div className="pixel text-sm text-(--cyan)">CARGANDO…</div>
        </div>
      }
    >
      <HomeLoader />
    </Suspense>
  );
}
