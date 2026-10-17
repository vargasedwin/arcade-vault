import type { Metadata } from "next";
import { Suspense } from "react";
import { HallOfFame } from "@/app/components/hall-of-fame";
import { getGames } from "@/app/data/games.server";
import { getLeaderboard } from "@/app/data/scores.server";

export const metadata: Metadata = { title: "Salón de la Fama · Arcade Vault" };

// Lecturas con el cliente server (cookies()): dinámicas, dentro de <Suspense>.
// Solo se precarga el tab inicial; los demás se piden en el cliente al elegirlos.
async function HallLoader() {
  const games = await getGames();
  const initialBoard = games[0] ? await getLeaderboard(games[0].id, 12) : [];
  return <HallOfFame games={games} initialBoard={initialBoard} />;
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
      <HallLoader />
    </Suspense>
  );
}
