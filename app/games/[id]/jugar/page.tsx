import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GamePlayer } from "@/app/components/game-player";
import { getGame, getGames } from "@/app/data/games";

export async function generateStaticParams() {
  const games = await getGames();
  return games.map((g) => ({ id: g.id }));
}

export async function generateMetadata(
  props: PageProps<"/games/[id]/jugar">,
): Promise<Metadata> {
  const { id } = await props.params;
  const game = await getGame(id);
  return {
    title: game ? `Jugando ${game.title} · Arcade Vault` : "Juego no encontrado",
  };
}

export default async function Page(props: PageProps<"/games/[id]/jugar">) {
  const { id } = await props.params;
  const game = await getGame(id);
  if (!game) notFound();
  return <GamePlayer game={game} />;
}
