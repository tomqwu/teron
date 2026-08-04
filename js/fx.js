/* ═══════════════════════════════════════════════════════════
   特效 —— 粒子、飘字、弹道、光环、屏幕震动
   ═══════════════════════════════════════════════════════════ */
'use strict';

const FX = {

  parts: [],
  texts: [],
  rings: [],
  bolts: [],
  shake: 0,
  shakeT: 0,

  reset() {
    this.parts.length = 0;
    this.texts.length = 0;
    this.rings.length = 0;
    this.bolts.length = 0;
    this.shake = 0;
  },

  /* ── 生成 ───────────────────────────── */

  burst(x, y, opt) {
    const n = opt.n || 12;
    for (let i = 0; i < n; i++) {
      const a = opt.angle != null ? opt.angle + U.rand(-.6, .6) : U.rand(0, Math.PI * 2);
      const sp = U.rand(opt.speed0 || 40, opt.speed1 || 150);
      this.parts.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0, max: U.rand(opt.life0 || .25, opt.life1 || .6),
        r: U.rand(opt.r0 || 1.2, opt.r1 || 3.2),
        color: opt.color || '150,220,255',
        drag: opt.drag == null ? 2.6 : opt.drag,
        gy: opt.gy || 0,
        add: opt.add !== false
      });
    }
  },

  /** 缓慢上升的灵魂尘埃 */
  mote(x, y, color) {
    this.parts.push({
      x: x + U.rand(-8, 8), y: y + U.rand(-6, 6),
      vx: U.rand(-8, 8), vy: U.rand(-26, -10),
      life: 0, max: U.rand(.5, 1.1),
      r: U.rand(.7, 1.7), color: color || '180,140,255',
      drag: .8, gy: 0, add: true
    });
  },

  damage(x, y, amount, kind) {
    this.texts.push({
      x: x + U.rand(-9, 9), y: y - 10,
      vy: -46, life: 0, max: kind === 'big' ? 1.25 : 0.95,
      text: U.num(amount),
      size: kind === 'big' ? 22 : kind === 'small' ? 13 : 16,
      color: kind === 'big' ? '#ffe27a' : kind === 'small' ? '#cfd8e4' : '#ffffff',
      glow: kind === 'big' ? 'rgba(255,180,40,.9)' : 'rgba(0,0,0,.9)'
    });
  },

  label(x, y, text, color) {
    this.texts.push({
      x, y: y - 16, vy: -30, life: 0, max: 1.2,
      text, size: 13, color: color || '#8bf04a', glow: 'rgba(0,0,0,.9)'
    });
  },

  ring(x, y, r0, r1, color, dur, width) {
    this.rings.push({ x, y, r0, r1, color, life: 0, max: dur || .5, w: width || 3 });
  },

  /** 追踪弹道；到达后触发 onHit */
  bolt(sx, sy, target, speed, color, onHit) {
    const d = U.dist(sx, sy, target.x, target.y);
    this.bolts.push({
      x: sx, y: sy, target, speed, color,
      onHit, life: 0, max: Math.max(0.05, d / speed), trail: []
    });
  },

  hit(x, y) { this.shake = Math.max(this.shake, 3); this.shakeT = 0; },

  kick(mag) { this.shake = Math.max(this.shake, mag); this.shakeT = 0; },

  /* ── 更新 ───────────────────────────── */

  update(dt) {
    const P = this.parts;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life += dt;
      if (p.life >= p.max) { P.splice(i, 1); continue; }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vy *= k;
      p.vy += p.gy * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }

    const T = this.texts;
    for (let i = T.length - 1; i >= 0; i--) {
      const t = T[i];
      t.life += dt;
      if (t.life >= t.max) { T.splice(i, 1); continue; }
      t.y += t.vy * dt;
      t.vy *= Math.exp(-2.2 * dt);
    }

    const R = this.rings;
    for (let i = R.length - 1; i >= 0; i--) {
      R[i].life += dt;
      if (R[i].life >= R[i].max) R.splice(i, 1);
    }

    const B = this.bolts;
    for (let i = B.length - 1; i >= 0; i--) {
      const b = B[i];
      b.life += dt;
      const tx = b.target.x, ty = b.target.y;
      const k = U.clamp(b.life / b.max, 0, 1);
      // 朝目标插值 + 轻微弧线
      b.x = U.lerp(b.x, tx, 1 - Math.exp(-14 * dt));
      b.y = U.lerp(b.y, ty, 1 - Math.exp(-14 * dt));
      b.trail.push(b.x, b.y);
      if (b.trail.length > 16) b.trail.splice(0, 2);
      if (k >= 1 || U.dist(b.x, b.y, tx, ty) < 6) {
        if (b.onHit) b.onHit();
        B.splice(i, 1);
      }
    }

    if (this.shake > 0) {
      this.shakeT += dt;
      this.shake = Math.max(0, this.shake - dt * 22);
    }
  },

  shakeOffset() {
    if (this.shake <= 0) return [0, 0];
    const a = this.shakeT * 62;
    return [Math.sin(a * 1.7) * this.shake, Math.cos(a * 2.3) * this.shake];
  },

  /* ── 绘制 ───────────────────────────── */

  drawWorld(ctx) {
    // 光环
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const r of this.rings) {
      const k = r.life / r.max;
      const rad = U.lerp(r.r0, r.r1, 1 - Math.pow(1 - k, 2.2));
      ctx.strokeStyle = `rgba(${r.color},${(1 - k) * .8})`;
      ctx.lineWidth = r.w * (1 - k * .6);
      ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, 7); ctx.stroke();
    }

    // 弹道
    for (const b of this.bolts) {
      const tr = b.trail;
      for (let i = 0; i < tr.length - 2; i += 2) {
        const a = (i / tr.length) * .55;
        ctx.strokeStyle = `rgba(${b.color},${a})`;
        ctx.lineWidth = 1 + (i / tr.length) * 4;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tr[i], tr[i + 1]); ctx.lineTo(tr[i + 2], tr[i + 3]); ctx.stroke();
      }
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 9);
      g.addColorStop(0, `rgba(255,255,255,.95)`);
      g.addColorStop(.4, `rgba(${b.color},.8)`);
      g.addColorStop(1, `rgba(${b.color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, 9, 0, 7); ctx.fill();
    }

    // 粒子
    for (const p of this.parts) {
      const k = 1 - p.life / p.max;
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      ctx.fillStyle = `rgba(${p.color},${k * .9})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.35 + k * 0.65), 0, 7); ctx.fill();
    }
    ctx.restore();
  },

  drawText(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const k = t.life / t.max;
      const a = k < .12 ? k / .12 : k > .68 ? (1 - k) / .32 : 1;
      const scale = k < .12 ? U.lerp(1.5, 1, k / .12) : 1;
      ctx.globalAlpha = U.clamp(a, 0, 1);
      ctx.font = `700 ${t.size * scale}px "Bahnschrift","DIN Alternate",system-ui,sans-serif`;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = t.glow;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }
};
