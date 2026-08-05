/* ═══════════════════════════════════════════════════════════
   实时提示 + 教学流程
   —— 回答新手唯一真正的问题：「现在我该按什么？」
   ═══════════════════════════════════════════════════════════ */
'use strict';

const Coach = {

  enabled: true,

  /* ── 教学步骤 ─────────────────────────
     done(g) 返回 true 时进入下一步。步骤只前进不后退。 */
  STEPS: [
    {
      id: 'run', tkey: 'tut.run',
      phase: 'debuff',
      done: g => Nav.pathLength(g.player.x, g.player.y) / CFG.YARD > 38
    },
    {
      id: 'opener', tkey: 'tut.opener',
      phase: 'fight', slot: 'volley',
      skipAfter: 10,                      // 开场窗口过了就别再卡着
      done: g => (g.stats.byId.volley || 0) > 0
    },
    {
      id: 'chains', tkey: 'tut.chains',
      phase: 'fight', slot: 'chains',
      skipAfter: 14,
      done: g => (g.stats.byId.chains || 0) > 0
    },
    {
      id: 'lance1', tkey: 'tut.lance1',
      phase: 'fight', slot: 'lance',
      done: g => g.constructs.length > 0 && g.constructs.every(c => !c.alive || c.slowStacks >= 1)
    },
    {
      id: 'lance3', tkey: 'tut.lance3',
      phase: 'fight', slot: 'lance',
      done: g => g.constructs.length > 0 && g.constructs.every(c => !c.alive || c.slowStacks >= 3)
    },
    {
      id: 'sustain', tkey: 'tut.sustain',
      phase: 'fight', slot: 'lance',
      done: g => g.constructs.length > 0 && g.aliveList().length === 0
    }
  ],

  step: 0,
  stepFlash: 0,     // 完成某步时的短暂高亮

  reset() {
    this.step = 0;
    this.stepFlash = 0;
  },

  isTutorial(g) { return !!(g.difficulty && g.difficulty.tutorial); },

  update(g, dt) {
    if (this.stepFlash > 0) this.stepFlash = Math.max(0, this.stepFlash - dt);
    if (!this.isTutorial(g)) return;
    const s = this.STEPS[this.step];
    if (!s) return;
    // 步骤 1 只在死亡之影阶段判定；其余在战斗中判定
    if (s.phase === 'debuff' && g.phase !== 'debuff') return;
    if (s.phase === 'fight' && g.phase !== 'fight') return;
    // 开场类步骤有时间窗；窗口过了就静默跳过，教学永远不会卡住
    if (s.skipAfter != null && g.fightTime > s.skipAfter) {
      this.step++;
      return;
    }
    if (s.done(g)) {
      this.step++;
      this.stepFlash = 1.1;
      Sfx.play('target');
    }
  },

  /** 教学卡片内容；非教学模式返回 null */
  card(g) {
    if (!this.isTutorial(g)) return null;
    if (g.phase !== 'debuff' && g.phase !== 'fight') return null;
    const s = this.STEPS[this.step];
    if (!s) {
      return { done: true, index: this.STEPS.length, total: this.STEPS.length,
               title: T('tut.done'), text: T('tut.finished'), slot: null };
    }
    // 第一步做完但人还没倒下 —— 别提前讲下一步（那时构造体根本还没出现）
    if (s.phase === 'fight' && g.phase === 'debuff') {
      return {
        done: false, waiting: true,
        index: this.step, total: this.STEPS.length,
        title: T('tut.ready.t'), text: T('tut.ready.d'), slot: null
      };
    }
    return {
      done: false,
      index: this.step + 1, total: this.STEPS.length,
      title: T(s.tkey + '.t'), text: T(s.tkey + '.d'),
      slot: s.slot || null,
      flash: this.stepFlash > 0
    };
  },

  /* ── 实时建议 ─────────────────────────
     按紧急程度排序，返回第一条命中的。
     返回 {html, slot} —— slot 用来给对应技能格加脉冲高亮。 */
  advice(g) {
    if (g.phase !== 'fight') return null;
    const alive = g.aliveList();
    if (!alive.length) return null;

    const P = g.player;
    const YD = CFG.YARD;
    const lanceR = 30 * YD;
    const aoeR = 12 * YD;
    const inAoe = alive.filter(c => U.dist(P.x, P.y, c.x, c.y) <= aoeR);
    const inLance = alive.filter(c => U.dist(P.x, P.y, c.x, c.y) <= lanceR);
    const short = c => T('construct.short', c.index + 1);

    // 1) 有人快到首领了，且锁链能用 → 先钉住
    const critical = alive.filter(c => c.eta() < 6 && !c.frozen);
    if (critical.length && (g.cooldowns.chains || 0) <= g.clock &&
        critical.some(c => U.dist(P.x, P.y, c.x, c.y) <= aoeR)) {
      return { html: T('coach.chains', short(critical[0])), slot: 'chains' };
    }

    const volleyReady = (g.cooldowns.volley || 0) <= g.clock;
    const chainsReady = (g.cooldowns.chains || 0) <= g.clock;
    const need = Math.min(3, alive.length);

    // 2) 乱射能打到三个以上就先放 —— 11k×3 远大于一枪的 6.5k，
    //    而且开场四只全叠在你身上，那是全场最好的一次乱射。
    if (volleyReady && inAoe.length >= need) {
      return { html: T('coach.volley', inAoe.length), slot: 'volley' };
    }

    // 3) 开场锁链是「保险」不是输出：实测多花的这一个公共冷却
    //    正好让通关时间慢 1 秒。所以只在死亡位置太靠前、真的可能被翻盘时才推荐。
    //    满速下 5 秒定身能拦 17 码，三层减速后同样 5 秒只值 1.7 码 —— 要用就趁早。
    const risky = alive.some(c => c.startPath / CFG.YARD < 36);
    if (risky && chainsReady && inAoe.length >= need &&
        alive.filter(c => c.slowStacks === 0).length >= need) {
      return { html: T('coach.chainsOpen'), slot: 'chains' };
    }

    // 4) 完全没上减速的，最优先补
    const naked = inLance.filter(c => c.slowStacks === 0);
    if (naked.length) {
      naked.sort((a, b) => a.pathRemaining() - b.pathRemaining());
      return { html: T('coach.lanceNew', short(naked[0])), slot: 'lance' };
    }

    // 5) 减速快掉了（<2.5 秒）
    const expiring = inLance.filter(c => c.slowStacks > 0 && c.slowRemaining(g.clock) < 2.5);
    if (expiring.length) {
      expiring.sort((a, b) => a.slowRemaining(g.clock) - b.slowRemaining(g.clock));
      const c = expiring[0];
      return { html: T('coach.lanceRefresh', short(c), Math.max(0, c.slowRemaining(g.clock)).toFixed(1)), slot: 'lance' };
    }

    // 6) 还没叠满 3 层
    const under = inLance.filter(c => c.slowStacks < 3);
    if (under.length) {
      under.sort((a, b) => a.slowStacks - b.slowStacks || a.pathRemaining() - b.pathRemaining());
      const c = under[0];
      return { html: T('coach.lanceStack', short(c), c.slowStacks), slot: 'lance' };
    }

    // 8) 乱射好了但只能打到一两个 → 先靠拢
    if (volleyReady) return { html: T('coach.volleyWait', inAoe.length), slot: null };

    // 9) 够不着任何目标
    if (!inLance.length) return { html: T('coach.getCloser'), slot: null };

    // 10) 兜底：继续打最紧急的
    const t = alive.slice().sort((a, b) => a.pathRemaining() - b.pathRemaining())[0];
    return { html: T('coach.keepGoing', short(t)), slot: 'lance' };
  }
};
