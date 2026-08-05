/* ═══════════════════════════════════════════════════════════
   界面 —— DOM 抬头显示、技能条、覆盖层
   ═══════════════════════════════════════════════════════════ */
'use strict';

const UI = {

  game: null,
  slots: {},          // abilityId → { el, sweepCtx, cdText, lastFrac }
  rows: [],           // 构造体列表行
  logCount: 0,
  tipIndex: 0,
  tipTimer: 0,
  calloutTimer: null,

  init(game) {
    this.game = game;
    this.d = {
      statTime: U.$('#statTime'), statBest: U.$('#statBest'), statAlive: U.$('#statAlive'),
      debuffBanner: U.$('#debuffBanner'), debuffTimer: U.$('#debuffTimer'),
      debuffIcon: U.$('#debuffIcon'), debuffHint: U.$('.debuff-hint'),
      targetFrame: U.$('#targetFrame'), tfName: U.$('#tfName'), tfPct: U.$('#tfPct'),
      tfHpFill: U.$('#tfHpFill'), tfEta: U.$('#tfEta'), tfRange: U.$('#tfRange'), tfAuras: U.$('#tfAuras'),
      actionBar: U.$('#actionBar'), constructList: U.$('#constructList'), combatLog: U.$('#combatLog'),
      callout: U.$('#callout'), castFlash: U.$('#castFlash'),
      bossHpFill: U.$('.boss-hp-fill'),
      metaCasts: U.$('#metaCasts'), metaWasted: U.$('#metaWasted'), metaDamage: U.$('#metaDamage'),
      tipText: U.$('#tipText'),
      titleScreen: U.$('#titleScreen'), spellbookScreen: U.$('#spellbookScreen'),
      resultScreen: U.$('#resultScreen'), pauseScreen: U.$('#pauseScreen'),
      difficultySeg: U.$('#difficultySeg'), difficultyDesc: U.$('#difficultyDesc'),
      fontSeg: U.$('#fontSeg')
    };

    this.buildActionBar();
    this.buildConstructRows();
    this.buildConstructStrip();
    this.buildKeyHelp();
    this.buildSpellbook();
    this.buildDifficulty();
    this.buildFontScale();
    this.nextTip();
    this.d.debuffIcon.style.backgroundImage = `url(${Art.icons.shadowOfDeath.toDataURL()})`;
    this.d.debuffIcon.style.backgroundSize = 'cover';
  },

  /* ═══════════ 构建 ═══════════ */

  buildActionBar() {
    const bar = this.d.actionBar;
    bar.innerHTML = '';
    for (const ab of CFG.abilities) {
      const slot = U.el('div', 'slot');
      slot.dataset.id = ab.id;
      slot.title = `${ab.name}（${ab.key}）`;

      const icon = Art.icons[ab.id].cloneNode();
      icon.getContext('2d').drawImage(Art.icons[ab.id], 0, 0);
      slot.appendChild(icon);

      const sweepWrap = U.el('div', 'sweep');
      const sc = document.createElement('canvas');
      sc.width = sc.height = 64;
      sweepWrap.appendChild(sc);
      slot.appendChild(sweepWrap);

      slot.appendChild(U.el('span', 'kbd', ab.key));
      const cd = U.el('span', 'cd-text', '');
      cd.style.display = 'none';
      slot.appendChild(cd);

      const fire = (ev) => { ev.preventDefault(); this.game.cast(ab.id); };
      slot.addEventListener('pointerdown', fire);

      bar.appendChild(slot);
      this.slots[ab.id] = { el: slot, sweep: sc.getContext('2d'), cdText: cd, lastFrac: -1 };
    }
  },

  buildConstructRows() {
    const list = this.d.constructList;
    if (!list) return;
    list.innerHTML = '';
    this.rows = [];
    for (let i = 0; i < 4; i++) {
      const li = U.el('li', 'cst');
      li.innerHTML =
        '<div class="cst-top"><span class="cst-name"></span><span class="cst-hpn"></span></div>' +
        '<div class="bar"><i></i></div>' +
        '<div class="cst-approach"><span>推进</span><div class="bar"><i></i></div><span class="cst-eta"></span></div>' +
        '<div class="cst-auras"></div>';
      li.addEventListener('click', () => {
        const c = this.game.constructs[i];
        if (c && c.alive) this.game.setTarget(c);
      });
      list.appendChild(li);
      this.rows.push({
        el: li,
        name: U.$('.cst-name', li), hpn: U.$('.cst-hpn', li),
        hp: U.$('.bar > i', li),
        prog: U.$('.cst-approach .bar > i', li),
        eta: U.$('.cst-eta', li),
        auras: U.$('.cst-auras', li)
      });
    }
  },

  /** 窄屏时代替左侧栏的横向构造体条 */
  buildConstructStrip() {
    const box = U.$('#constructStrip');
    if (!box) return;
    box.innerHTML = '';
    this.strip = [];
    for (let i = 0; i < 4; i++) {
      const li = U.el('li', 'csx');
      li.innerHTML =
        '<div class="csx-top"><span class="csx-n"></span><span class="csx-eta"></span></div>' +
        '<div class="bar"><i></i></div><div class="csx-stacks"></div>';
      li.addEventListener('click', () => {
        const c = this.game.constructs[i];
        if (c && c.alive) this.game.setTarget(c);
      });
      box.appendChild(li);
      this.strip.push({
        el: li, n: U.$('.csx-n', li), eta: U.$('.csx-eta', li),
        hp: U.$('.bar > i', li), stacks: U.$('.csx-stacks', li)
      });
    }
  },

  updateConstructStrip(g) {
    if (!this.strip) return;
    for (let i = 0; i < 4; i++) {
      const s = this.strip[i];
      const c = g.constructs[i];
      s.n.textContent = i + 1;
      if (!c || !c.alive) {
        s.el.classList.toggle('is-dead', !!c);
        s.el.classList.remove('is-target');
        s.hp.style.transform = 'scaleX(0)';
        s.eta.textContent = c ? '✕' : '—';
        if (s._k !== 'dead') { s.stacks.innerHTML = ''; s._k = 'dead'; }
        continue;
      }
      s.el.classList.remove('is-dead');
      s.el.classList.toggle('is-target', g.target === c);
      const pct = c.hpPct;
      s.hp.style.transform = `scaleX(${pct})`;
      s.hp.style.background = pct > .5 ? '#3ec24c' : pct > .2 ? '#e0b33a' : '#d5473a';
      const eta = c.eta();
      s.eta.textContent = eta === Infinity ? '∞' : eta > 99 ? '99+' : Math.round(eta) + 's';
      s.eta.classList.toggle('urgent', eta < 8);

      const key = `${c.slowStacks}|${c.frozen ? 1 : 0}`;
      if (s._k !== key) {
        s._k = key;
        s.stacks.innerHTML = '';
        if (c.frozen) s.stacks.appendChild(U.el('i', 'root'));
        for (let k = 0; k < c.slowStacks; k++) s.stacks.appendChild(U.el('i'));
      }
    }
  },

  buildKeyHelp() {
    const dl = U.$('#keyHelp');
    if (!dl) return;
    const items = [
      ['移动', 'WASD / 方向键'],
      ['切换目标', 'Tab / Shift+Tab'],
      ['最紧急', '` 或 Q'],
      ['指定目标', 'F1 – F4'],
      ['技能', '1 3 4 5 7'],
      ['暂停', 'Esc'],
      ['重来', 'R']
    ];
    dl.innerHTML = '';
    for (const [k, v] of items) {
      dl.appendChild(U.el('dt', null, k));
      dl.appendChild(U.el('dd', null, v));
    }
  },

  buildSpellbook() {
    const ul = U.$('#bookList');
    ul.innerHTML = '';
    for (const ab of CFG.abilities) {
      const li = U.el('li', 'book-row');
      const iconWrap = U.el('div', 'book-icon');
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      c.getContext('2d').drawImage(Art.icons[ab.id], 0, 0, 128, 128);
      iconWrap.appendChild(c);
      iconWrap.appendChild(U.el('span', 'kbd', ab.key));
      li.appendChild(iconWrap);

      const body = U.el('div');
      const nm = U.el('div', 'book-name');
      nm.textContent = ab.name;
      nm.appendChild(U.el('small', null, ab.en));
      body.appendChild(nm);
      body.appendChild(U.el('div', 'book-stats', ab.stats + (ab.minDmg ? ` · ${U.num(ab.minDmg)}–${U.num(ab.maxDmg)} 伤害` : '')));
      body.appendChild(U.el('div', 'book-desc', ab.desc));
      li.appendChild(body);
      ul.appendChild(li);
    }
  },

  buildDifficulty() {
    const seg = this.d.difficultySeg;
    seg.innerHTML = '';
    CFG.difficulties.forEach((d, i) => {
      const b = U.el('button', null, d.name);
      b.type = 'button';
      b.addEventListener('click', () => this.game.setDifficulty(i));
      seg.appendChild(b);
    });
  },

  syncDifficulty(index) {
    U.$$('button', this.d.difficultySeg).forEach((b, i) => b.classList.toggle('on', i === index));
    this.d.difficultyDesc.textContent = CFG.difficulties[index].desc;
  },

  buildFontScale() {
    const seg = this.d.fontSeg;
    if (!seg) return;
    seg.innerHTML = '';
    CFG.uiScales.forEach((s, i) => {
      const b = U.el('button', null, s.name);
      b.type = 'button';
      b.addEventListener('click', () => this.game.setUiScale(i));
      seg.appendChild(b);
    });
  },

  syncFontScale(index) {
    if (!this.d.fontSeg) return;
    U.$$('button', this.d.fontSeg).forEach((b, i) => b.classList.toggle('on', i === index));
  },

  /* ═══════════ 每帧更新 ═══════════ */

  update(dt) {
    const g = this.game;

    // 计时 / 统计
    this.d.statTime.textContent = g.phase === 'fight' || g.phase === 'over'
      ? U.secs(g.fightTime, 1) : '0.0';
    const alive = g.constructs.filter(c => c.alive).length;
    this.d.statAlive.textContent = g.constructs.length ? alive : '4';
    this.d.statAlive.classList.toggle('danger', alive > 0 && g.constructs.some(c => c.alive && c.eta() < 6));

    if (this.d.metaCasts) {
      this.d.metaCasts.textContent = g.stats.casts;
      this.d.metaWasted.textContent = Math.floor(g.stats.idle / CFG.gcd);
      this.d.metaDamage.textContent = U.num(g.stats.damage);
    }

    // 死亡之影
    if (g.phase === 'debuff') {
      this.d.debuffBanner.hidden = false;
      const s = Math.ceil(g.debuffLeft);
      this.d.debuffTimer.textContent = s;
      this.d.debuffTimer.classList.toggle('hot', s <= 3);
      const yd = Nav.pathLength(g.player.x, g.player.y) / CFG.YARD;
      const grade = yd > 42 ? '很好' : yd > 28 ? '还行' : '太近了！';
      this.d.debuffHint.innerHTML =
        `距首领 <b>${yd.toFixed(0)}</b> 码 · <b>${grade}</b> —— 跑得越远，之后的输出时间越多`;
    } else {
      this.d.debuffBanner.hidden = true;
    }

    // 技能条
    if (g.phase === 'fight') {
      this.updateActionBar(g);
    }

    // 目标框
    this.updateTargetFrame(g);

    // 构造体列表
    this.updateConstructRows(g);
    this.updateConstructStrip(g);

    // 首领血条
    if (this.d.bossHpFill) {
      const w = 4 + (1 - (g.constructs.length ? g.constructs.filter(c => !c.alive).length / g.constructs.length : 0)) * 8;
      this.d.bossHpFill.style.width = w.toFixed(1) + '%';
    }

    // 提示轮播
    this.tipTimer += dt;
    if (this.tipTimer > 10) { this.tipTimer = 0; this.nextTip(); }
  },

  updateActionBar(g) {
    const now = g.now;
    const gcdLeft = Math.max(0, g.gcdUntil - now);
    for (const ab of CFG.abilities) {
      const s = this.slots[ab.id];
      const cdLeft = Math.max(0, (g.cooldowns[ab.id] || 0) - now);
      const showCd = cdLeft > gcdLeft + 0.05;
      const frac = showCd ? cdLeft / ab.cd : (ab.cd ? 0 : 0);

      if (Math.abs(frac - s.lastFrac) > 0.004) {
        this.drawSweep(s.sweep, frac);
        s.lastFrac = frac;
      }
      if (showCd) {
        s.cdText.style.display = '';
        s.cdText.textContent = cdLeft >= 1 ? Math.ceil(cdLeft) : cdLeft.toFixed(1);
      } else {
        s.cdText.style.display = 'none';
      }

      const usable = g.usability(ab);
      s.el.classList.toggle('dim', usable !== 'ok' && usable !== 'oor');
      s.el.classList.toggle('oor', usable === 'oor');
      s.el.classList.toggle('ready-glow', usable === 'ok' && ab.cd > 0 && cdLeft <= 0);
    }
  },

  drawSweep(ctx, frac) {
    const S = 64;
    ctx.clearRect(0, 0, S, S);
    if (frac <= 0.001) return;
    ctx.fillStyle = 'rgba(0,0,0,.66)';
    ctx.beginPath();
    ctx.moveTo(S / 2, S / 2);
    ctx.arc(S / 2, S / 2, S, -Math.PI / 2 + (1 - frac) * Math.PI * 2, Math.PI * 1.5);
    ctx.closePath();
    ctx.fill();
  },

  updateTargetFrame(g) {
    const t = g.target;
    if (!t || !t.alive) { this.d.targetFrame.hidden = true; this._auraKey = null; return; }
    this.d.targetFrame.hidden = false;

    const pct = t.hpPct;
    this.d.tfName.textContent = t.name;
    this.d.tfPct.textContent = Math.ceil(pct * 100) + '%';
    this.d.tfHpFill.style.transform = `scaleX(${pct})`;
    this.d.tfHpFill.style.background = pct > .5
      ? 'linear-gradient(180deg,#3ec24c,#1d7a2a)'
      : pct > .2 ? 'linear-gradient(180deg,#e0b33a,#96701a)'
        : 'linear-gradient(180deg,#d5473a,#8a1f16)';

    const eta = t.eta();
    this.d.tfEta.textContent = eta === Infinity
      ? '已被定身'
      : `距首领 ${(t.pathRemaining() / CFG.YARD).toFixed(0)} 码 · ${eta.toFixed(0)} 秒`;

    const dist = U.dist(g.player.x, g.player.y, t.x, t.y) / CFG.YARD;
    this.d.tfRange.textContent = `距离 ${dist.toFixed(0)} 码`;
    this.d.tfRange.classList.toggle('oor', dist > 30);

    // 光环
    const key = `${t.index}|${t.slowStacks}|${Math.ceil(t.slowRemaining(g.now))}|${Math.ceil(t.rootRemaining(g.now))}`;
    if (key !== this._auraKey) {
      this._auraKey = key;
      const box = this.d.tfAuras;
      box.innerHTML = '';
      if (t.slowStacks > 0) box.appendChild(this.auraChip('lance', t.slowStacks, t.slowRemaining(g.now)));
      if (t.frozen) box.appendChild(this.auraChip('chains', 0, t.rootRemaining(g.now)));
    }
  },

  auraChip(iconId, stacks, remain) {
    const d = U.el('div', 'tf-aura');
    const c = document.createElement('canvas');
    c.width = c.height = 44;
    c.getContext('2d').drawImage(Art.icons[iconId], 0, 0, 44, 44);
    d.appendChild(c);
    if (stacks > 1) d.appendChild(U.el('span', 'stk', stacks));
    d.appendChild(U.el('span', 'dur', Math.ceil(remain)));
    return d;
  },

  updateConstructRows(g) {
    if (!this.rows.length) return;
    for (let i = 0; i < 4; i++) {
      const r = this.rows[i];
      const c = g.constructs[i];
      if (!c) {
        r.name.textContent = CFG.constructNames[i];
        r.hpn.textContent = '待命';
        r.hp.style.transform = 'scaleX(1)';
        r.prog.style.transform = 'scaleX(0)';
        r.eta.textContent = '—';
        r.el.classList.remove('is-dead', 'is-target');
        r.auras.innerHTML = '';
        continue;
      }
      r.name.textContent = c.name;
      r.el.classList.toggle('is-dead', !c.alive);
      r.el.classList.toggle('is-target', g.target === c);

      if (!c.alive) {
        r.hpn.textContent = '已消灭';
        r.hp.style.transform = 'scaleX(0)';
        r.prog.style.transform = 'scaleX(0)';
        r.eta.textContent = '—';
        r.auras.innerHTML = '';
        continue;
      }

      const pct = c.hpPct;
      r.hpn.textContent = Math.ceil(pct * 100) + '%';
      r.hp.style.transform = `scaleX(${pct})`;
      r.hp.style.background = pct > .5 ? 'linear-gradient(90deg,#3ec24c,#1d7a2a)'
        : pct > .2 ? 'linear-gradient(90deg,#e0b33a,#96701a)'
          : 'linear-gradient(90deg,#d5473a,#8a1f16)';
      r.prog.style.transform = `scaleX(${c.progress()})`;

      const eta = c.eta();
      r.eta.textContent = eta === Infinity ? '∞' : eta > 99 ? '99+' : eta.toFixed(0) + 's';
      r.eta.classList.toggle('urgent', eta < 8);

      const key = `${c.slowStacks}|${c.frozen ? 1 : 0}`;
      if (r._k !== key) {
        r._k = key;
        r.auras.innerHTML = '';
        if (c.slowStacks) r.auras.appendChild(U.el('span', 'aura-pip aura-slow', `减速 ×${c.slowStacks}`));
        if (c.frozen) r.auras.appendChild(U.el('span', 'aura-pip aura-root', '定身'));
      }
    }
  },

  /* ═══════════ 反馈 ═══════════ */

  log(html, cls) {
    const box = this.d.combatLog;
    if (!box) return;
    const li = U.el('li');
    const t = this.game.phase === 'fight' || this.game.phase === 'over'
      ? U.secs(this.game.fightTime, 1) : '0.0';
    li.innerHTML = `<span class="t">${t}</span><span class="${cls || ''}">${html}</span>`;
    box.appendChild(li);
    if (box.children.length > 26) box.removeChild(box.firstChild);
  },

  clearLog() { if (this.d.combatLog) this.d.combatLog.innerHTML = ''; },

  /** 用 class 而不是 hidden —— 隐藏时保留占位，底部留白高度才稳定 */
  setActionBar(visible) {
    this.d.actionBar.classList.toggle('off', !visible);
  },

  callout(text) {
    const el = this.d.callout;
    el.hidden = false;
    el.textContent = text;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(this.calloutTimer);
    this.calloutTimer = setTimeout(() => { el.hidden = true; }, 2200);
  },

  castFlash(name) {
    const el = this.d.castFlash;
    el.hidden = false;
    el.textContent = name;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(this._castTimer);
    this._castTimer = setTimeout(() => { el.hidden = true; }, 700);
  },

  flashSlot(id) {
    const s = this.slots[id];
    if (!s) return;
    s.el.classList.remove('flash');
    void s.el.offsetWidth;
    s.el.classList.add('flash');
    setTimeout(() => s.el.classList.remove('flash'), 320);
  },

  nextTip() {
    if (!this.d.tipText) return;
    this.d.tipText.innerHTML = CFG.tips[this.tipIndex % CFG.tips.length];
    this.tipIndex++;
  },

  /* ═══════════ 覆盖层 ═══════════ */

  OVERLAYS: ['titleScreen', 'spellbookScreen', 'resultScreen', 'pauseScreen'],

  show(which) {
    for (const k of this.OVERLAYS) this.d[k].hidden = (k !== which);
    this.syncOverlaid();
  },

  hideAll() {
    for (const k of this.OVERLAYS) this.d[k].hidden = true;
    this.syncOverlaid();
  },

  /** 有浮层时给 #viewport 打标记，CSS 据此收掉底层 HUD */
  syncOverlaid() {
    const any = this.OVERLAYS.some(k => !this.d[k].hidden);
    const vp = U.$('#viewport');
    if (vp) vp.classList.toggle('overlaid', any);
  },

  showResult(won, g) {
    const screen = this.d.resultScreen;
    screen.classList.toggle('lost', !won);

    U.$('#resultKicker').textContent = won ? '灵魂阶段 · 完成' : '灵魂阶段 · 失败';
    U.$('#resultTitle').textContent = won ? '四只构造体全部消灭' : '构造体冲进了团队';
    U.$('#resultFlavor').textContent = U.pick(won ? CFG.winFlavor : CFG.loseFlavor);

    const gradeBox = U.$('#resultGrade');
    if (won && !g.practice) {
      const grade = CFG.gradeFor(g.fightTime, g.difficulty);
      gradeBox.hidden = false;
      U.$('.grade-letter', gradeBox).textContent = grade.letter;
      U.$('.grade-word', gradeBox).textContent = grade.word;
    } else {
      gradeBox.hidden = true;
    }

    const timeBox = U.$('#resultTime');
    if (won) {
      const isPB = g.newBest;
      timeBox.innerHTML = `用时 <b>${U.secs(g.fightTime)}</b> 秒` +
        (g.practice ? '<span class="pb" style="color:var(--ink-faint)">训练模式 · 不计入记录</span>'
          : isPB ? '<span class="pb">新纪录！</span>'
            : (g.best ? `<span class="pb" style="color:var(--ink-faint)">最佳 ${U.secs(g.best)} 秒</span>` : ''));
    } else {
      const breaker = g.breaker ? g.breaker.name : '构造体';
      timeBox.innerHTML = `坚持了 <b>${U.secs(g.fightTime)}</b> 秒　·　${breaker} 抵达了首领`;
    }

    // 记分板
    const tb = U.$('#scoreboard');
    tb.innerHTML = '';
    const row = (a, b, cls) => {
      const tr = U.el('tr', cls);
      tr.appendChild(U.el('td', null, a));
      tr.appendChild(U.el('td', null, b));
      tb.appendChild(tr);
    };
    row('项目', '数值', 'head');
    g.constructs.forEach(c => {
      row(c.name, c.killedAt != null
        ? `${U.secs(c.killedAt)} 秒击杀`
        : `剩余 ${Math.ceil(c.hpPct * 100)}%`);
    });
    const dps = g.fightTime > 0 ? g.stats.damage / g.fightTime : 0;
    row('总伤害', U.num(g.stats.damage));
    row('每秒伤害', U.num(dps));
    row('施法次数', `${g.stats.casts} 次`);
    row('空转 GCD', `${Math.floor(g.stats.idle / CFG.gcd)} 次（浪费 ${U.secs(g.stats.idle, 1)} 秒）`);
    row('灵魂之枪 / 乱射', `${g.stats.byId.lance || 0} / ${g.stats.byId.volley || 0}`);
    if (g.practice) row('漏过首领', `${g.stats.leaks} 次`);
    row('难度', g.difficulty.name + (g.practice ? ' · 训练模式' : ''));

    this.show('resultScreen');
  },

  setBest(best) {
    this.d.statBest.textContent = best ? U.secs(best, 1) : '—';
  }
};
