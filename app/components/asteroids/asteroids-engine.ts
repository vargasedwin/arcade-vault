// Port de references/started-games/02-asteroids/game.js.
// Todo el estado vive dentro de createAsteroids; el módulo solo tiene constantes y utilidades puras.

export type AsteroidsStats = { score: number; lives: number; level: number };

export type AsteroidsCallbacks = {
  onStats(stats: AsteroidsStats): void;
  onGameOver(finalScore: number): void;
};

export type AsteroidsHandle = {
  pause(): void;
  resume(): void;
  restart(): void;
  end(): void;
  destroy(): void;
};

type GameState = "playing" | "dead" | "gameover";
type Vec = [number, number];

// ── Utils ─────────────────────────────────────────────────────────────────────
const W = 800;
const H = 600;

const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

// ── Constants ─────────────────────────────────────────────────────────────────
const POWERUP_DROP_CHANCE = 0.15;
const POWERUP_DURATION = 5;
const POWERUP_TTL = 12;
const TRIPLE_SPREAD = 0.18;

const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño

export function createAsteroids(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsHandle {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Asteroids: el canvas no soporta el contexto 2D");
  const ctx: CanvasRenderingContext2D = context;
  canvas.width = W;
  canvas.height = H;

  // ── Input ───────────────────────────────────────────────────────────────────
  let keys: Record<string, boolean> = {};
  let justPressed: Record<string, boolean> = {};

  const onKeyDown = (e: KeyboardEvent) => {
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  const pressed = (code: string) => {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  };
  const clearInput = () => {
    keys = {};
    justPressed = {};
  };

  // ── Bullet ──────────────────────────────────────────────────────────────────
  class Bullet {
    x: number;
    y: number;
    vx: number;
    vy: number;
    ttl = 1.1;
    radius = 2;
    dead = false;

    constructor(x: number, y: number, angle: number) {
      const SPEED = 520;
      this.x = x;
      this.y = y;
      this.vx = Math.cos(angle) * SPEED;
      this.vy = Math.sin(angle) * SPEED;
    }

    update(dt: number) {
      this.x = wrap(this.x + this.vx * dt, W);
      this.y = wrap(this.y + this.vy * dt, H);
      this.ttl -= dt;
      if (this.ttl <= 0) this.dead = true;
    }

    draw() {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Asteroid ────────────────────────────────────────────────────────────────
  class Asteroid {
    x: number;
    y: number;
    size: number;
    radius: number;
    dead = false;
    vx: number;
    vy: number;
    rotSpeed: number;
    rot: number;
    verts: Vec[] = [];

    constructor(x: number, y: number, size = 3) {
      this.x = x;
      this.y = y;
      this.size = size;
      this.radius = RADII[size];

      const angle = rand(0, Math.PI * 2);
      const speed = SPEEDS[size] + rand(-15, 15);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.rotSpeed = rand(-1.2, 1.2);
      this.rot = rand(0, Math.PI * 2);

      // Polígono irregular
      const n = randInt(8, 13);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = this.radius * rand(0.6, 1.0);
        this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    }

    update(dt: number) {
      this.x = wrap(this.x + this.vx * dt, W);
      this.y = wrap(this.y + this.vy * dt, H);
      this.rot += this.rotSpeed * dt;
    }

    split(): Asteroid[] {
      if (this.size <= 1) return [];
      return [
        new Asteroid(this.x, this.y, this.size - 1),
        new Asteroid(this.x, this.y, this.size - 1),
      ];
    }

    draw() {
      const c = ctx;
      c.save();
      c.translate(this.x, this.y);
      c.rotate(this.rot);
      c.strokeStyle = "#fff";
      c.lineWidth = 1.5;
      c.lineJoin = "round";
      c.beginPath();
      c.moveTo(this.verts[0][0], this.verts[0][1]);
      for (let i = 1; i < this.verts.length; i++)
        c.lineTo(this.verts[i][0], this.verts[i][1]);
      c.closePath();
      c.stroke();
      c.restore();
    }
  }

  // ── PowerUp ─────────────────────────────────────────────────────────────────
  class PowerUp {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius = 12;
    ttl = POWERUP_TTL;
    dead = false;

    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
      const angle = rand(0, Math.PI * 2);
      const speed = rand(20, 40);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
    }

    update(dt: number) {
      this.x = wrap(this.x + this.vx * dt, W);
      this.y = wrap(this.y + this.vy * dt, H);
      this.ttl -= dt;
      if (this.ttl <= 0) this.dead = true;
    }

    draw() {
      if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
      const c = ctx;
      const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
      c.save();
      c.translate(this.x, this.y);
      c.rotate(Math.PI / 4);
      c.strokeStyle = "#0ff";
      c.lineWidth = 2;
      const r = this.radius * pulse;
      c.strokeRect(-r, -r, r * 2, r * 2);
      c.restore();
      c.fillStyle = "#0ff";
      c.font = "bold 12px monospace";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("3x", this.x, this.y);
    }
  }

  // ── Ship ────────────────────────────────────────────────────────────────────
  class Ship {
    x = 0;
    y = 0;
    angle = 0;
    vx = 0;
    vy = 0;
    radius = 12;
    thrusting = false;
    invincible = 0;
    shootCooldown = 0;
    dead = false;
    tripleShot = 0;

    constructor() {
      this.reset();
    }

    reset() {
      this.x = W / 2;
      this.y = H / 2;
      this.angle = -Math.PI / 2;
      this.vx = 0;
      this.vy = 0;
      this.radius = 12;
      this.thrusting = false;
      this.invincible = 3;
      this.shootCooldown = 0;
      this.dead = false;
    }

    update(dt: number) {
      if (this.dead) return;
      if (this.invincible > 0) this.invincible -= dt;
      if (this.shootCooldown > 0) this.shootCooldown -= dt;
      if (this.tripleShot > 0) this.tripleShot -= dt;

      const ROT = 3.5; // rad/s
      const THRUST = 260; // px/s²
      const DRAG = 0.987;

      if (keys["ArrowLeft"]) this.angle -= ROT * dt;
      if (keys["ArrowRight"]) this.angle += ROT * dt;

      this.thrusting = !!keys["ArrowUp"];
      if (this.thrusting) {
        this.vx += Math.cos(this.angle) * THRUST * dt;
        this.vy += Math.sin(this.angle) * THRUST * dt;
      }

      this.vx *= DRAG;
      this.vy *= DRAG;
      this.x = wrap(this.x + this.vx * dt, W);
      this.y = wrap(this.y + this.vy * dt, H);
    }

    tryShoot(): Bullet[] {
      if (this.shootCooldown > 0 || this.dead) return [];
      this.shootCooldown = 0.2;
      const NOSE = 21;
      const ox = this.x + Math.cos(this.angle) * NOSE;
      const oy = this.y + Math.sin(this.angle) * NOSE;
      if (this.tripleShot > 0) {
        return [
          new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
          new Bullet(ox, oy, this.angle),
          new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
        ];
      }
      return [new Bullet(ox, oy, this.angle)];
    }

    draw() {
      if (this.dead) return;
      // Parpadeo durante invencibilidad de reaparición
      if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

      const c = ctx;
      c.save();
      c.translate(this.x, this.y);
      c.rotate(this.angle);
      c.strokeStyle = "#fff";
      c.lineWidth = 1.5;
      c.lineJoin = "round";

      // Silueta clásica: triángulo con muesca trasera
      c.beginPath();
      c.moveTo(20, 0); // nariz
      c.lineTo(-12, -9); // ala izquierda
      c.lineTo(-7, 0); // muesca trasera
      c.lineTo(-12, 9); // ala derecha
      c.closePath();
      c.stroke();

      // Llama del propulsor
      if (this.thrusting && Math.random() > 0.35) {
        c.beginPath();
        c.moveTo(-8, -4);
        c.lineTo(-8 - rand(6, 14), 0);
        c.lineTo(-8, 4);
        c.strokeStyle = "rgba(255, 130, 0, 0.85)";
        c.stroke();
      }

      c.restore();
    }
  }

  // ── Partículas (explosión) ──────────────────────────────────────────────────
  class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    ttl: number;
    dead = false;

    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
      const angle = rand(0, Math.PI * 2);
      const speed = rand(30, 130);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.life = rand(0.4, 1.1);
      this.ttl = this.life;
    }

    update(dt: number) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.ttl -= dt;
      if (this.ttl <= 0) this.dead = true;
    }

    draw() {
      const c = ctx;
      const alpha = this.ttl / this.life;
      c.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(this.x, this.y);
      c.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
      c.stroke();
    }
  }

  // ── Estado del juego ────────────────────────────────────────────────────────
  let ship: Ship;
  let bullets: Bullet[];
  let asteroids: Asteroid[];
  let particles: Particle[];
  let powerUps: PowerUp[];
  let score = 0;
  let lives = 0;
  let level = 0;
  let state: GameState = "playing";
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;

  let paused = false;
  let destroyed = false;
  let rafId = 0;
  let lastTime: number | null = null;
  let lastStats: AsteroidsStats | null = null;

  // Notifica a React solo cuando cambia algún valor, no en cada frame.
  function emitStats() {
    if (
      lastStats &&
      lastStats.score === score &&
      lastStats.lives === lives &&
      lastStats.level === level
    )
      return;
    lastStats = { score, lives, level };
    callbacks.onStats(lastStats);
  }

  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    spawnAsteroids(4);
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function gameOver() {
    state = "gameover";
    emitStats();
    callbacks.onGameOver(score);
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      gameOver();
    } else {
      state = "dead";
      deadTimer = 2;
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state === "gameover") {
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    // Disparar
    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (asteroids.length === 0) nextLevel();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawLifeIcon(x: number, y: number) {
    const c = ctx;
    c.save();
    c.translate(x, y);
    c.rotate(-Math.PI / 2);
    c.strokeStyle = "#fff";
    c.lineWidth = 1.2;
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(9, 0);
    c.lineTo(-6, -5);
    c.lineTo(-3, 0);
    c.lineTo(-6, 5);
    c.closePath();
    c.stroke();
    c.restore();
  }

  function drawHUD() {
    const c = ctx;
    c.fillStyle = "#fff";
    c.font = "15px monospace";
    c.textBaseline = "alphabetic";

    c.textAlign = "left";
    c.fillText(`SCORE  ${score}`, 14, 26);

    c.textAlign = "center";
    c.fillText(`NIVEL ${level}`, W / 2, 26);

    for (let i = 0; i < lives; i++) drawLifeIcon(W - 16 - i * 22, 18);

    if (ship.tripleShot > 0) {
      c.textAlign = "left";
      c.fillStyle = "#0ff";
      c.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 46);
    }
  }

  function drawOverlay(title: string, sub: string) {
    const c = ctx;
    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    c.fillStyle = "#fff";
    c.font = "bold 46px monospace";
    c.fillText(title, W / 2, H / 2 - 18);
    c.font = "18px monospace";
    c.fillStyle = "rgba(255,255,255,0.65)";
    c.fillText(sub, W / 2, H / 2 + 22);
  }

  function draw() {
    const c = ctx;
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw());
    asteroids.forEach((a) => a.draw());
    powerUps.forEach((p) => p.draw());
    bullets.forEach((b) => b.draw());
    ship.draw();

    drawHUD();

    if (state === "gameover") drawOverlay("GAME OVER", `PUNTAJE: ${score}`);
  }

  // ── Loop principal ──────────────────────────────────────────────────────────
  function loop(ts: number) {
    if (destroyed) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    if (!paused) {
      update(dt);
      emitStats();
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }

  initGame();
  emitStats();
  rafId = requestAnimationFrame(loop);

  return {
    pause() {
      paused = true;
      clearInput();
    },
    resume() {
      paused = false;
      lastTime = null;
      clearInput();
    },
    restart() {
      clearInput();
      initGame();
      emitStats();
    },
    end() {
      if (state === "gameover") return;
      explode(ship.x, ship.y, 14);
      ship.dead = true;
      lives = 0;
      gameOver();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}
