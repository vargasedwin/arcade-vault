import { getGames } from "@/app/data/games";
import { Library } from "./components/library";

export default async function Home() {
  const games = await getGames();
  return <Library games={games} />;
}
