import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AsteroidsPlayer } from "@/app/components/asteroids/asteroids-player";
import { getGame } from "@/app/data/games.server";

// Igual que /games/[id]: la ruta puede bloquear y el juego se lee antes del streaming.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const game = await getGame("asteroids");
  return {
    title: game ? `Jugando ${game.title} · Arcade Vault` : "Juego no encontrado",
  };
}

export default async function Page() {
  const game = await getGame("asteroids");
  if (!game) notFound();
  return <AsteroidsPlayer game={game} />;
}
