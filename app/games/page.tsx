import type { Metadata } from "next";
import { Suspense } from "react";
import { getGames } from "@/app/data/games.server";
import { Library } from "@/app/components/library";

export const metadata: Metadata = { title: "Biblioteca · Arcade Vault" };

// getGames() usa cookies() vía el cliente server: con cacheComponents es dato
// dinámico y debe leerse dentro de <Suspense>.
async function LibraryLoader() {
  const games = await getGames();
  return <Library games={games} />;
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
      <LibraryLoader />
    </Suspense>
  );
}
