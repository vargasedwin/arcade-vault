import Link from "next/link";

// Estado vacío de los leaderboards. Con `play` ofrece la acción para llenarlo.
export function EmptyScores({
  gameTitle,
  play,
}: {
  gameTitle?: string;
  play?: { href: string; label: string };
}) {
  return (
    <div className="px-6 py-12 text-center text-(--ink-faint)">
      <div className="pixel mb-3 text-sm leading-relaxed text-(--magenta)">
        Sé el primero en entrar al salón de la fama
      </div>
      <div>
        {gameTitle
          ? `Todavía nadie ha registrado una puntuación en ${gameTitle}.`
          : "Todavía no hay puntuaciones registradas."}
      </div>
      {play && (
        <Link href={play.href} className="btn mt-6">
          {play.label}
        </Link>
      )}
    </div>
  );
}
