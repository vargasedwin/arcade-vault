import type { Metadata } from "next";
import { getGames } from "@/app/data/games";
import { Library } from "@/app/components/library";

export const metadata: Metadata = { title: "Biblioteca · Arcade Vault" };

export default async function Page() {
  const games = await getGames();
  return <Library games={games} />;
}
