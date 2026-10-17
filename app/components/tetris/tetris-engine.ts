// Port de references/started-games/03-tetris/game.js.
// Todo el estado vive dentro de createTetris; el módulo solo tiene constantes y utilidades puras.

export type TetrisStats = { score: number; lines: number; level: number };

export type TetrisCallbacks = {
  onStats(stats: TetrisStats): void;
  onGameOver(finalScore: number): void;
};

export type TetrisHandle = {
  pause(): void;
  resume(): void;
  restart(): void;
  end(): void;
  destroy(): void;
};

type Shape = number[][];
type Piece = { type: number; shape: Shape; x: number; y: number };

// ── Constants ─────────────────────────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const BOARD_W = COLS * BLOCK; // 300
const BOARD_H = ROWS * BLOCK; // 600
const W = 480;
const H = 600;
const PANEL_X = BOARD_W; // el panel de 180 px empieza donde acaba el tablero

const BG_COLOR = "#1a1a25";
const GRID_COLOR = "#22222e";

const COLORS = [
  null,
  "#4dd0e1", // I - cian
  "#ffd54f", // O - amarillo
  "#ba68c8", // T - púrpura
  "#81c784", // S - verde
  "#e57373", // Z - rojo
  "#90caf9", // J - azul pálido
  "#ffb74d", // L - naranja
  "#9e9e9e", // N - tuerca (gris metálico)
];

