"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Game } from "@/app/data/games";
import { getPlayerName, saveScore, setPlayerName } from "@/app/data/scores";
import { useSession } from "../session-provider";
import { createTetris, type TetrisHandle, type TetrisStats } from "./tetris-engine";

export function TetrisPlayer({ game }: { game: Game }) {
  const { user } = useSession();
  const [stats, setStats] = useState<TetrisStats>({ score: 0, lines: 0, level: 1 });
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TetrisHandle | null>(null);

  // Prioridad: lo que el usuario escribió o el nombre recordado del leaderboard,
  // luego el nick de sesión (llega tras montar) y por último INVITADO.
  const name = nameOverride ?? user?.name ?? "INVITADO";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createTetris(canvas, {
      onStats: setStats,
      onGameOver: (score) => {
        setFinalScore(score);
        setPaused(false);
        // Pre-rellena el nombre recordado, sin pisar lo ya escrito en esta sesión.
        const remembered = getPlayerName();
        if (remembered) setNameOverride((current) => current ?? remembered);
        setOver(true);
      },
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // El botón no debe conservar el foco: Espacio cae la pieza, no reactiva PAUSA/FIN.
  const togglePause = (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    const engine = engineRef.current;
    if (!engine) return;
    if (paused) engine.resume();
    else engine.pause();
    setPaused(!paused);
  };

  const restart = () => {
    // FIN puede pulsarse en pausa: el motor sigue pausado aunque la UI ya no lo muestre.
    engineRef.current?.resume();
    engineRef.current?.restart();
    setOver(false);
    setSaved(false);
    setSaveError(false);
  };

  const save = async () => {
    if (saving || saved) return;
    const player = name.trim() || "INVITADO";
    setSaving(true);
    setSaveError(false);
    try {
      await saveScore({ game: game.id, score: finalScore, name: player });
      setPlayerName(player);
      setSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="av-player fade-in" style={{ maxWidth: 820 }}>
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
            <div className="l">Líneas</div>
            <div className="v">{stats.lines}</div>
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
          <button
            className="btn magenta"
            onClick={(e) => {
              e.currentTarget.blur();
              engineRef.current?.end();
            }}
          >
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      {/* El canvas (4:5) es más alto que ancho: se limita su ancho para que quepa en el alto visible.
          315px = nav + HUD + marco y pie del CRT; 48px = padding del marco. */}
      <div
        className="crt mx-auto"
        style={{ width: "min(100%, calc(min(480px, max(200px, (100svh - 315px) * 4 / 5)) + 48px))" }}
      >
        <div className="crt-screen" style={{ aspectRatio: "4 / 5" }}>
          <canvas
            ref={canvasRef}
            width={480}
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
        <div className="crt-bottom flex-wrap gap-x-4 gap-y-2">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>← → MOVER · ↑ X ROTAR · ↓ BAJAR · ESPACIO CAÍDA</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{finalScore.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setNameOverride(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={save} disabled={saving}>
                  {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            {saveError && (
              <div role="alert" className="mono mt-2 text-[11px] text-(--magenta)">
                No se pudo guardar la puntuación. Inténtalo de nuevo.
              </div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
