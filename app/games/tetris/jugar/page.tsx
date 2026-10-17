import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TetrisPlayer } from "@/app/components/tetris/tetris-player";
import { getGame } from "@/app/data/games.server";

// Igual que /games/[id]: la ruta puede bloquear y el juego se lee antes del streaming.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const game = await getGame("tetris");
  return {
    title: game ? `Jugando ${game.title} · Arcade Vault` : "Juego no encontrado",
  };
}

export default async function Page() {
  const game = await getGame("tetris");
  if (!game) notFound();
  return <TetrisPlayer game={game} />;
}