const PIECES: (Shape | null)[] = [
  null,
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
  [[2, 2], [2, 2]], // O
  [[0, 3, 0], [3, 3, 3], [0, 0, 0]], // T
  [[0, 4, 4], [4, 4, 0], [0, 0, 0]], // S
  [[5, 5, 0], [0, 5, 5], [0, 0, 0]], // Z
  [[6, 0, 0], [6, 6, 6], [0, 0, 0]], // J
  [[0, 0, 7], [7, 7, 7], [0, 0, 0]], // L
  [[8, 8, 8], [8, 0, 8], [8, 8, 8]], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const KICKS = [0, -1, 1, -2, 2];
const GAME_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyX", "Space"];

// ── Utils ─────────────────────────────────────────────────────────────────────
const createBoard = (): number[][] =>
  Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = (PIECES[type] as Shape).map((row) => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function rotateCW(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array<number>(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

export function createTetris(
  canvas: HTMLCanvasElement,
  callbacks: TetrisCallbacks,
): TetrisHandle {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Tetris: el canvas no soporta el contexto 2D");
  const ctx: CanvasRenderingContext2D = context;
  canvas.width = W;
  canvas.height = H;

  // ── Estado ──────────────────────────────────────────────────────────────────
  let board = createBoard();
  let current: Piece = randomPiece();
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let paused = false;
  let gameOver = false;
  let dropInterval = 1000;
  let dropAccum = 0;
  let lastTime: number | null = null;
  let animId = 0;
  let destroyed = false;
  let lastStats: TetrisStats | null = null;

  // ── Callbacks ───────────────────────────────────────────────────────────────
  function emitStats() {
    if (
      lastStats &&
      lastStats.score === score &&
      lastStats.lines === lines &&
      lastStats.level === level
    )
      return;
    lastStats = { score, lines, level };
    callbacks.onStats({ score, lines, level });
  }

  function endGame() {
    if (gameOver) return;
    gameOver = true;
    emitStats();
    callbacks.onGameOver(score);
  }

  // ── Reglas ──────────────────────────────────────────────────────────────────
  function collide(shape: Shape, ox: number, oy: number) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    for (const kick of KICKS) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c]) board[current.y + r][current.x + c] = current.shape[r][c];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array<number>(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    }
  }

  function ghostY() {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) endGame();
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }

  function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }

  function init() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    paused = false;
    gameOver = false;
    dropInterval = 1000;
    dropAccum = 0;
    lastTime = null;
    next = randomPiece();
    spawn();
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  const isTextTarget = (e: KeyboardEvent) =>
    e.target instanceof HTMLElement &&
    (e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.isContentEditable);

  const onKeyDown = (e: KeyboardEvent) => {
    if (isTextTarget(e) || !GAME_KEYS.includes(e.code)) return;
    // En game over se deja el comportamiento nativo para poder usar el modal con teclado.
    if (gameOver) return;
    // Evita el scroll de la página y que Espacio active el botón con foco.
    e.preventDefault();
    if (paused) return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
    }
    emitStats();
  };
  window.addEventListener("keydown", onKeyDown);

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawBlock(x: number, y: number, colorIndex: number, alpha = 1, ox = 0, oy = 0) {
    if (!colorIndex) return;
    const px = ox + x * BLOCK + 1;
    const py = oy + y * BLOCK + 1;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS[colorIndex] as string;
    ctx.fillRect(px, py, BLOCK - 2, BLOCK - 2);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(px, py, BLOCK - 2, 4);
    ctx.globalAlpha = 1;
  }

  function drawGrid() {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, BOARD_H);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(BOARD_W, r * BLOCK);
      ctx.stroke();
    }
  }

  function drawPanel() {
    const c = ctx;
    const cx = PANEL_X + (W - PANEL_X) / 2;

    c.strokeStyle = GRID_COLOR;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(PANEL_X + 0.5, 0);
    c.lineTo(PANEL_X + 0.5, H);
    c.stroke();

    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    const stat = (label: string, value: number, y: number) => {
      c.fillStyle = "rgba(255,255,255,0.55)";
      c.font = "14px monospace";
      c.fillText(label, cx, y);
      c.fillStyle = "#fff";
      c.font = "bold 28px monospace";
      c.fillText(String(value), cx, y + 34);
    };
    stat("SCORE", score, 52);
    stat("LINES", lines, 132);
    stat("LEVEL", level, 212);

    c.fillStyle = "rgba(255,255,255,0.55)";
    c.font = "14px monospace";
    c.fillText("NEXT", cx, 312);

    // Pieza siguiente centrada en una caja de 4×4 bloques.
    const boxX = cx - (4 * BLOCK) / 2;
    const boxY = 332;
    c.strokeStyle = GRID_COLOR;
    c.strokeRect(boxX + 0.5, boxY + 0.5, 4 * BLOCK - 1, 4 * BLOCK - 1);
    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let col = 0; col < shape[r].length; col++)
        drawBlock(offX + col, offY + r, shape[r][col], 1, boxX, boxY);
  }

  function drawOverlay(title: string, sub: string) {
    const c = ctx;
    c.fillStyle = "rgba(0,0,0,0.6)";
    c.fillRect(0, 0, W, H);
    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    c.fillStyle = "#fff";
    c.font = "bold 40px monospace";
    c.fillText(title, W / 2, H / 2 - 18);
    c.font = "18px monospace";
    c.fillStyle = "rgba(255,255,255,0.65)";
    c.fillText(sub, W / 2, H / 2 + 22);
  }

  function draw() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);
    drawGrid();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(c, r, board[r][c]);

    if (!gameOver) {
      const gy = ghostY();
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          drawBlock(current.x + c, gy + r, current.shape[r][c], 0.2);
    }

    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(current.x + c, current.y + r, current.shape[r][c]);

    drawPanel();

    if (gameOver) drawOverlay("GAME OVER", `PUNTAJE: ${score}`);
  }

  // ── Update y loop principal ─────────────────────────────────────────────────
  function update(dt: number) {
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) current.y++;
      else lockPiece();
    }
  }

  function loop(ts: number) {
    if (destroyed) return;
    const dt = lastTime === null ? 0 : ts - lastTime;
    lastTime = ts;
    if (!paused && !gameOver) {
      update(dt);
      emitStats();
    }
    draw();
    animId = requestAnimationFrame(loop);
  }

  init();
  emitStats();
  animId = requestAnimationFrame(loop);

  return {
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      lastTime = null;
    },
    restart() {
      init();
      lastStats = null;
      emitStats();
    },
    end() {
      endGame();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
