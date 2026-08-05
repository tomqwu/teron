/* ═══════════════════════════════════════════════════════════
   导航与实体
   ═══════════════════════════════════════════════════════════ */
'use strict';

/* ─────────────── 导航 ─────────────── */

const Nav = {

  edges: null,

  build() {
    const poly = CFG.arena.poly;
    this.edges = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      // 内法线（多边形按屏幕坐标顺时针给出）
      this.edges.push({
        ax: a[0], ay: a[1], bx: b[0], by: b[1],
        dx, dy, len2: dx * dx + dy * dy,
        nx: -dy / len, ny: dx / len
      });
    }
  },

  inside(x, y) {
    const poly = CFG.arena.poly;
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  },

  /** 把半径为 r 的圆推回可行走区域内 */
  resolve(e) {
    if (!this.edges) this.build();
    const r = e.radius;

    for (const s of this.edges) {
      let t = ((e.x - s.ax) * s.dx + (e.y - s.ay) * s.dy) / s.len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = s.ax + s.dx * t, py = s.ay + s.dy * t;
      const vx = e.x - px, vy = e.y - py;
      const d = Math.hypot(vx, vy);
      if (d < r) {
        let ux, uy;
        if (d > 1e-4) { ux = vx / d; uy = vy / d; } else { ux = s.nx; uy = s.ny; }
        if (ux * s.nx + uy * s.ny < 0) { ux = s.nx; uy = s.ny; }   // 已在墙外 → 沿内法线拉回
        e.x = px + ux * r;
        e.y = py + uy * r;
      }
    }

    for (const p of CFG.arena.pillars) {
      const vx = e.x - p.x, vy = e.y - p.y;
      const d = Math.hypot(vx, vy);
      const min = p.r + r;
      if (d < min) {
        if (d > 1e-4) { e.x = p.x + vx / d * min; e.y = p.y + vy / d * min; }
        else { e.x = p.x + min; }
      }
    }
  },

  /** 构造体当前应该走向哪里 */
  waypoint(y) {
    for (const w of CFG.arena.waypoints) {
      if (y > w.belowY) return w;
    }
    return CFG.arena.boss;
  },

  /** 沿路点链到首领的剩余距离 */
  pathLength(x, y) {
    const A = CFG.arena;
    const wps = [];
    for (const w of A.waypoints) if (y > w.belowY) wps.push(w);
    wps.push(A.boss);
    let d = 0, cx = x, cy = y;
    for (const w of wps) { d += U.dist(cx, cy, w.x, w.y); cx = w.x; cy = w.y; }
    return d;
  }
};

/* ─────────────── 玩家 ─────────────── */

class Player {
  constructor() {
    this.x = CFG.arena.playerSpawn.x;
    this.y = CFG.arena.playerSpawn.y;
    this.radius = CFG.player.radius;
    this.isGhost = false;
    this.moveTarget = null;
    this.followPointer = false;
    this.trail = [];
    this.facing = 0;
    this.moving = false;
  }

  becomeGhost() {
    this.isGhost = true;
    this.moveTarget = null;
  }

  update(dt, input) {
    let vx = 0, vy = 0;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;

    const hasKeys = vx || vy;
    if (hasKeys) this.moveTarget = null;

    if (!hasKeys && this.moveTarget) {
      const d = U.dist(this.x, this.y, this.moveTarget.x, this.moveTarget.y);
      if (d < 7 && !this.followPointer) {
        this.moveTarget = null;
      } else if (d > 0.5) {
        vx = (this.moveTarget.x - this.x) / d;
        vy = (this.moveTarget.y - this.y) / d;
      }
    }

    const m = Math.hypot(vx, vy);
    this.moving = m > 0.01;
    if (this.moving) {
      vx /= m; vy /= m;
      this.facing = Math.atan2(vy, vx);
      this.x += vx * CFG.player.speed * dt;
      this.y += vy * CFG.player.speed * dt;
      Nav.resolve(this);
    }

    if (this.isGhost) {
      this.trail.push(this.x, this.y);
      if (this.trail.length > 26) this.trail.splice(0, 2);
      if (this.moving && Math.random() < 0.4) FX.mote(this.x, this.y + 4, '150,235,255');
    }
  }

  setMoveTarget(pt, follow) {
    if (!pt) { this.moveTarget = null; this.followPointer = false; return; }
    this.moveTarget = { x: pt.x, y: pt.y };
    this.followPointer = !!follow;
  }
}

/* ─────────────── 致命构造体 ─────────────── */

