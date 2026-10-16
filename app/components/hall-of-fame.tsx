"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Game } from "@/app/data/games";
import { getUserBest, type ScoreRow } from "@/app/data/scores";
import { useSession } from "./session-provider";

const TOP_CLASS = ["top1", "top2", "top3"];

export function HallOfFame({
  games,
  boards,
}: {
  games: Game[];
  boards: Record<string, ScoreRow[]>;
}) {
  const [tab, setTab] = useState(games[0].id);
  const [best, setBest] = useState<{ key: string; row: ScoreRow } | null>(null);
  const { user } = useSession();

  const rows = boards[tab];
  const game = games.find((g) => g.id === tab)!;
  const userName = user?.name;

  useEffect(() => {
    if (!userName) return;
    let active = true;
    getUserBest(tab, { name: userName }).then((row) => {
      if (active && row) setBest({ key: `${userName}:${tab}`, row });
    });
    return () => {
      active = false;
    };
  }, [tab, userName]);

  const you = userName && best?.key === `${userName}:${tab}` ? best.row : null;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel text-[10px]">
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{rows[1].name}</div>
          <div className="score">{rows[1].score.toLocaleString("es-ES")}</div>
          <div className="date">{rows[1].date}</div>
        </div>
        <div className="podium-slot gold">
          <div className="pixel text-[9px] tracking-[0.18em] text-(--gold)">
            CAMPEÓN
          </div>
          <div className="rank-num mt-1 text-[36px]">01</div>
          <div className="name">{rows[0].name}</div>
          <div className="score text-[20px]">
            {rows[0].score.toLocaleString("es-ES")}
          </div>
          <div className="date">{rows[0].date}</div>
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{rows[2].name}</div>
          <div className="score">{rows[2].score.toLocaleString("es-ES")}</div>
          <div className="date">{rows[2].date}</div>
        </div>
      </div>

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.name + i}
            className={"tr" + (TOP_CLASS[i] ? " " + TOP_CLASS[i] : "")}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">{r.name}</div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            <div className="dt">{r.date}</div>
          </div>
        ))}
        {you && (
          <>
            <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
            <div
              className="tr you"
              style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
            >
              <div className="rk text-(--yellow)">
                #{String(you.rank).padStart(2, "0")}
              </div>
              <div className="pl text-(--yellow)">{you.name}</div>
              <div className="sc text-(--yellow) [text-shadow:0_0_6px_rgba(245,255,0,0.5)]">
                {you.score.toLocaleString("es-ES")}
              </div>
              <div className="dt">{you.date}</div>
            </div>
          </>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
