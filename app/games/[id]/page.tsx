import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GameDetail } from "@/app/components/game-detail";
import { getGame } from "@/app/data/games.server";
import { getLeaderboard } from "@/app/data/scores.server";
import type { Game } from "@/app/data/games";

// La ruta puede bloquear: el juego se lee antes de empezar el streaming para que
// notFound() devuelva un 404 real (después del streaming el estado ya es 200).
export const instant = false;

export async function generateMetadata(
  props: PageProps<"/games/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const game = await getGame(id);
  return { title: game ? `${game.title} · Arcade Vault` : "Juego no encontrado" };
}

// El top 10 sí va en <Suspense>: el juego ya existe y la respuesta puede fluir.
async function GameDetailLoader({ game }: { game: Game }) {
  const scores = await getLeaderboard(game.id, 10);
  // Scores ordenados por score DESC: el mejor global es el primero.
  const best = scores[0]?.score ?? null;
  return <GameDetail game={game} scores={scores} best={best} />;
}

export default async function Page(props: PageProps<"/games/[id]">) {
  const { id } = await props.params;
  const game = await getGame(id);
  if (!game) notFound();

  return (
    <Suspense
      fallback={
        <div className="p-20 text-center text-(--ink-faint)">
          <div className="pixel text-sm text-(--cyan)">CARGANDO…</div>
        </div>
      }
    >
      <GameDetailLoader game={game} />
    </Suspense>
  );
}