class Construct {
  constructor(index, x, y, speedMul) {
    this.index = index;
    this.name = CFG.constructNames[index];
    this.shortName = '构造体 ' + (index + 1);   // 战斗记录用，避免每条都折行
    this.x = x; this.y = y;
    this.radius = CFG.construct.radius;
    this.maxHP = CFG.construct.maxHP;
    this.hp = this.maxHP;
    this.baseSpeed = CFG.construct.speed * speedMul;
    this.alive = true;
    this.alpha = 0;
    this.phase = Math.random() * 6.28;
    this.age = 0;

    this.slowStacks = 0;
    this.slowUntil = 0;
    this.frozen = false;
    this.frozenUntil = 0;

    this.startPath = Nav.pathLength(x, y);
    this.damageTaken = 0;
    this.killedAt = null;
  }

  get speed() {
    if (this.frozen) return 0;
    return this.baseSpeed * Math.max(0.1, 1 - 0.30 * this.slowStacks);
  }

  get hpPct() { return U.clamp(this.hp / this.maxHP, 0, 1); }

  slowRemaining(now) { return Math.max(0, this.slowUntil - now); }
  rootRemaining(now) { return this.frozen ? Math.max(0, this.frozenUntil - now) : 0; }

  pathRemaining() { return Nav.pathLength(this.x, this.y); }

  /** 0 → 刚出生，1 → 已抵达首领 */
  progress() {
    if (this.startPath <= 0) return 1;
    return U.clamp(1 - this.pathRemaining() / this.startPath, 0, 1);
  }

  eta() {
    const s = this.speed;
    if (s <= 0.01) return Infinity;
    return Math.max(0, (this.pathRemaining() - CFG.arena.reachRadius) / s);
  }

  applySlow(ability, now) {
    if (this.slowStacks < ability.maxStacks) this.slowStacks++;
    this.slowUntil = now + ability.slowDur;
  }

  applyRoot(ability, now) {
    this.frozen = true;
    this.frozenUntil = now + ability.root;
  }

  applyDamage(amount) {
    if (!this.alive) return 0;
    const dealt = Math.min(amount, this.hp);
    this.hp -= dealt;
    this.damageTaken += dealt;
    // 任何伤害都会打断定身
    if (this.frozen) { this.frozen = false; this.frozenUntil = 0; }
    if (this.hp <= 0) this.die();
    return dealt;
  }

  die() {
    this.alive = false;
    this.hp = 0;
    FX.burst(this.x, this.y, {
      n: 34, color: '190,140,255', speed0: 40, speed1: 210,
      life0: .45, life1: 1.1, r0: 1.4, r1: 3.6
    });
    FX.ring(this.x, this.y, 6, 46, '190,140,255', .55, 3);
    FX.label(this.x, this.y - 6, '已消灭', '#8bf04a');
    Sfx.play('death');
  }

  update(dt, now, others) {
    if (!this.alive) {
      this.alpha = Math.max(0, this.alpha - dt * 3.2);
      return;
    }

    this.age += dt;
    this.alpha = Math.min(1, this.alpha + dt * 3.5);

    // 减速到期
    if (this.slowStacks > 0 && now >= this.slowUntil) this.slowStacks = 0;
    // 定身到期
    if (this.frozen && now >= this.frozenUntil) this.frozen = false;

    if (Math.random() < 0.25) {
      FX.mote(this.x, this.y + 5, this.frozen ? '150,220,255' : '175,120,245');
    }

    if (this.age < CFG.construct.spawnGrace) return;

    const sp = this.speed;
    if (sp <= 0) return;

    const wp = Nav.waypoint(this.y);
    let dx = wp.x - this.x, dy = wp.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;

    // 绕柱
    for (const p of CFG.arena.pillars) {
      const px = this.x - p.x, py = this.y - p.y;
      const pd = Math.hypot(px, py) || 1;
      const range = p.r + this.radius + 36;
      if (pd < range) {
        const w = (range - pd) / 36;
        dx += (px / pd) * w * 1.5;
        dy += (py / pd) * w * 1.5;
        // 切向绕行，避免正面顶死
        const cross = dx * (-py / pd) + dy * (px / pd);
        const s = cross >= 0 ? 1 : -1;
        dx += (-py / pd) * s * w * 1.2;
        dy += (px / pd) * s * w * 1.2;
      }
    }

    // 彼此分离，方便点选
    const sep = CFG.construct.separation;
    for (const o of others) {
      if (o === this || !o.alive) continue;
      const ox = this.x - o.x, oy = this.y - o.y;
      const od = Math.hypot(ox, oy);
      if (od > 0.01 && od < sep) {
        const w = (1 - od / sep) * 0.85;
        dx += (ox / od) * w;
        dy += (oy / od) * w;
      }
    }

    const m = Math.hypot(dx, dy) || 1;
    this.x += (dx / m) * sp * dt;
    this.y += (dy / m) * sp * dt;
    Nav.resolve(this);
  }
}
