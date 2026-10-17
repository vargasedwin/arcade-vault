"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Game } from "@/app/data/games";
import { useSession } from "../session-provider";
import {
  createAsteroids,
  type AsteroidsHandle,
  type AsteroidsStats,
} from "./asteroids-engine";

export function AsteroidsPlayer({ game }: { game: Game }) {
  const { user } = useSession();
  const [stats, setStats] = useState<AsteroidsStats>({
    score: 0,
    lives: 3,
    level: 1,
  });
  const [paused, setPaused] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsHandle | null>(null);

  const name = user?.name ?? "INVITADO";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createAsteroids(canvas, {
      onStats: setStats,
      onGameOver: () => {},
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const togglePause = () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (paused) engine.resume();
    else engine.pause();
    setPaused(!paused);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div className="flex flex-wrap gap-6">
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v text-(--ink)">{name}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{stats.score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(stats.lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(stats.level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={() => engineRef.current?.end()}>
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="absolute inset-0 block h-full w-full"
          />
          {paused && (
            <div className="crt-content z-5 bg-black/60">
              <div>
                <div className="pixel neon-yellow text-[22px]">EN PAUSA</div>
                <div className="mono mt-2.5 text-[11px] tracking-[0.16em] text-(--ink-dim)">
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
    </div>
  );
}
