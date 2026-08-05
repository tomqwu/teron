/* ═══════════════════════════════════════════════════════════
   多语言 —— 中文 / English
   静态文案挂 data-i18n，动态文案走 I18N.t(key, ...args)
   ═══════════════════════════════════════════════════════════ */
'use strict';

const I18N = {

  lang: 'zh',

  langs: [
    { id: 'zh', name: '中文' },
    { id: 'en', name: 'English' }
  ],

  /** 取一个 {zh, en} 结构里当前语言的值；普通字符串原样返回 */
  pick(v) {
    if (v && typeof v === 'object' && !Array.isArray(v)) return v[this.lang] != null ? v[this.lang] : v.zh;
    return v;
  },

  /** 取另一种语言的值（法术书里做副标题用） */
  other(v) {
    if (v && typeof v === 'object') return this.lang === 'zh' ? v.en : v.zh;
    return '';
  },

  t(key, ...args) {
    const s = this.pick(this.dict[key]);
    if (s == null) return key;
    return args.length ? s.replace(/\{(\d+)\}/g, (_, i) => args[+i]) : s;
  },

  setLang(id) {
    this.lang = (id === 'en') ? 'en' : 'zh';
    document.documentElement.lang = this.lang === 'en' ? 'en' : 'zh-CN';
    document.title = this.t('meta.title');
    this.apply();
  },

  /** 刷新所有静态节点 */
  apply(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = this.t(el.getAttribute('data-i18n-html'));
    });
    scope.querySelectorAll('[data-i18n-aria]').forEach(el => {
      el.setAttribute('aria-label', this.t(el.getAttribute('data-i18n-aria')));
    });
  },

  /* ══════════════════════════════════════════════════════ */

  dict: {

    'meta.title':      { zh: '塔隆·血魔 · 灵魂试炼', en: 'Teron Gorefiend · Soul Trial' },

    /* ── 侧栏 ── */
    'rail.constructs': { zh: '致命构造体', en: 'Deadly Constructs' },
    'rail.log':        { zh: '战斗记录',   en: 'Combat Log' },
    'rail.keys':       { zh: '操作',       en: 'Controls' },
    'rail.tips':       { zh: '战术提示',   en: 'Tactics' },
    'meta.casts':      { zh: '本局施法',   en: 'Casts' },
    'meta.wasted':     { zh: '空转 GCD',   en: 'Idle GCDs' },
    'meta.damage':     { zh: '总伤害',     en: 'Damage' },

    /* ── 抬头显示 ── */
    'boss.name':       { zh: '塔隆·血魔', en: 'Teron Gorefiend' },
    'boss.elite':      { zh: '‹首领›',     en: '‹Boss›' },
    'boss.hp':         { zh: '危 急',      en: 'CRITICAL' },
    'stat.time':       { zh: '用时',       en: 'Time' },
    'stat.best':       { zh: '最佳',       en: 'Best' },
    'stat.alive':      { zh: '存活',       en: 'Alive' },

    'debuff.name':     { zh: '死亡之影',   en: 'Shadow of Death' },
    'debuff.hint':     { zh: '趁现在跑得越远越好 —— 构造体会在你倒下的位置生成',
                         en: 'Run as far as you can — the constructs spawn where you fall' },
    'debuff.dist':     { zh: '距首领 <b>{0}</b> 码 · <b>{1}</b> —— 跑得越远，之后的输出时间越多',
                         en: '<b>{0}</b> yd from the boss · <b>{1}</b> — every yard buys you casting time' },
    'debuff.far':      { zh: '很好',   en: 'good' },
    'debuff.ok':       { zh: '还行',   en: 'ok' },
    'debuff.near':     { zh: '太近了！', en: 'too close!' },

    /* ── 目标框 ── */
    'tf.eta':          { zh: '距首领 {0} 码 · {1} 秒', en: '{0} yd from boss · {1}s' },
    'tf.rooted':       { zh: '已被定身',   en: 'Rooted' },
    'tf.range':        { zh: '距离 {0} 码', en: '{0} yd away' },

    /* ── 标题界面 ── */
    'title.kicker':    { zh: '黑暗神殿 · 第五号首领', en: 'Black Temple · Fifth Boss' },
    'title.name':      { zh: '塔隆·血魔', en: 'Teron Gorefiend' },
    'title.sub':       { zh: '灵 魂 试 炼', en: 'S O U L   T R I A L' },
    'title.brief':     {
      zh: '<b>死亡之影</b>落在了你头上。12 秒后你会倒下，四只<b>致命构造体</b>从你倒下的位置爬出，' +
          '直奔塔隆·血魔 —— 任何一只走到，全团再次全灭。',
      en: '<b>Shadow of Death</b> lands on you. In 12 seconds you drop, and four <b>Deadly Constructs</b> ' +
          'rise where you fell and walk straight at Teron Gorefiend. If any one arrives, the raid wipes.'
    },

    'title.howto':     { zh: '你要做的事', en: 'What you actually do' },
    'title.howto1':    { zh: '拿到死亡之影就<b>往下跑</b>，跑到大厅最深处再倒下。',
                         en: '<b>Run</b> the moment you get the debuff. Die as deep in the hall as you can.' },
    'title.howto2':    { zh: '倒下瞬间四只全叠在你身上 —— 先按 <kbd>5</kbd> <b>灵魂乱射</b>，这是全场唯一保证打满四个的一发。',
                         en: 'The instant you drop, all four are stacked on you — open with <kbd>5</kbd> <b>Spirit Volley</b>, the only cast guaranteed to hit all four.' },
    'title.howto3':    { zh: '然后按 <kbd>3</kbd> 给四只<b>各叠满 3 层减速</b>（<kbd>Tab</kbd> 切目标）。',
                         en: 'Then press <kbd>3</kbd> to stack <b>3 slows on each</b> of the four (<kbd>Tab</kbd> to switch).' },
    'title.howto4':    { zh: '减速只有 9 秒，<b>快掉了就补枪</b>。补枪本身也是伤害，不亏。',
                         en: 'The slow lasts 9s. <b>Refresh before it drops</b> — a refresh is damage too, nothing is wasted.' },
    'title.howtoWhy':  { zh: '为什么？满速的构造体 13 秒就能走到首领，你根本打不完 26 万血。三层减速让它们慢 90% —— 减速才是这场战斗的核心，伤害是顺带的。',
                         en: 'Why? At full speed they reach the boss in ~13s and you cannot burn 260k HP in that window. Three stacks slow them 90% — the slow <i>is</i> the fight; damage is the by-product.' },

    'opt.difficulty':  { zh: '难度',   en: 'Mode' },
    'opt.font':        { zh: '字号',   en: 'Text' },
    'opt.lang':        { zh: '语言',   en: 'Language' },
    'opt.options':     { zh: '选项',   en: 'Options' },
    'opt.practice':    { zh: '训练模式', en: 'Practice' },
    'opt.sound':       { zh: '音效',   en: 'Sound' },
    'opt.azerty':      { zh: 'AZERTY 键位', en: 'AZERTY' },
    'opt.coach':       { zh: '实时提示', en: 'Live coach' },
    'opt.optionsDesc': { zh: '训练模式下构造体抵达首领不会判负，可以反复练习循环。实时提示会在战斗中告诉你下一步该按什么。',
                         en: 'Practice mode never fails you when a construct reaches the boss, so you can drill the rotation. Live coach tells you what to press next.' },

    'btn.start':       { zh: '开 始 试 炼', en: 'B E G I N' },
    'btn.spellbook':   { zh: '法术书',   en: 'Spellbook' },
    'btn.back':        { zh: '返 回',    en: 'B A C K' },
    'btn.retry':       { zh: '再来一次', en: 'Try Again' },
    'btn.menu':        { zh: '返回标题', en: 'Main Menu' },
    'btn.resume':      { zh: '继续',     en: 'Resume' },
    'btn.restart':     { zh: '重来',     en: 'Restart' },
    'btn.exit':        { zh: '退出',     en: 'Exit' },
    'btn.exitTitle':   { zh: '退出到标题界面（Esc）', en: 'Exit to main menu (Esc)' },

    'hint.move':       { zh: '移动 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / 方向键 / 点击地面',
                         en: 'Move <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows / click ground' },
    'hint.target':     { zh: '选中目标 <kbd>Tab</kbd>', en: 'Target <kbd>Tab</kbd>' },
    'hint.skills':     { zh: '技能 <kbd>1</kbd><kbd>3</kbd><kbd>4</kbd><kbd>5</kbd><kbd>7</kbd>',
                         en: 'Abilities <kbd>1</kbd><kbd>3</kbd><kbd>4</kbd><kbd>5</kbd><kbd>7</kbd>' },

    /* ── 法术书 ── */
    'book.title':      { zh: '灵魂法术书', en: 'Soul Spellbook' },
    'book.scrollHint': { zh: '内容较长，可上下滚动　·　<kbd>Esc</kbd> 返回',
                         en: 'Scroll for more　·　<kbd>Esc</kbd> to close' },
    'book.note':       { zh: '这些技能来自<b>控制条</b>。如果你使用 Bartender 之类的插件，请提前准备 <code>/cast</code> 宏并绑定按键，否则真打的时候会手忙脚乱。',
                         en: 'These live on the <b>possess bar</b>. If you run Bartender or similar, prepare <code>/cast</code> macros and bind them beforehand — otherwise you will fumble it live.' },
    'book.strategy':   { zh: '核心思路', en: 'The Plan' },
    'book.s1':         { zh: '拿到<b>死亡之影</b>后立刻朝远离首领的方向狂奔 —— 你跑出的每一码都是之后的输出时间。',
                         en: 'Sprint away from the boss the instant you get <b>Shadow of Death</b> — every yard is casting time later.' },
    'book.s2':         { zh: '开场四只全叠在你倒下的位置 —— 先 <b>5 灵魂乱射</b>，这是整局唯一保证打满四个的一发。',
                         en: 'They all spawn stacked on your corpse — open with <b>5 Spirit Volley</b>, the one cast all fight that is guaranteed to hit four.' },
    'book.s3':         { zh: '接着用 <b>3 灵魂之枪</b>给四只各叠满 3 层（减速 90%），它们几乎会原地爬行。',
                         en: 'Then stack <b>3× Spirit Lance</b> on all four (90% slow). They will barely crawl.' },
    'book.s4':         { zh: '<b>灵魂锁链是保险，不是输出</b>：多花的这一个公共冷却实测让通关慢 1 秒，'
                           + '所以死得太靠前、或有人快摸到首领时才用。要用就趁它们满速时用。'
                           + '它自身的伤害不会打断自己，但<b>之后任何伤害都会</b>。',
                         en: '<b>Chains is insurance, not damage</b>: that extra GCD measurably costs ~1s on your clear, '
                           + 'so save it for a bad death position or an add about to arrive — and use it while they are still fast. '
                           + 'It does not break its own root, but <b>any later damage does</b>.' },
    'book.s5':         { zh: '减速快掉了就补枪：<b>宁可少打一次伤害，也不能让减速掉光</b>。',
                         en: 'Refresh before the slow falls off: <b>losing the slow costs far more than one lost cast</b>.' },
    'book.dmg':        { zh: '{0}–{1} 伤害', en: '{0}–{1} damage' },

    /* ── 结算 ── */
    'result.kickerWin':  { zh: '灵魂阶段 · 完成', en: 'Ghost Phase · Cleared' },
    'result.kickerLose': { zh: '灵魂阶段 · 失败', en: 'Ghost Phase · Failed' },
    'result.win':        { zh: '四只构造体全部消灭', en: 'All four constructs destroyed' },
    'result.lose':       { zh: '构造体冲进了团队', en: 'A construct reached the raid' },
    'result.time':       { zh: '用时 <b>{0}</b> 秒', en: 'Cleared in <b>{0}</b>s' },
    'result.pb':         { zh: '新纪录！', en: 'New best!' },
    'result.practice':   { zh: '不计入个人最佳', en: 'not counted toward best' },
    'result.bestWas':    { zh: '最佳 {0} 秒', en: 'best {0}s' },
    'result.survived':   { zh: '坚持了 <b>{0}</b> 秒　·　{1} 抵达了首领',
                           en: 'Survived <b>{0}</b>s　·　{1} reached the boss' },
    'result.colItem':    { zh: '项目', en: 'Item' },
    'result.colValue':   { zh: '数值', en: 'Value' },
    'result.killedAt':   { zh: '{0} 秒击杀', en: 'killed at {0}s' },
    'result.remaining':  { zh: '剩余 {0}%', en: '{0}% left' },
    'result.totalDmg':   { zh: '总伤害', en: 'Total damage' },
    'result.dps':        { zh: '每秒伤害', en: 'Damage per second' },
    'result.casts':      { zh: '施法次数', en: 'Casts' },
    'result.castsN':     { zh: '{0} 次', en: '{0}' },
    'result.idle':       { zh: '空转 GCD', en: 'Idle GCDs' },
    'result.idleN':      { zh: '{0} 次（浪费 {1} 秒）', en: '{0} (wasted {1}s)' },
    'result.lanceVolley':{ zh: '灵魂之枪 / 乱射', en: 'Lance / Volley' },
    'result.leaks':      { zh: '漏过首领', en: 'Leaked to boss' },
    'result.leaksN':     { zh: '{0} 次', en: '{0}×' },
    'result.mode':       { zh: '难度', en: 'Mode' },
    'result.hint':       { zh: '<kbd>R</kbd> 快速重来　·　<kbd>Esc</kbd> 返回标题',
                           en: '<kbd>R</kbd> retry　·　<kbd>Esc</kbd> main menu' },

    'pause.title':     { zh: '已暂停', en: 'Paused' },

    /* ── 操作表 ── */
    'keys.move':       { zh: '移动',       en: 'Move' },
    'keys.moveV':      { zh: 'WASD / 方向键', en: 'WASD / Arrows' },
    'keys.cycle':      { zh: '切换目标',   en: 'Cycle target' },
    'keys.cycleV':     { zh: 'Tab / Shift+Tab', en: 'Tab / Shift+Tab' },
    'keys.urgent':     { zh: '最紧急',     en: 'Most urgent' },
    'keys.urgentV':    { zh: '` 或 Q',     en: '` or Q' },
    'keys.pick':       { zh: '指定目标',   en: 'Pick target' },
    'keys.pickV':      { zh: 'F1 – F4',    en: 'F1 – F4' },
    'keys.abilities':  { zh: '技能',       en: 'Abilities' },
    'keys.abilitiesV': { zh: '1 3 4 5 7',  en: '1 3 4 5 7' },
    'keys.pause':      { zh: '暂停',       en: 'Pause' },
    'keys.pauseV':     { zh: 'Esc',        en: 'Esc' },
    'keys.restart':    { zh: '重来',       en: 'Restart' },
    'keys.restartV':   { zh: 'R',          en: 'R' },

    /* ── 战斗记录 ── */
    'log.debuffOn':    { zh: '塔隆·血魔对你施放了 <b>死亡之影</b>',
                         en: 'Teron Gorefiend casts <b>Shadow of Death</b> on you' },
    'log.runAway':     { zh: '立刻远离首领，构造体会在你倒下处生成',
                         en: 'Get away from the boss — constructs spawn where you fall' },
    'log.becameGhost': { zh: '你化为幽魂，<b>4 只构造体</b>已出现',
                         en: 'You are a ghost. <b>4 constructs</b> have risen' },
    'log.cast':        { zh: '<span class="cast">{0}</span> → {1}', en: '<span class="cast">{0}</span> → {1}' },
    'log.castAoe':     { zh: '<span class="cast">{0}</span> · 命中 {1} 个', en: '<span class="cast">{0}</span> · hit {1}' },
    'log.noHit':       { zh: '{0} · 未命中', en: '{0} · no targets' },
    'log.killed':      { zh: '<span class="kill">{0} 已消灭</span>', en: '<span class="kill">{0} destroyed</span>' },
    'log.noTarget':    { zh: '你没有目标', en: 'No target' },
    'log.tooFar':      { zh: '{0}：距离太远', en: '{0}: out of range' },
    'log.onCd':        { zh: '{0}：还没冷却好', en: '{0}: still on cooldown' },
    'log.shieldNoop':  { zh: '<span class="cast">{0}</span> · 本模拟中无效果',
                         en: '<span class="cast">{0}</span> · no effect in this sim' },
    'log.bossSays':    { zh: '<b>血魔</b>：{0}', en: '<b>Gorefiend</b>: {0}' },
    'log.leaked':      { zh: '<span class="warn">{0} 漏过首领</span> · 已推回门口（第 {1} 次）',
                         en: '<span class="warn">{0} reached the boss</span> · pushed back to the door (#{1})' },
    'log.won':         { zh: '<span class="kill">全部构造体已消灭 —— 团队幸存</span>',
                         en: '<span class="kill">All constructs down — the raid survives</span>' },
    'log.lost':        { zh: '<span class="warn">构造体抵达首领 —— 团队全灭</span>',
                         en: '<span class="warn">A construct reached the boss — raid wipe</span>' },

    /* ── 场内提示 ── */
    'callout.debuff':  { zh: '死亡之影！', en: 'Shadow of Death!' },
    'callout.spawn':   { zh: '你倒下了 —— 四只构造体出现', en: 'You fall — four constructs rise' },
    'fx.killed':       { zh: '已消灭', en: 'Destroyed' },
    'construct.short': { zh: '构造体 {0}', en: 'Construct {0}' },
    'construct.full':  { zh: '致命构造体 {0}', en: 'Deadly Construct {0}' },
    'cst.approach':    { zh: '推进', en: 'Progress' },
    'cst.slow':        { zh: '减速 ×{0}', en: 'Slow ×{0}' },
    'cst.root':        { zh: '定身', en: 'Rooted' },
    'cst.standby':     { zh: '待命', en: 'Standby' },
    'cst.dead':        { zh: '已消灭', en: 'Destroyed' },

    /* ── 实时提示（教练） ── */
    'coach.title':     { zh: '下一步', en: 'Next' },
    'coach.runAway':   { zh: '往远离首领的方向跑，跑到大厅最深处',
                         en: 'Run away from the boss — get deep into the hall' },
    'coach.lanceNew':  { zh: '按 <kbd>3</kbd> 给 {0} 上枪（还没减速）',
                         en: 'Press <kbd>3</kbd> on {0} — no slow on it yet' },
    'coach.lanceStack':{ zh: '按 <kbd>3</kbd> 把 {0} 叠到 3 层（现在 {1} 层）',
                         en: 'Press <kbd>3</kbd> to get {0} to 3 stacks (at {1})' },
    'coach.lanceRefresh':{ zh: '{0} 的减速还剩 {1} 秒 —— 补枪！',
                         en: '{0} slow expires in {1}s — refresh it!' },
    'coach.volley':    { zh: '{0} 只在范围内 —— 按 <kbd>5</kbd> 灵魂乱射',
                         en: '{0} in range — press <kbd>5</kbd> for Spirit Volley' },
    'coach.volleyWait':{ zh: '乱射好了，但只能打到 {0} 个 —— 靠近它们再放',
                         en: 'Volley is up but only hits {0} — get closer before you use it' },
    'coach.chainsOpen':{ zh: '你死得偏靠前 —— 趁它们满速按 <kbd>4</kbd> 锁链把时间抢回来',
                         en: 'You died a bit close — press <kbd>4</kbd> Chains now, while they are still at full speed' },
    'coach.chains':    { zh: '{0} 快到首领了 —— 按 <kbd>4</kbd> 定住它',
                         en: '{0} is nearly there — press <kbd>4</kbd> to root it' },
    'coach.getCloser': { zh: '超出 30 码了 —— 朝构造体跑近一点',
                         en: 'Out of 30 yd range — move closer to the constructs' },
    'coach.keepGoing': { zh: '按 <kbd>3</kbd> 打 {0}，减速已经满了',
                         en: 'Press <kbd>3</kbd> on {0} — slows are capped, just damage' },
    'coach.gcd':       { zh: '公共冷却中……', en: 'Global cooldown…' },

    /* ── 教学步骤 ── */
    'tut.step':        { zh: '第 {0} / {1} 步', en: 'Step {0} / {1}' },
    'tut.done':        { zh: '完成', en: 'Done' },
    'tut.run.t':       { zh: '先跑远', en: 'Run first' },
    'tut.run.d':       { zh: '按住 <kbd>S</kbd> 往下跑，穿过走廊进入大厅深处。构造体会在你倒下的位置出现 —— 离首领越远，你之后的时间越多。',
                         en: 'Hold <kbd>S</kbd> and run down through the corridor into the hall. The constructs spawn where you fall — the farther, the more time you get.' },
    'tut.ready.t':     { zh: '✓ 跑得够远了', en: '✓ Far enough' },
    'tut.ready.d':     { zh: '保持这个距离，或者继续往外跑。读秒结束你会倒下，四只构造体就从这里出现。',
                         en: 'Hold this distance or keep going. When the timer hits zero you drop, and the four constructs rise right here.' },
    'tut.lance1.t':    { zh: '每只都上一枪', en: 'One lance on each' },
    'tut.lance1.d':    { zh: '四只出现了。按 <kbd>3</kbd> 灵魂之枪，用 <kbd>Tab</kbd> 换目标 —— 先让<b>每一只</b>都吃到减速，别盯着一只打。',
                         en: 'All four are up. Press <kbd>3</kbd> Spirit Lance and <kbd>Tab</kbd> between them — get a slow on <b>every one</b> before you focus anything.' },
    'tut.lance3.t':    { zh: '叠满三层', en: 'Stack to three' },
    'tut.lance3.d':    { zh: '继续补枪，把每只都叠到 <b>3 层</b>。三层 = 减速 90%，它们会从 13 秒变成两分钟。',
                         en: 'Keep lancing until each has <b>3 stacks</b>. Three stacks = 90% slow — their 13-second walk becomes two minutes.' },
    'tut.opener.t':    { zh: '开场：先按 5', en: 'Open with 5' },
    'tut.opener.d':    { zh: '四只刚从你身上爬出来，全部叠在一起 —— 这是整局<b>最好的一次灵魂乱射</b>。'
                           + '现在按 <kbd>5</kbd>，一发打满四个约 4.4 万伤害。',
                         en: 'All four just rose out of you and are stacked on the same spot — this is the '
                           + '<b>best Volley you will get all fight</b>. Press <kbd>5</kbd> now: four targets, about 44k damage.' },
    'tut.chains.t':    { zh: '按一次 4，认识锁链', en: 'Try 4 — meet Chains' },
    'tut.chains.d':    { zh: '按 <kbd>4</kbd> 灵魂锁链感受一下。它是<b>保险，不是输出</b>：'
                           + '满速时 5 秒定身能拦下 17 码，叠满减速后同样 5 秒只值 1.7 码 —— 要用就趁早。'
                           + '但如果你跑得够远、稳稳能打完，这一秒公共冷却拿去补枪反而更快。',
                         en: 'Press <kbd>4</kbd> Spirit Chains to feel it out. It is <b>insurance, not damage</b>: '
                           + 'at full speed a 5s root denies 17 yards, but once they are slowed the same root is worth 1.7 — '
                           + 'so if you use it, use it early. If you ran far and the kill is safe, that GCD is faster spent on a lance.' },
    'tut.sustain.t':   { zh: '维持减速，清掉它们', en: 'Sustain and finish' },
    'tut.sustain.d':   { zh: '减速只有 <b>9 秒</b>。盯着列表里的层数，快掉了就补枪 —— 补枪本身也是 6500 伤害，一点都不亏。把四只全部消灭。',
                         en: 'The slow lasts <b>9 seconds</b>. Watch the stacks and refresh before they drop — a refresh is also 6,500 damage, so nothing is lost. Now finish all four.' },
    'tut.finished':    { zh: '教学完成 —— 去「普通」档试试真实数值', en: 'Tutorial complete — try Normal for the real numbers' }
  }
};

/** 快捷方式：取 {zh,en} 里的当前语言值 */
const L = v => I18N.pick(v);
const T = (k, ...a) => I18N.t(k, ...a);
