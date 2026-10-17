import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameDetail } from "@/app/components/game-detail";
import { getGame, getGames } from "@/app/data/games";
import { getLeaderboard } from "@/app/data/scores";

export async function generateStaticParams() {
  const games = await getGames();
  return games.map((g) => ({ id: g.id }));
}

export async function generateMetadata(
  props: PageProps<"/games/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const game = await getGame(id);
  return { title: game ? `${game.title} · Arcade Vault` : "Juego no encontrado" };
}

export default async function Page(props: PageProps<"/games/[id]">) {
  const { id } = await props.params;
  const game = await getGame(id);
  if (!game) notFound();
  const scores = await getLeaderboard(game.id, 10);
  return <GameDetail game={game} scores={scores} />;
}
