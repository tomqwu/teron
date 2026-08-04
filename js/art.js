/* ═══════════════════════════════════════════════════════════
   美术 —— 全部程序化生成，不依赖任何外部图片
   场景纹理烘焙一次，角色/特效每帧绘制
   ═══════════════════════════════════════════════════════════ */
'use strict';

const Art = {

  SS: 2,                 // 烘焙超采样倍率
  arena: null,           // 烘焙好的场地
  icons: {},             // 技能图标画布
  ready: false,

  init() {
    if (this.ready) return;
    this.stoneTile = this.bakeStoneTile();
    this.floorPath = this.polyPath(CFG.arena.poly);
    this.arena = this.bakeArena();
    for (const a of CFG.abilities) this.icons[a.id] = this.bakeIcon(a.id);
    this.icons.shadowOfDeath = this.bakeIcon('shadowOfDeath');
    this.ready = true;
  },

  /* ═══════════ 石材图案 ═══════════ */

  bakeStoneTile() {
    const S = 128;
    const { canvas, ctx } = U.canvas(S, S, 1);
    const rnd = U.mulberry32(9137);

    ctx.fillStyle = '#3b3242';
    ctx.fillRect(0, 0, S, S);

    // 斑驳
    for (let i = 0; i < 220; i++) {
      const x = rnd() * S, y = rnd() * S, r = 2 + rnd() * 16;
      const l = 0.5 + rnd() * 0.55;
      ctx.fillStyle = `rgba(${Math.round(72 * l)},${Math.round(60 * l)},${Math.round(84 * l)},${0.16 + rnd() * 0.22})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    // 横向凿痕
    ctx.strokeStyle = 'rgba(0,0,0,.22)';
    for (let i = 0; i < 9; i++) {
      ctx.lineWidth = 0.6 + rnd() * 1.6;
      const y = rnd() * S;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= S; x += 16) ctx.lineTo(x, y + (rnd() - 0.5) * 3);
      ctx.stroke();
    }
    return canvas;
  },

  /* ═══════════ 场地烘焙 ═══════════ */

  polyPath(pts, ctx) {
    const p = new Path2D();
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    p.closePath();
    return p;
  },

  bakeArena() {
    const A = CFG.arena;
    const { canvas, ctx } = U.canvas(CFG.W, CFG.H, this.SS);
    const path = this.polyPath(A.poly);
    const rnd = U.mulberry32(20250804);

    /* ── 虚空底色 ── */
    ctx.fillStyle = '#06050a';
    ctx.fillRect(0, 0, CFG.W, CFG.H);
    const voidGlow = ctx.createRadialGradient(360, 152, 20, 360, 152, 620);
    voidGlow.addColorStop(0, 'rgba(60,20,80,.35)');
    voidGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = voidGlow;
    ctx.fillRect(0, 0, CFG.W, CFG.H);

    /* ── 墙体 ── */
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.strokeStyle = 'rgba(0,0,0,.9)';
    ctx.lineWidth = 62; ctx.stroke(path);

    const pat = ctx.createPattern(this.stoneTile, 'repeat');
    ctx.strokeStyle = pat;
    ctx.lineWidth = 52; ctx.stroke(path);

    // 墙面竖向明暗
    const wallShade = ctx.createLinearGradient(0, 0, 0, CFG.H);
    wallShade.addColorStop(0, 'rgba(120,150,110,.10)');
    wallShade.addColorStop(.45, 'rgba(0,0,0,.18)');
    wallShade.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.strokeStyle = wallShade;
    ctx.lineWidth = 52; ctx.stroke(path);

    // 墙沿高光（向上偏移形成倒角）
    ctx.save();
    ctx.translate(0, -3.5);
    ctx.strokeStyle = 'rgba(214,196,236,.16)';
    ctx.lineWidth = 44; ctx.stroke(path);
    ctx.restore();

    // 内缘描边
    ctx.strokeStyle = 'rgba(12,8,16,.95)';
    ctx.lineWidth = 5; ctx.stroke(path);
    ctx.restore();

    /* ── 地面 ── */
    ctx.save();
    ctx.clip(path);

    ctx.fillStyle = '#191521';
    ctx.fillRect(0, 0, CFG.W, CFG.H);

    // 石板（错缝铺装）
    const T = 46;
    for (let row = 0, y = 40; y < CFG.H + T; y += T, row++) {
      const off = (row % 2) ? T / 2 : 0;
      for (let x = 60 - T + off; x < CFG.W + T; x += T) {
        const v = rnd();
        const l = 0.72 + v * 0.55;
        const r = Math.round(38 * l), g = Math.round(32 * l), b = Math.round(45 * l);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, T - 1.6, T - 1.6);
        // 上/左倒角
        ctx.fillStyle = 'rgba(255,240,255,.045)';
        ctx.fillRect(x, y, T - 1.6, 1.4);
        ctx.fillRect(x, y, 1.4, T - 1.6);
        ctx.fillStyle = 'rgba(0,0,0,.32)';
        ctx.fillRect(x, y + T - 3, T - 1.6, 1.4);
      }
    }

    // 大尺度污渍
    for (let i = 0; i < 26; i++) {
      const x = 60 + rnd() * 600, y = 60 + rnd() * 860, r = 40 + rnd() * 150;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const dark = rnd() > .45;
      g.addColorStop(0, dark ? 'rgba(0,0,0,.30)' : 'rgba(90,70,110,.14)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // 干涸血迹
    for (let i = 0; i < 11; i++) {
      const x = 100 + rnd() * 520, y = 380 + rnd() * 500;
      ctx.fillStyle = `rgba(${56 + rnd() * 20 | 0},14,16,${.16 + rnd() * .2})`;
      ctx.beginPath();
      const n = 9, br = 12 + rnd() * 34;
      for (let k = 0; k <= n; k++) {
        const a = k / n * Math.PI * 2;
        const rr = br * (0.55 + rnd() * 0.7);
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.72;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }

    // 裂缝
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    for (let i = 0; i < 20; i++) {
      let x = 90 + rnd() * 540, y = 80 + rnd() * 800;
      let a = rnd() * Math.PI * 2;
      ctx.lineWidth = 0.7 + rnd() * 1.5;
      ctx.beginPath(); ctx.moveTo(x, y);
      const seg = 3 + (rnd() * 6 | 0);
      for (let k = 0; k < seg; k++) {
        a += (rnd() - .5) * 1.5;
        x += Math.cos(a) * (10 + rnd() * 26);
        y += Math.sin(a) * (10 + rnd() * 26);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    /* ── 首领高台 ── */
    this.drawDais(ctx, A.boss.x, A.boss.y);

    /* ── 门廊 ── */
    this.drawDoorway(ctx);

    /* ── 火盆光池 ── */
    ctx.globalCompositeOperation = 'lighter';
    for (const b of A.braziers) {
      const g = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, 132);
      g.addColorStop(0, 'rgba(255,168,72,.30)');
      g.addColorStop(.35, 'rgba(220,110,40,.11)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, 132, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    /* ── 柱基（底座烘焙，柱身每帧画以获得高度感）── */
    for (const p of CFG.arena.pillars) {
      const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r + 16);
      g.addColorStop(0, 'rgba(0,0,0,.62)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 16, 0, 7); ctx.fill();
    }

    /* ── 内缘柔和阴影 ── */
    ctx.lineJoin = 'round';
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = `rgba(4,2,8,${0.085})`;
      ctx.lineWidth = 4 + i * 5;
      ctx.stroke(path);
    }

    ctx.restore(); // 结束地面裁剪

    /* ── 全局暗角 ── */
    const vg = ctx.createRadialGradient(360, 470, 180, 360, 470, 660);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.62)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, CFG.W, CFG.H);

    return canvas;
  },

  /** 首领高台：同心八边形 + 邪能符文环 */
  drawDais(ctx, cx, cy) {
    const oct = (r) => {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2 + Math.PI / 8;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.94;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
    };

    const steps = [
      { r: 132, fill: '#241e2c', top: 'rgba(255,240,255,.05)' },
      { r: 110, fill: '#2b2434', top: 'rgba(255,240,255,.06)' },
      { r:  88, fill: '#332a3e', top: 'rgba(255,240,255,.07)' }
    ];
    for (const s of steps) {
      ctx.save();
      oct(s.r);
      ctx.fillStyle = s.fill; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.clip();
      ctx.fillStyle = s.top;
      ctx.fillRect(cx - s.r, cy - s.r, s.r * 2, 4);
      ctx.restore();
    }

    // 符文环
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(139,240,74,.42)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(139,240,74,.8)';
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(0, 0, 64, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 50, 0, 7); ctx.stroke();

    // 符文刻痕
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 50, Math.sin(a) * 50);
      ctx.lineTo(Math.cos(a) * 64, Math.sin(a) * 64);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // 中央裂隙
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 46);
    g.addColorStop(0, 'rgba(139,240,74,.30)');
    g.addColorStop(.6, 'rgba(60,140,30,.10)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 46, 0, 7); ctx.fill();
    ctx.restore();
  },

  drawDoorway(ctx) {
    // 走廊两侧的雕柱与门槛
    for (const x of [296, 424]) {
      const g = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
      g.addColorStop(0, 'rgba(0,0,0,.5)');
      g.addColorStop(.5, 'rgba(120,104,140,.30)');
      g.addColorStop(1, 'rgba(0,0,0,.5)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 13, 300, 26, 72);
      ctx.strokeStyle = 'rgba(0,0,0,.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 13, 300, 26, 72);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = 'rgba(255,245,255,.05)';
        ctx.fillRect(x - 11, 306 + i * 14, 22, 2);
      }
    }
    // 门槛发光
    const g2 = ctx.createLinearGradient(0, 296, 0, 380);
    g2.addColorStop(0, 'rgba(139,240,74,.14)');
    g2.addColorStop(1, 'rgba(139,240,74,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(298, 296, 124, 84);
  },

  /* ═══════════ 技能图标 ═══════════ */

  bakeIcon(id) {
    const S = 64;
    const { canvas, ctx } = U.canvas(S, S, 2);
    const themes = {
      strike:        ['#2a1220', '#5e1c30', '#ffd9e6', '#ff5f8a'],
      lance:         ['#0d1b2e', '#12406e', '#dff4ff', '#6fe3f5'],
      chains:        ['#1a1226', '#3d2b5e', '#e6dcff', '#a566f0'],
      volley:        ['#0b2320', '#12564a', '#d8fff4', '#39e6b8'],
      shield:        ['#141a26', '#2b3a5e', '#e2ecff', '#8fb4ff'],
      shadowOfDeath: ['#180a20', '#3c1258', '#e9caff', '#c08bff']
    };
    const [bg0, bg1, hi, glow] = themes[id] || themes.lance;

    // 底板
    ctx.save();
    this.roundRect(ctx, 1, 1, S - 2, S - 2, 6);
    ctx.clip();
    const g = ctx.createRadialGradient(S * .38, S * .3, 2, S * .5, S * .55, S * .8);
    g.addColorStop(0, bg1);
    g.addColorStop(1, bg0);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);

    // 底板噪点
    const rnd = U.mulberry32(id.length * 977 + id.charCodeAt(0) * 31);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rnd() * .035})`;
      ctx.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 1 + rnd() * 2);
    }

    ctx.shadowColor = glow;
    ctx.shadowBlur = 9;
    this['glyph_' + id](ctx, S, hi, glow);
    ctx.shadowBlur = 0;
    ctx.restore();

    // 边框倒角
    ctx.strokeStyle = 'rgba(255,255,255,.20)';
    ctx.lineWidth = 1.4;
    this.roundRect(ctx, 1.4, 1.4, S - 2.8, S - 2.8, 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.9)';
    ctx.lineWidth = 1.6;
    this.roundRect(ctx, .8, .8, S - 1.6, S - 1.6, 6.6); ctx.stroke();
    // 顶部高光
    const hl = ctx.createLinearGradient(0, 2, 0, 26);
    hl.addColorStop(0, 'rgba(255,255,255,.16)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    this.roundRect(ctx, 2, 2, S - 4, 24, 5); ctx.fill();

    return canvas;
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  // 灵魂打击：三道灵爪
  glyph_strike(ctx, S, hi, glow) {
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 9;
      const g = ctx.createLinearGradient(10 + off, 8, 46 + off, 56);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(.35, hi);
      g.addColorStop(1, glow);
      ctx.strokeStyle = g;
      ctx.lineWidth = 5 - i * 0.6;
      ctx.beginPath();
      ctx.moveTo(12 + off, 9);
      ctx.quadraticCurveTo(34 + off * .5, 26, 40 + off, 55);
      ctx.stroke();
    }
  },

  // 灵魂之枪：斜向长枪
  glyph_lance(ctx, S, hi, glow) {
    ctx.lineCap = 'round';
    const g = ctx.createLinearGradient(12, 52, 52, 12);
    g.addColorStop(0, 'rgba(111,227,245,.15)');
    g.addColorStop(.55, glow);
    g.addColorStop(1, hi);
    ctx.strokeStyle = g; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(13, 51); ctx.lineTo(45, 19); ctx.stroke();
    // 枪头
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.moveTo(54, 10); ctx.lineTo(43, 15); ctx.lineTo(49, 21);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(54, 10); ctx.lineTo(49, 21); ctx.lineTo(45, 26);
    ctx.lineTo(38, 19); ctx.closePath();
    ctx.fillStyle = glow; ctx.fill();
    // 余晖
    ctx.strokeStyle = 'rgba(223,244,255,.5)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(11, 55); ctx.lineTo(24, 42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18, 57); ctx.lineTo(28, 47); ctx.stroke();
  },

  // 灵魂锁链：三节链环
  glyph_chains(ctx, S, hi, glow) {
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const x = 18 + i * 13, y = 44 - i * 13;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(-Math.PI / 4);
      const g = ctx.createLinearGradient(-9, 0, 9, 0);
      g.addColorStop(0, glow); g.addColorStop(.5, hi); g.addColorStop(1, glow);
      ctx.strokeStyle = g; ctx.lineWidth = 4.2;
      ctx.beginPath(); ctx.ellipse(0, 0, 9.5, 5.6, 0, 0, 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.ellipse(-1, -1, 9.5, 5.6, 0, Math.PI * 1.05, Math.PI * 1.85); ctx.stroke();
      ctx.restore();
    }
  },

  // 灵魂乱射：放射箭矢
  glyph_volley(ctx, S, hi, glow) {
    ctx.lineCap = 'round';
    const cx = 32, cy = 33;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 - Math.PI / 2;
      const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * 26, cy + Math.sin(a) * 26);
      g.addColorStop(0, 'rgba(255,255,255,.15)');
      g.addColorStop(.5, glow);
      g.addColorStop(1, hi);
      ctx.strokeStyle = g;
      ctx.lineWidth = i % 2 ? 2.2 : 3.4;
      const len = i % 2 ? 19 : 25;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6);
      ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      ctx.stroke();
    }
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(.4, hi);
    core.addColorStop(1, 'rgba(57,230,184,0)');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 7); ctx.fill();
  },

  // 灵魂护盾
  glyph_shield(ctx, S, hi, glow) {
    const p = new Path2D();
    p.moveTo(32, 8);
    p.lineTo(51, 16);
    p.lineTo(51, 33);
    p.quadraticCurveTo(51, 48, 32, 57);
    p.quadraticCurveTo(13, 48, 13, 33);
    p.lineTo(13, 16);
    p.closePath();
    const g = ctx.createLinearGradient(13, 8, 51, 57);
    g.addColorStop(0, 'rgba(226,236,255,.85)');
    g.addColorStop(.5, 'rgba(143,180,255,.5)');
    g.addColorStop(1, 'rgba(40,70,140,.65)');
    ctx.fillStyle = g; ctx.fill(p);
    ctx.strokeStyle = hi; ctx.lineWidth = 2.2; ctx.stroke(p);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(32, 15); ctx.lineTo(32, 47); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(19, 27); ctx.lineTo(45, 27); ctx.stroke();
  },

  // 死亡之影（debuff）
  glyph_shadowOfDeath(ctx, S, hi, glow) {
    const cx = 32, cy = 33;
    const g = ctx.createRadialGradient(cx, cy - 4, 2, cx, cy, 26);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(.25, hi);
    g.addColorStop(.7, glow);
    g.addColorStop(1, 'rgba(60,18,88,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 7); ctx.fill();
    // 头骨轮廓
    ctx.fillStyle = 'rgba(20,6,30,.82)';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 4, 13, 14, 0, Math.PI, 0);
    ctx.lineTo(cx + 9, cy + 10);
    ctx.lineTo(cx + 5, cy + 17);
    ctx.lineTo(cx - 5, cy + 17);
    ctx.lineTo(cx - 9, cy + 10);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.ellipse(cx - 5.5, cy - 4, 3.6, 4.4, .2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 5.5, cy - 4, 3.6, 4.4, -.2, 0, 7); ctx.fill();
  },

  /* ═══════════ 角色绘制 ═══════════ */

  /** 柱身（每帧画，带高度视差） */
  drawPillars(ctx, t) {
    for (const p of CFG.arena.pillars) {
      ctx.save();
      // 柱身
      const g = ctx.createLinearGradient(p.x - p.r, 0, p.x + p.r, 0);
      g.addColorStop(0, '#1a1520');
      g.addColorStop(.35, '#4a3f56');
      g.addColorStop(.6, '#332a3d');
      g.addColorStop(1, '#120e18');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * .55, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineWidth = 2; ctx.stroke();
      // 顶部火盆边缘
      ctx.strokeStyle = 'rgba(230,210,255,.14)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, p.r - 5, (p.r - 5) * .55, 0, 0, 7); ctx.stroke();
      ctx.restore();
      this.drawFlame(ctx, p.x, p.y - 2, t, 1.15);
    }
    // 其余火盆
    for (const b of CFG.arena.braziers) {
      if (CFG.arena.pillars.some(p => p.x === b.x && p.y === b.y)) continue;
      ctx.save();
      const g = ctx.createLinearGradient(b.x - 12, 0, b.x + 12, 0);
      g.addColorStop(0, '#15111c'); g.addColorStop(.4, '#3d3448'); g.addColorStop(1, '#0f0c14');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 12, 7, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.restore();
      this.drawFlame(ctx, b.x, b.y - 1, t, .72);
    }
  },

  drawFlame(ctx, x, y, t, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalCompositeOperation = 'lighter';
    const seed = (x * 7 + y * 13);
    for (let i = 0; i < 3; i++) {
      const ph = t * (3.1 + i * .7) + seed;
      const h = 16 + Math.sin(ph) * 5 + Math.sin(ph * 2.3) * 2.5;
      const w = 6.5 - i * 1.4 + Math.sin(ph * 1.7) * 1.1;
      const dx = Math.sin(ph * .9) * 1.8;
      const g = ctx.createRadialGradient(dx, -h * .4, 0, dx, -h * .35, h * .9);
      const c = i === 0 ? '255,120,30' : i === 1 ? '255,180,60' : '255,240,190';
      g.addColorStop(0, `rgba(${c},${.55 - i * .1})`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(dx, -h * .38, w, h * .62, 0, 0, 7);
      ctx.fill();
    }
    ctx.restore();
  },

  /** 塔隆·血魔本体 */
  drawTeron(ctx, t) {
    const B = CFG.arena.boss;
    const bob = Math.sin(t * 1.35) * 4;
    ctx.save();
    ctx.translate(B.x, B.y);

    // 旋转符文
    ctx.save();
    ctx.rotate(t * 0.22);
    ctx.strokeStyle = 'rgba(139,240,74,.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 13]);
    ctx.shadowColor = 'rgba(139,240,74,.9)'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(0, 0, 40, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 脚下暗影池
    const pool = ctx.createRadialGradient(0, 6, 2, 0, 6, 30);
    pool.addColorStop(0, 'rgba(10,0,16,.8)');
    pool.addColorStop(1, 'rgba(10,0,16,0)');
    ctx.fillStyle = pool;
    ctx.beginPath(); ctx.ellipse(0, 8, 30, 12, 0, 0, 7); ctx.fill();

    ctx.translate(0, bob - 6);
    ctx.scale(1.22, 1.22);

    // 背光轮廓，避免在暗地板上糊成一团
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rim = ctx.createRadialGradient(0, -6, 4, 0, -6, 40);
    rim.addColorStop(0, 'rgba(150,220,110,.30)');
    rim.addColorStop(.55, 'rgba(110,190,70,.12)');
    rim.addColorStop(1, 'rgba(80,160,50,0)');
    ctx.fillStyle = rim;
    ctx.beginPath(); ctx.arc(0, -6, 40, 0, 7); ctx.fill();
    ctx.restore();

    // 披风
    const cape = ctx.createLinearGradient(0, -26, 0, 22);
    cape.addColorStop(0, '#3d2449');
    cape.addColorStop(1, '#140a1c');
    ctx.fillStyle = cape;
    ctx.beginPath();
    ctx.moveTo(-8, -22);
    ctx.quadraticCurveTo(-24, -6, -20, 20);
    for (let i = 0; i <= 5; i++) {
      const px = -20 + i * 8;
      const py = 20 + Math.sin(t * 2.4 + i * 1.3) * 3.2;
      ctx.lineTo(px, py);
    }
    ctx.quadraticCurveTo(24, -6, 8, -22);
    ctx.closePath(); ctx.fill();

    // 躯干
    const body = ctx.createLinearGradient(-10, -20, 12, 16);
    body.addColorStop(0, '#6d5a7b');
    body.addColorStop(.55, '#33253f');
    body.addColorStop(1, '#150e1e');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-10, -18); ctx.lineTo(10, -18);
    ctx.lineTo(8, 16); ctx.lineTo(-8, 16);
    ctx.closePath(); ctx.fill();
    // 胸甲邪能纹
    ctx.strokeStyle = 'rgba(139,240,74,.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-5, -12); ctx.lineTo(0, -4); ctx.lineTo(-5, 4);
    ctx.moveTo(5, -12); ctx.lineTo(0, -4); ctx.lineTo(5, 4);
    ctx.stroke();

    // 肩甲尖刺
    ctx.fillStyle = '#7b6889';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 9, -19);
      ctx.lineTo(s * 22, -14);
      ctx.lineTo(s * 19, -4);
      ctx.lineTo(s * 9, -7);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1.2; ctx.stroke();
      // 刺
      ctx.fillStyle = '#c3b3ce';
      ctx.beginPath();
      ctx.moveTo(s * 15, -15); ctx.lineTo(s * 20, -25); ctx.lineTo(s * 19, -13);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7b6889';
    }

    // 头
    ctx.fillStyle = '#241830';
    ctx.beginPath(); ctx.ellipse(0, -24, 8, 8.5, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(180,160,200,.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, -24, 8, 8.5, 0, Math.PI * 1.1, Math.PI * 1.95); ctx.stroke();
    // 眼
    ctx.save();
    ctx.shadowColor = '#8bf04a'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#c8ff8a';
    ctx.beginPath(); ctx.ellipse(-3.2, -25, 2, 1.5, .25, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3.2, -25, 2, 1.5, -.25, 0, 7); ctx.fill();
    ctx.restore();

    // 镰刀
    ctx.save();
    ctx.translate(20, -4);
    ctx.rotate(Math.sin(t * .8) * .05 - .12);
    ctx.strokeStyle = '#3a2f42'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 22); ctx.lineTo(2, -26); ctx.stroke();
    const blade = ctx.createLinearGradient(2, -26, 24, -12);
    blade.addColorStop(0, '#d9e8ff');
    blade.addColorStop(1, 'rgba(120,150,180,.25)');
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(2, -26);
    ctx.quadraticCurveTo(24, -24, 20, -6);
    ctx.quadraticCurveTo(18, -20, 2, -21);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    ctx.restore();
  },

  /** 玩家（生前：小小的战士剪影） */
  drawPlayerAlive(ctx, x, y, t, facing) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.35, 1.35);
    // 影子
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.ellipse(0, 8, 9, 4, 0, 0, 7); ctx.fill();
    // 披风
    ctx.fillStyle = '#7b1f2b';
    ctx.beginPath();
    ctx.moveTo(-7, -6);
    ctx.quadraticCurveTo(-9, 6, -5, 9);
    ctx.lineTo(5, 9);
    ctx.quadraticCurveTo(9, 6, 7, -6);
    ctx.closePath(); ctx.fill();
    // 躯干
    const g = ctx.createLinearGradient(-6, -8, 6, 8);
    g.addColorStop(0, '#c9d3e0'); g.addColorStop(1, '#5d6a7c');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-5.5, -7, 11, 13, 3) : ctx.rect(-5.5, -7, 11, 13);
    ctx.fill();
    // 头
    ctx.fillStyle = '#e8d9bf';
    ctx.beginPath(); ctx.arc(0, -10, 4.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#8b93a3';
    ctx.beginPath(); ctx.arc(0, -11.4, 4.6, Math.PI, 0); ctx.fill();
    ctx.restore();
  },

  /** 玩家幽魂形态 */
  drawPlayerGhost(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(0, -2, 1, 0, -2, 26);
    halo.addColorStop(0, 'rgba(150,240,255,.42)');
    halo.addColorStop(1, 'rgba(80,200,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, -2, 26, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    this.wraithBody(ctx, t, 13, ['rgba(232,253,255,.95)', 'rgba(120,225,255,.55)', 'rgba(40,140,200,0)'], '#ffffff');
    ctx.restore();
  },

  /** 构造体 */
  drawConstruct(ctx, c, t) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.globalAlpha = c.alpha;

    const slowed = c.slowStacks > 0;
    const halo = ctx.createRadialGradient(0, -2, 1, 0, -2, 24);
    ctx.globalCompositeOperation = 'lighter';
    if (c.frozen) {
      halo.addColorStop(0, 'rgba(160,230,255,.42)');
      halo.addColorStop(1, 'rgba(60,140,220,0)');
    } else {
      halo.addColorStop(0, 'rgba(190,130,255,.34)');
      halo.addColorStop(1, 'rgba(110,50,190,0)');
    }
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, -2, 24, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    const cols = c.frozen
      ? ['rgba(226,248,255,.95)', 'rgba(130,200,245,.6)', 'rgba(50,110,180,0)']
      : slowed
        ? ['rgba(212,232,255,.92)', 'rgba(140,180,240,.55)', 'rgba(60,80,170,0)']
        : ['rgba(232,214,255,.92)', 'rgba(160,110,235,.58)', 'rgba(70,30,130,0)'];
    this.wraithBody(ctx, t + c.phase, 15, cols, c.frozen ? '#d8f4ff' : '#c8ff8a');

    // 减速：环绕的锁链光点
    if (slowed) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < c.slowStacks * 3; i++) {
        const a = t * 1.6 + i * (Math.PI * 2 / (c.slowStacks * 3));
        const rx = Math.cos(a) * 17, ry = Math.sin(a) * 7 + 4;
        ctx.fillStyle = 'rgba(140,225,255,.75)';
        ctx.beginPath(); ctx.arc(rx, ry, 1.7, 0, 7); ctx.fill();
      }
      ctx.restore();
    }

    // 定身：冰棱外壳
    if (c.frozen) {
      ctx.save();
      ctx.strokeStyle = 'rgba(200,240,255,.85)';
      ctx.lineWidth = 1.6;
      ctx.shadowColor = 'rgba(160,230,255,.9)'; ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + t * .35;
        const px = Math.cos(a) * 19, py = Math.sin(a) * 19 - 2;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
      ctx.fillStyle = 'rgba(150,220,255,.10)'; ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  },

  /** 幽魂通用躯体：尖兜帽剪影 + 破碎下摆 + 发光眼 */
  wraithBody(ctx, t, R, cols, eyeColor) {
    const w = R * .74;
    const g = ctx.createLinearGradient(0, -R * 1.6, 0, R * 1.05);
    g.addColorStop(0, cols[0]);
    g.addColorStop(.5, cols[1]);
    g.addColorStop(1, cols[2]);
    ctx.fillStyle = g;

    ctx.beginPath();
    // 左肩 → 尖顶兜帽 → 右肩
    ctx.moveTo(-w * .62, -R * .5);
    ctx.quadraticCurveTo(-w * .78, -R * 1.28, 0, -R * 1.6);
    ctx.quadraticCurveTo(w * .78, -R * 1.28, w * .62, -R * .5);
    // 右侧外扩
    ctx.quadraticCurveTo(w * 1.22, R * .05, w * 1.02, R * .7);
    // 破碎的下摆：长短交替的尖角
    const n = 7;
    for (let i = n; i >= 0; i--) {
      const px = -w * 1.02 + (i / n) * (w * 2.04);
      const deep = (i % 2 === 0) ? .95 : .55;
      const py = R * deep + Math.sin(t * 3.2 + i * 1.35) * (R * .2);
      ctx.lineTo(px, py);
    }
    ctx.quadraticCurveTo(-w * 1.22, R * .05, -w * .62, -R * .5);
    ctx.closePath();
    ctx.fill();

    // 兜帽内的黑暗
    const hood = ctx.createRadialGradient(0, -R * .82, R * .06, 0, -R * .82, R * .62);
    hood.addColorStop(0, 'rgba(6,2,12,.92)');
    hood.addColorStop(1, 'rgba(6,2,12,.15)');
    ctx.fillStyle = hood;
    ctx.beginPath();
    ctx.ellipse(0, -R * .82, w * .56, R * .58, 0, 0, 7);
    ctx.fill();

    // 眼
    ctx.save();
    ctx.shadowColor = eyeColor; ctx.shadowBlur = 8;
    ctx.fillStyle = eyeColor;
    const ey = -R * .85, ex = w * .26;
    ctx.beginPath(); ctx.ellipse(-ex, ey, R * .13, R * .075, .22, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex, ey, R * .13, R * .075, -.22, 0, 7); ctx.fill();
    ctx.restore();
  }
};
