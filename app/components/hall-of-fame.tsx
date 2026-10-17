"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Game } from "@/app/data/games";
import { getLeaderboard, type LeaderboardRow } from "@/app/data/scores";
import { EmptyScores } from "./empty-scores";

const TOP_CLASS = ["top1", "top2", "top3"];
const LIMIT = 12;

function Header() {
  return (
    <div className="hall-head">
      <h1>SALÓN DE LA FAMA</h1>
      <p className="pixel text-[10px]">
        LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
      </p>
    </div>
  );
}

export function HallOfFame({
  games,
  initialBoard,
}: {
  games: Game[];
  initialBoard: LeaderboardRow[];
}) {
  const first = games[0];
  const [tab, setTab] = useState(first?.id);
  const [boards, setBoards] = useState<Record<string, LeaderboardRow[]>>(
    first ? { [first.id]: initialBoard } : {},
  );
  const [failed, setFailed] = useState(false);
  // Descarta respuestas de un tab que ya no es el activo.
  const lastRequest = useRef(0);

  if (!first) {
    return (
      <div className="av-hall fade-in">
        <Header />
        <EmptyScores />
      </div>
    );
  }

  const selectTab = (id: string) => {
    setTab(id);
    setFailed(false);
    const request = ++lastRequest.current;
    getLeaderboard(id, LIMIT)
      .then((rows) => {
        if (request === lastRequest.current) {
          setBoards((prev) => ({ ...prev, [id]: rows }));
        }
      })
      .catch(() => {
        if (request === lastRequest.current) setFailed(true);
      });
  };

  const game = games.find((g) => g.id === tab) ?? first;
  const rows = boards[game.id];
  const [gold, silver, bronze] = rows ?? [];

  return (
    <div className="av-hall fade-in">
      <Header />

      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            className={"chip" + (game.id === g.id ? " active" : "")}
            onClick={() => selectTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {!rows ? (
        <div className="p-16 text-center text-(--ink-faint)" role="status">
          {failed ? (
            <>
              <div className="pixel mb-3 text-sm text-(--magenta)">
                NO SE PUDO CARGAR
              </div>
              <div>Vuelve a pulsar {game.title} para reintentarlo.</div>
            </>
          ) : (
            <div className="pixel text-sm text-(--cyan)">CARGANDO…</div>
          )}
        </div>
      ) : rows.length === 0 ? (
        <div className="hall-table">
          <EmptyScores
            gameTitle={game.title}
            play={{ href: `/games/${game.id}/jugar`, label: `JUGAR ${game.title}` }}
          />
        </div>
      ) : (
        <>
          {/* Cada puesto conserva su columna: con menos de 3 filas el campeón
              sigue centrado y los puestos vacíos no se dibujan. */}
          <div className="podium">
            {silver ? (
              <div className="podium-slot silver">
                <div className="rank-num">02</div>
                <div className="name">{silver.name}</div>
                <div className="score">{silver.score.toLocaleString("es-ES")}</div>
                <div className="date">{silver.date}</div>
              </div>
            ) : (
              <div aria-hidden className="max-[720px]:hidden" />
            )}
            <div className="podium-slot gold">
              <div className="pixel text-[9px] tracking-[0.18em] text-(--gold)">
                CAMPEÓN
              </div>
              <div className="rank-num mt-1 text-[36px]">01</div>
              <div className="name">{gold.name}</div>
              <div className="score text-[20px]">
                {gold.score.toLocaleString("es-ES")}
              </div>
              <div className="date">{gold.date}</div>
            </div>
            {bronze ? (
              <div className="podium-slot bronze">
                <div className="rank-num">03</div>
                <div className="name">{bronze.name}</div>
                <div className="score">{bronze.score.toLocaleString("es-ES")}</div>
                <div className="date">{bronze.date}</div>
              </div>
            ) : (
              <div aria-hidden className="max-[720px]:hidden" />
            )}
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
                key={`${game.id}-${r.rank}`}
                className={"tr" + (TOP_CLASS[i] ? " " + TOP_CLASS[i] : "")}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-8 text-center">
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
