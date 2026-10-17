import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AsteroidsPlayer } from "@/app/components/asteroids/asteroids-player";
import { getGame } from "@/app/data/games";

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
