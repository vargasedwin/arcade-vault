import Link from "next/link";
import type { Game } from "@/app/data/games";
import type { LeaderboardRow } from "@/app/data/scores";

const TOP_CLASS = ["top1", "top2", "top3"];

export function GameDetail({
  game,
  scores,
  best,
}: {
  game: Game;
  scores: LeaderboardRow[];
  best: number | null;
}) {
  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div className="detail-info mt-5">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Mejor global</div>
              <div className="v text-(--magenta) [text-shadow:0_0_6px_rgba(255,0,110,0.5)]">
                {best === null ? "—" : best.toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div className="v text-(--yellow) [text-shadow:0_0_6px_rgba(245,255,0,0.5)]">
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/games/${game.id}/jugar`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/games" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
          {scores.map((r, i) => (
            <div key={r.name} className={"lb-row" + (TOP_CLASS[i] ? " " + TOP_CLASS[i] : "")}>
              <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
              <div className="pl">
                {r.name}
                <div className="text-[10px] tracking-[0.1em] text-(--ink-faint)">
                  {r.date}
                </div>
              </div>
              <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
