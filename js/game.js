/* ═══════════════════════════════════════════════════════════
   游戏主体 —— 状态机、输入、更新、渲染
   ═══════════════════════════════════════════════════════════ */
'use strict';

const Game = {

  /* ── 状态 ─────────────────────────── */
  phase: 'title',          // title | debuff | fight | over | paused
  prevPhase: null,
  clock: 0,                // 单调时钟（秒），暂停时不走
  fightTime: 0,
  debuffLeft: 0,

  player: null,
  constructs: [],
  target: null,

  gcdUntil: 0,
  cooldowns: {},
  stats: null,

  difficultyIndex: 1,
  uiScaleIndex: 1,
  practice: false,
  azerty: false,
  best: null,
  newBest: false,
  breaker: null,

  bossLineAt: 0,

  input: { left: 0, right: 0, up: 0, down: 0 },

  get now() { return this.clock; },
  get difficulty() { return CFG.difficulties[this.difficultyIndex]; },

  /* ── 初始化 ───────────────────────── */

  init() {
    this.canvas = U.$('#game');
    this.ctx = this.canvas.getContext('2d');
    Art.init();
    Nav.build();

    this.difficultyIndex = U.store.get('difficulty', 1);
    this.uiScaleIndex = U.clamp(U.store.get('uiScale', 1), 0, CFG.uiScales.length - 1);
    this.applyUiScale();
    this.practice = U.store.get('practice', false);
    this.azerty = U.store.get('azerty', false);
    const soundOn = U.store.get('sound', true);

    U.$('#optPractice').checked = this.practice;
    U.$('#optAzerty').checked = this.azerty;
    U.$('#optSound').checked = soundOn;
    Sfx.enabled = soundOn;

    this.resetRun(false);
    UI.init(this);
    UI.syncDifficulty(this.difficultyIndex);
    UI.syncFontScale(this.uiScaleIndex);
    this.loadBest();

    this.bindDOM();
    this.bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());

    UI.show('titleScreen');
  },

  loadBest() {
    const key = this.difficulty.id;
    this.best = U.store.get('best.' + key, null);
    UI.setBest(this.best);
  },

  setDifficulty(i) {
    this.difficultyIndex = i;
    U.store.set('difficulty', i);
    UI.syncDifficulty(i);
    this.loadBest();
  },

  applyUiScale() {
    document.documentElement.style.setProperty('--ui', CFG.uiScales[this.uiScaleIndex].value);
  },

  setUiScale(i) {
    this.uiScaleIndex = i;
    U.store.set('uiScale', i);
    this.applyUiScale();
    UI.syncFontScale(i);
    // 字号变了 → 底部操作区高度变了 → 场地留白要重算
    requestAnimationFrame(() => this.resize());
  },

  bindDOM() {
    U.$('#btnStart').addEventListener('click', () => this.start());
    U.$('#btnSpellbook').addEventListener('click', () => UI.show('spellbookScreen'));
    U.$('#btnBookBack').addEventListener('click', () => UI.show('titleScreen'));
    U.$('#btnBookClose').addEventListener('click', () => UI.show('titleScreen'));
    U.$('#btnRetry').addEventListener('click', () => this.start());
    U.$('#btnMenu').addEventListener('click', () => this.toTitle());
    U.$('#btnResume').addEventListener('click', () => this.resume());
    U.$('#btnPauseRetry').addEventListener('click', () => this.start());
    U.$('#btnPauseMenu').addEventListener('click', () => this.toTitle());

    U.$('#optPractice').addEventListener('change', e => {
      this.practice = e.target.checked; U.store.set('practice', this.practice);
    });
    U.$('#optAzerty').addEventListener('change', e => {
      this.azerty = e.target.checked; U.store.set('azerty', this.azerty);
    });
    U.$('#optSound').addEventListener('change', e => {
      Sfx.setEnabled(e.target.checked); U.store.set('sound', e.target.checked);
    });
  },

  /* ── 局内重置 ─────────────────────── */

  resetRun(keepPhase) {
    this.player = new Player();
    this.constructs = [];
    this.target = null;
    this.clock = 0;
    this.fightTime = 0;
    this.gcdUntil = 0;
    this.cooldowns = {};
    this.newBest = false;
    this.breaker = null;
    this.bossLineAt = 6;
    this.stats = { casts: 0, damage: 0, idle: 0, leaks: 0, byId: {} };
    this.input.left = this.input.right = this.input.up = this.input.down = 0;
    FX.reset();
    if (!keepPhase) this.phase = 'title';
  },

  start() {
    Sfx.unlock();
    this.resetRun(true);
    UI.clearLog();
    UI.hideAll();
    UI.setActionBar(false);
    this.phase = 'debuff';
    this.debuffLeft = this.difficulty.debuff;
    this._lastTick = Math.ceil(this.debuffLeft);

    Sfx.play('aggro');
    Sfx.startAmbient();
    UI.callout('死亡之影！');
    UI.log('塔隆·血魔对你施放了 <b>死亡之影</b>', 'warn');
    UI.log('立刻远离首领，构造体会在你倒下处生成', 'warn');
    UI.setBest(this.best);
  },

  toTitle() {
    this.phase = 'title';
    Sfx.stopAmbient();
    this.resetRun(true);
    UI.setActionBar(false);
    UI.show('titleScreen');
  },

  pause() {
    if (this.phase !== 'debuff' && this.phase !== 'fight') return;
    this.prevPhase = this.phase;
    this.phase = 'paused';
    UI.show('pauseScreen');
  },

  resume() {
    if (this.phase !== 'paused') return;
    this.phase = this.prevPhase || 'fight';
    UI.hideAll();
  },

  /* ── 幽魂阶段开始 ─────────────────── */

  enterGhostPhase() {
    this.phase = 'fight';
    this.fightTime = 0;
    this.player.becomeGhost();

    const spread = this.difficulty.spawnSpread;
    const speedMul = this.difficulty.speedMul;
    const offsets = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    this.constructs = offsets.map((o, i) => {
      const c = new Construct(
        i,
        U.clamp(this.player.x + o[0] * spread + U.rand(-6, 6), 100, CFG.W - 100),
        U.clamp(this.player.y + o[1] * spread + U.rand(-6, 6), 90, CFG.H - 90),
        speedMul
      );
      Nav.resolve(c);
      c.startPath = Nav.pathLength(c.x, c.y);
      return c;
    });

    UI.setActionBar(true);
    FX.ring(this.player.x, this.player.y, 4, 90, '190,140,255', .8, 5);
    FX.burst(this.player.x, this.player.y, { n: 40, color: '200,160,255', speed0: 60, speed1: 240, life0: .5, life1: 1.2 });
    FX.kick(7);
    Sfx.play('playerDeath');
    Sfx.play('spawn');

    UI.callout('你倒下了 —— 四只构造体出现');
    UI.log('你化为幽魂，<b>4 只构造体</b>已出现', 'warn');
    this.setTarget(this.mostUrgent(), true);
  },

  /* ── 目标 ─────────────────────────── */

  aliveList() { return this.constructs.filter(c => c.alive); },

  setTarget(c, silent) {
    if (!c || !c.alive) { this.target = null; return; }
    if (this.target !== c && !silent) Sfx.play('target');
    this.target = c;
  },

  cycleTarget(dir) {
    const list = this.constructs;
    if (!list.length) return;
    let idx = this.target ? this.target.index : (dir > 0 ? -1 : 0);
    for (let k = 1; k <= 4; k++) {
      const i = ((idx + dir * k) % 4 + 4) % 4;
      if (list[i] && list[i].alive) { this.setTarget(list[i]); return; }
    }
    this.target = null;
  },

  mostUrgent() {
    let best = null, bestD = Infinity;
    for (const c of this.aliveList()) {
      const d = c.pathRemaining();
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  },

  /* ── 技能 ─────────────────────────── */

  usability(ab) {
    if (this.phase !== 'fight') return 'dead';
    if (this.clock < this.gcdUntil) return 'gcd';
    if ((this.cooldowns[ab.id] || 0) > this.clock) return 'cd';
    if (ab.noop) return 'ok';
    if (!ab.aoe) {
      if (!this.target || !this.target.alive) return 'notarget';
      const d = U.dist(this.player.x, this.player.y, this.target.x, this.target.y);
      if (d > ab.range * CFG.YARD) return 'oor';
    }
    return 'ok';
  },

  cast(id) {
    Sfx.unlock();
    const ab = CFG.ability(id);
    if (!ab) return;
    const state = this.usability(ab);

    if (state !== 'ok') {
      if (state === 'notarget') UI.log('你没有目标', 'warn');
      else if (state === 'oor') UI.log(`${ab.name}：距离太远`, 'warn');
      else if (state === 'cd') UI.log(`${ab.name}：还没冷却好`, 'warn');
      if (state !== 'gcd') Sfx.play('error');
      return;
    }

    this.gcdUntil = this.clock + CFG.gcd;
    if (ab.cd > 0) this.cooldowns[ab.id] = this.clock + ab.cd;
    this.stats.casts++;
    this.stats.byId[ab.id] = (this.stats.byId[ab.id] || 0) + 1;

    UI.flashSlot(ab.id);
    UI.castFlash(ab.name);
    Sfx.play('cast_' + ab.id);

    switch (ab.id) {
      case 'strike':  this.castStrike(ab);  break;
      case 'lance':   this.castLance(ab);   break;
      case 'chains':  this.castChains(ab);  break;
      case 'volley':  this.castVolley(ab);  break;
      case 'shield':  this.castShield(ab);  break;
    }
  },

  roll(ab) { return U.rand(ab.minDmg, ab.maxDmg); },

  hit(c, amount, kind) {
    if (!c.alive) return;
    const dealt = c.applyDamage(amount);
    this.stats.damage += dealt;
    FX.damage(c.x, c.y, dealt, kind);
    FX.burst(c.x, c.y, { n: kind === 'big' ? 14 : 7, color: '255,225,150', speed0: 30, speed1: 120, life0: .2, life1: .45, r0: 1, r1: 2.4 });
    Sfx.play(kind === 'big' ? 'impact_big' : 'impact');
    if (!c.alive) {
      UI.log(`<span class="kill">${c.shortName} 已消灭</span>`, '');
      if (this.target === c) this.setTarget(this.mostUrgent(), true);
    }
  },

  castStrike(ab) {
    const t = this.target;
    UI.log(`<span class="cast">${ab.name}</span> → ${t.shortName}`, '');
    const a = Math.atan2(t.y - this.player.y, t.x - this.player.x);
    FX.burst(t.x, t.y, { n: 12, color: '255,180,220', angle: a, speed0: 60, speed1: 180, life0: .15, life1: .4 });
    this.hit(t, this.roll(ab), 'small');
  },

  castLance(ab) {
    const t = this.target;
    UI.log(`<span class="cast">${ab.name}</span> → ${t.shortName}`, '');
    FX.bolt(this.player.x, this.player.y, t, ab.travel, '111,227,245', () => {
      if (!t.alive) return;
      t.applySlow(ab, this.clock);
      this.hit(t, this.roll(ab), 'normal');
      FX.ring(t.x, t.y, 3, 22, '111,227,245', .35, 2);
    });
  },

  castChains(ab) {
    const R = ab.range * CFG.YARD;
    FX.ring(this.player.x, this.player.y, 6, R, '165,102,240', .55, 4);
    const hits = this.aliveList().filter(c => U.dist(this.player.x, this.player.y, c.x, c.y) <= R);
    UI.log(`<span class="cast">${ab.name}</span> · 命中 ${hits.length} 个`, '');
    if (!hits.length) UI.log('灵魂锁链 · 未命中', 'warn');
    for (const c of hits) {
      // 先结算伤害，再上定身 —— 否则会被自己的伤害立刻打断
      this.hit(c, this.roll(ab), 'small');
      if (c.alive) {
        c.applyRoot(ab, this.clock);
        FX.ring(c.x, c.y, 2, 26, '200,240,255', .4, 2);
      }
    }
  },

  castVolley(ab) {
    const R = ab.range * CFG.YARD;
    FX.ring(this.player.x, this.player.y, 6, R, '57,230,184', .5, 3);
    FX.kick(4);
    const hits = this.aliveList().filter(c => U.dist(this.player.x, this.player.y, c.x, c.y) <= R);
    UI.log(`<span class="cast">${ab.name}</span> · 命中 ${hits.length} 个`, '');
    if (!hits.length) UI.log('灵魂乱射 · 未命中', 'warn');
    for (const c of hits) {
      FX.bolt(this.player.x, this.player.y, c, ab.travel, '57,230,184', () => {
        if (c.alive) this.hit(c, this.roll(ab), 'big');
      });
    }
  },

  castShield(ab) {
    UI.log(`<span class="cast">${ab.name}</span> · 本模拟中无效果`, '');
    FX.ring(this.player.x, this.player.y, 4, 34, '143,180,255', .5, 3);
  },

  /* ── 主循环 ───────────────────────── */

  update(dt) {
    if (this.phase === 'paused' || this.phase === 'title') { FX.update(dt); return; }

    this.clock += dt;
    FX.update(dt);

    if (this.phase === 'debuff') {
      this.player.update(dt, this.input);
      this.debuffLeft -= dt;
      const s = Math.ceil(this.debuffLeft);
      if (s !== this._lastTick && s >= 0) {
        this._lastTick = s;
        Sfx.play(s <= 3 ? 'tickHot' : 'tick');
      }
      // 死亡之影粒子
      if (Math.random() < 0.6) FX.mote(this.player.x, this.player.y, '190,120,255');
      if (this.debuffLeft <= 0) this.enterGhostPhase();
      return;
    }

    if (this.phase === 'fight') {
      this.fightTime += dt;
      this.player.update(dt, this.input);

      if (this.clock >= this.gcdUntil) this.stats.idle += dt;

      const list = this.constructs;
      for (const c of list) {
        c.update(dt, this.clock, list);
        if (!c.alive && c.killedAt == null) c.killedAt = this.fightTime;
      }

      // 目标失效
      if (this.target && !this.target.alive) this.setTarget(this.mostUrgent(), true);

      // 首领随机喊话
      if (this.fightTime > this.bossLineAt) {
        this.bossLineAt = this.fightTime + U.rand(11, 18);
        UI.log(`<b>血魔</b>：${U.pick(CFG.bossLines)}`, 'warn');
      }

      this.checkEnd();
      return;
    }

    if (this.phase === 'over') {
      // 战斗结束后构造体停止推进，只播完消散动画
      for (const c of this.constructs) if (!c.alive) c.alpha = Math.max(0, c.alpha - dt * 3.2);
    }
  },

  checkEnd() {
    const B = CFG.arena.boss;
    for (const c of this.aliveList()) {
      if (U.dist(c.x, c.y, B.x, B.y) < CFG.arena.reachRadius) {
        if (this.practice) {
          // 训练模式：推回门口继续练
          this.stats.leaks++;
          const w = CFG.arena.waypoints[0];
          c.x = w.x + U.rand(-30, 30);
          c.y = w.y + U.rand(-10, 20);
          Nav.resolve(c);
          c.startPath = Nav.pathLength(c.x, c.y);
          FX.ring(B.x, B.y, 8, 70, '220,60,50', .6, 4);
          UI.log(`<span class="warn">${c.shortName} 漏过首领</span> · 已推回门口（第 ${this.stats.leaks} 次）`, '');
          Sfx.play('error');
        } else {
          this.breaker = c;
          this.finish(false);
          return;
        }
      }
    }
    if (this.constructs.length && this.aliveList().length === 0) this.finish(true);
  },

  finish(won) {
    this.phase = 'over';
    this.won = won;
    UI.setActionBar(false);
    Sfx.stopAmbient();
    Sfx.play(won ? 'win' : 'lose');
    FX.kick(won ? 5 : 10);

    if (won && !this.practice) {
      const key = 'best.' + this.difficulty.id;
      const prev = U.store.get(key, null);
      if (prev == null || this.fightTime < prev) {
        U.store.set(key, this.fightTime);
        this.best = this.fightTime;
        this.newBest = true;
        UI.setBest(this.best);
      }
    }

    UI.log(won ? '<span class="kill">全部构造体已消灭 —— 团队幸存</span>'
                : '<span class="warn">构造体抵达首领 —— 团队全灭</span>', '');

    setTimeout(() => { if (this.phase === 'over') UI.showResult(won, this); }, won ? 900 : 1100);
  },

  /* ── 渲染 ─────────────────────────── */

  /**
   * 量出底部操作区与目标框的真实高度，写成 CSS 变量。
   * 字号档位一变，这两个值就跟着变，窄屏的 HUD 定位才不会串位。
   */
  measureDock() {
    const vp = U.$('#viewport');
    const dock = U.$('#dock');
    const tf = UI.d && UI.d.targetFrame;

    const dockH = dock ? dock.offsetHeight : 150;

    let tfH = this._tfH || 130;
    if (tf) {
      const wasHidden = tf.hidden;
      if (wasHidden) { tf.style.visibility = 'hidden'; tf.hidden = false; }
      tfH = tf.offsetHeight || tfH;
      if (wasHidden) { tf.hidden = true; tf.style.visibility = ''; }
      this._tfH = tfH;
    }

    if (vp) {
      vp.style.setProperty('--dock-h', dockH + 'px');
      vp.style.setProperty('--tf-h', tfH + 'px');
    }
    return { dockH, tfH };
  },

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    // 侧栏隐藏后，底部要留给构造体条 + 技能条（窄竖屏还要再让出目标框）。
    // 场地跟着缩小，而不是被 HUD 盖在上面。技能条隐藏时也占位（.off 只是
    // visibility），所以这个高度在一局里不会跳。
    const { dockH, tfH } = this.measureDock();
    const narrow = window.innerWidth <= CFG.railBreakpoint;
    const stacked = window.innerWidth <= 760 || window.innerHeight <= 640;
    const reserve = narrow ? dockH + (stacked ? tfH + 12 : 0) : 0;

    this.scale = Math.min(rect.width / CFG.W, Math.max(160, rect.height - reserve) / CFG.H);
    const drawnH = CFG.H * this.scale;
    this.ox = (rect.width - CFG.W * this.scale) / 2;
    this.oy = Math.max(0, (rect.height - reserve - drawnH) / 2);
    this.dpr = dpr;
    this.cssW = rect.width; this.cssH = rect.height;
  },

  toLogical(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left - this.ox) / this.scale,
      y: (clientY - r.top - this.oy) / this.scale
    };
  },

  render(t) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#050408';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const [sx, sy] = FX.shakeOffset();
    const k = this.dpr * this.scale;
    ctx.setTransform(k, 0, 0, k, this.dpr * (this.ox + sx * this.scale), this.dpr * (this.oy + sy * this.scale));

    // 地面
    ctx.drawImage(Art.arena, 0, 0, CFG.W, CFG.H);

    // 柱与火焰
    Art.drawPillars(ctx, t);

    // 首领与危险圈
    this.drawDangerZone(ctx, t);
    Art.drawTeron(ctx, t);

    // 玩家 AoE 参考圈
    if (this.phase === 'fight') this.drawAoeRing(ctx, t);

    // 构造体
    for (const c of this.constructs) {
      if (c.alpha <= 0.01 && !c.alive) continue;
      if (this.target === c && c.alive) this.drawTargetRing(ctx, c, t);
      Art.drawConstruct(ctx, c, t);
    }
    // 名牌单独一轮，且做防重叠错层 —— 四只挤成一堆时血条不会叠在一起
    const plates = [];
    for (const c of this.constructs) {
      if (!c.alive) continue;
      let py = c.y - 30;
      for (let guard = 0; guard < 6; guard++) {
        if (!plates.some(p => Math.abs(p.x - c.x) < 44 && Math.abs(p.y - py) < 15)) break;
        py -= 15;
      }
      plates.push({ x: c.x, y: py });
      this.drawNameplate(ctx, c, py);
    }

    // 玩家
    if (this.phase !== 'title') {
      if (this.player.isGhost) {
        this.drawGhostTrail(ctx);
        Art.drawPlayerGhost(ctx, this.player.x, this.player.y, t);
      } else {
        if (this.phase === 'debuff') this.drawEscapeHint(ctx, t);
        this.drawDebuffAura(ctx, t);
        Art.drawPlayerAlive(ctx, this.player.x, this.player.y, t, this.player.facing);
      }
    }

    FX.drawWorld(ctx);
    FX.drawText(ctx);
  },

  drawDangerZone(ctx, t) {
    if (this.phase !== 'fight') return;
    const B = CFG.arena.boss;
    const closest = this.aliveList().reduce((m, c) => Math.min(m, c.pathRemaining()), Infinity);
    const alarm = closest < 160 ? 1 : closest < 340 ? 0.45 : 0.18;
    const pulse = 0.5 + 0.5 * Math.sin(t * (closest < 160 ? 7 : 2.4));
    ctx.save();
    ctx.strokeStyle = `rgba(220,60,50,${alarm * (0.35 + pulse * 0.5)})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.lineDashOffset = -t * 22;
    ctx.beginPath();
    ctx.arc(B.x, B.y, CFG.arena.reachRadius + 12, 0, 7);
    ctx.stroke();
    ctx.restore();
  },

  drawAoeRing(ctx, t) {
    const R = 12 * CFG.YARD;
    const p = this.player;
    const ready = (this.cooldowns.chains || 0) <= this.clock || (this.cooldowns.volley || 0) <= this.clock;
    ctx.save();
    ctx.clip(Art.floorPath);           // 只在地面上显示，避免压到墙体
    const inCount = this.aliveList().filter(c => U.dist(p.x, p.y, c.x, c.y) <= R).length;
    if (ready && inCount >= 3) {
      const g = ctx.createRadialGradient(p.x, p.y, R * .6, p.x, p.y, R);
      g.addColorStop(0, 'rgba(57,230,184,0)');
      g.addColorStop(1, `rgba(57,230,184,${0.018 + inCount * 0.008})`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = ready ? 'rgba(120,230,190,.26)' : 'rgba(150,150,170,.11)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 9]);
    ctx.lineDashOffset = t * 14;
    ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, 7); ctx.stroke();
    ctx.restore();
  },

  /** 死亡之影阶段：指引玩家远离首领 */
  drawEscapeHint(ctx, t) {
    const p = this.player;
    const A = CFG.arena;
    // 目标点：先出门，再往大厅深处
    const goal = p.y < 300 ? A.doorway
      : p.y < 700 ? { x: 360, y: 840 }
        : null;
    if (!goal) return;
    const dx = goal.x - p.x, dy = goal.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 40) return;
    const ux = dx / d, uy = dy / d;
    const a = Math.atan2(uy, ux);

    ctx.save();
    ctx.clip(Art.floorPath);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 4; i++) {
      const k = ((t * 0.75 + i * 0.25) % 1);
      const dist = 34 + k * Math.min(d - 20, 150);
      const x = p.x + ux * dist, y = p.y + uy * dist;
      const alpha = Math.sin(k * Math.PI) * 0.55;
      ctx.strokeStyle = `rgba(139,240,74,${alpha})`;
      ctx.lineWidth = 3;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(-7, -7); ctx.lineTo(4, 0); ctx.lineTo(-7, 7);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },

  drawTargetRing(ctx, c, t) {
    ctx.save();
    ctx.strokeStyle = 'rgba(230,190,90,.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    ctx.lineDashOffset = -t * 26;
    ctx.beginPath(); ctx.ellipse(c.x, c.y + 6, 20, 9, 0, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(230,190,90,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(c.x, c.y + 6, 24, 11, 0, 0, 7); ctx.stroke();
    ctx.restore();
  },

  drawNameplate(ctx, c, plateY) {
    const w = 36, h = 4.4, x = c.x - w / 2, y = plateY;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.fillRect(x - 1.2, y - 1.2, w + 2.4, h + 2.4);
    const pct = c.hpPct;
    ctx.fillStyle = pct > .5 ? '#3ec24c' : pct > .2 ? '#e0b33a' : '#d5473a';
    ctx.fillRect(x, y, w * pct, h);
    // 编号
    ctx.font = '700 13px "Bahnschrift",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.85)';
    ctx.strokeText(String(c.index + 1), c.x, y - 6);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.fillText(String(c.index + 1), c.x, y - 6);
    // 减速层数
    if (c.slowStacks) {
      ctx.fillStyle = 'rgba(111,227,245,.95)';
      for (let i = 0; i < c.slowStacks; i++) {
        ctx.fillRect(x + w + 2.5 + i * 5, y, 3.2, h);
      }
    }
    ctx.restore();
  },

  drawGhostTrail(ctx) {
    const tr = this.player.trail;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < tr.length - 2; i += 2) {
      const a = (i / tr.length) * .22;
      ctx.fillStyle = `rgba(140,225,255,${a})`;
      ctx.beginPath(); ctx.arc(tr[i], tr[i + 1], 5 * (i / tr.length) + 1.5, 0, 7); ctx.fill();
    }
    ctx.restore();
  },

  drawDebuffAura(ctx, t) {
    const p = this.player;
    const k = 1 - U.clamp(this.debuffLeft / this.difficulty.debuff, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 22 + k * 12);
    g.addColorStop(0, `rgba(180,110,255,${.25 + k * .35})`);
    g.addColorStop(1, 'rgba(120,40,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, 22 + k * 12, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = `rgba(200,140,255,${.35 + k * .45})`;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([3, 6]);
    ctx.lineDashOffset = -t * 18;
    ctx.beginPath(); ctx.arc(p.x, p.y, 18 + Math.sin(t * 4) * 2, 0, 7); ctx.stroke();
    ctx.restore();
  },

  /* ── 输入 ─────────────────────────── */

  bindInput() {
    const keyMap = () => this.azerty
      ? { up: 'KeyZ', left: 'KeyQ', down: 'KeyS', right: 'KeyD' }
      : { up: 'KeyW', left: 'KeyA', down: 'KeyS', right: 'KeyD' };

    window.addEventListener('keydown', (e) => {
      const m = keyMap();
      const code = e.code;

      if (code === 'Tab') {
        e.preventDefault();
        if (this.phase === 'fight') this.cycleTarget(e.shiftKey ? -1 : 1);
        return;
      }
      if (code === 'Escape') {
        e.preventDefault();
        // 法术书内容较长需要滚动，返回按钮可能在屏幕外 —— Esc 一定要能退出
        if (!UI.d.spellbookScreen.hidden) UI.show('titleScreen');
        else if (this.phase === 'paused') this.resume();
        else if (this.phase === 'fight' || this.phase === 'debuff') this.pause();
        else if (this.phase === 'over') this.toTitle();
        return;
      }
      if (e.repeat) return;

      if (code === 'KeyR' && (this.phase === 'over' || this.phase === 'paused' || this.phase === 'fight' || this.phase === 'debuff')) {
        this.start(); return;
      }
      if (code === 'Enter' || code === 'Space') {
        if (this.phase === 'title') { e.preventDefault(); this.start(); return; }
        if (this.phase === 'over') { e.preventDefault(); this.start(); return; }
      }

      if (code === m.up || code === 'ArrowUp') this.input.up = 1;
      else if (code === m.down || code === 'ArrowDown') this.input.down = 1;
      else if (code === m.left || code === 'ArrowLeft') this.input.left = 1;
      else if (code === m.right || code === 'ArrowRight') this.input.right = 1;

      if (this.phase !== 'fight') return;

      // 技能
      const ab = CFG.abilities.find(a => a.code === code);
      if (ab) { e.preventDefault(); this.cast(ab.id); return; }

      // 最紧急目标
      if (code === 'Backquote' || (!this.azerty && code === 'KeyQ')) {
        this.setTarget(this.mostUrgent()); return;
      }
      // F1–F4
      const fn = ['F1', 'F2', 'F3', 'F4'].indexOf(code);
      if (fn >= 0) {
        e.preventDefault();
        const c = this.constructs[fn];
        if (c && c.alive) this.setTarget(c);
      }
    });

    window.addEventListener('keyup', (e) => {
      const m = keyMap();
      const code = e.code;
      if (code === m.up || code === 'ArrowUp') this.input.up = 0;
      else if (code === m.down || code === 'ArrowDown') this.input.down = 0;
      else if (code === m.left || code === 'ArrowLeft') this.input.left = 0;
      else if (code === m.right || code === 'ArrowRight') this.input.right = 0;
    });

    window.addEventListener('blur', () => {
      this.input.left = this.input.right = this.input.up = this.input.down = 0;
    });

    // 指针
    const cv = this.canvas;
    const isDesktop = !('ontouchstart' in window) && !navigator.maxTouchPoints;

    cv.addEventListener('pointerdown', (e) => {
      Sfx.unlock();
      if (this.phase !== 'fight' && this.phase !== 'debuff') return;
      cv.setPointerCapture(e.pointerId);
      const p = this.toLogical(e.clientX, e.clientY);

      // 先判断是否点中构造体
      if (this.phase === 'fight') {
        let best = null, bd = 26;
        for (const c of this.aliveList()) {
          const d = U.dist(p.x, p.y, c.x, c.y);
          if (d < bd) { bd = d; best = c; }
        }
        if (best) { this.setTarget(best); return; }
      }

      this.player.setMoveTarget(p, isDesktop);
      this._dragging = isDesktop;
    });

    cv.addEventListener('pointermove', (e) => {
      if (!this._dragging) return;
      const p = this.toLogical(e.clientX, e.clientY);
      this.player.setMoveTarget(p, true);
    });

    const stop = () => { this._dragging = false; if (this.player && this.player.followPointer) this.player.setMoveTarget(null); };
    cv.addEventListener('pointerup', stop);
    cv.addEventListener('pointercancel', stop);

    cv.addEventListener('contextmenu', e => e.preventDefault());
  }
};
