/* ═══════════════════════════════════════════════════════════
   配置 —— 战斗数值、场地几何、难度、文本
   数值忠实还原 TBC 黑暗神殿 塔隆·血魔 灵魂阶段
   ═══════════════════════════════════════════════════════════ */
'use strict';

/** 场地逻辑尺寸（渲染时等比缩放到画布） */
const W = 720, H = 960;

/** 1 码 = 多少逻辑单位。玩家 7 码/秒、构造体 3.5 码/秒，与游戏内一致 */
const YARD = 15.4;

const CFG = {

  W, H, YARD,

  /* ── 场地几何 ───────────────────────────────── */
  arena: {
    /**
     * 可行走区域多边形（钥匙孔形）：上层神殿 → 走廊 → 下层大厅。
     * 顺时针，用于碰撞（线段推出）与地面绘制。
     */
    poly: [
      [168,  66], [552,  66], [552, 306], [424, 306], [424, 366], [636, 366],
      [636, 906], [ 84, 906], [ 84, 366], [296, 366], [296, 306], [168, 306]
    ],
    boss:    { x: 360, y: 152 },
    doorway: { x: 360, y: 344 },
    /** 构造体朝首领推进的路点链（按 y 从下往上） */
    waypoints: [
      { belowY: 430, x: 360, y: 402 },   // 大厅内，门前集合点
      { belowY: 306, x: 360, y: 300 }    // 走廊内
    ],
    /** 构造体判定抵达首领的距离（单位） */
    reachRadius: 30,
    /** 玩家出生点（首领脚下） */
    playerSpawn: { x: 330, y: 214 },
    /** 柱子：可绕行障碍，给走位留出空间 */
    pillars: [
      { x: 186, y: 486, r: 27 }, { x: 534, y: 486, r: 27 },
      { x: 186, y: 786, r: 27 }, { x: 534, y: 786, r: 27 }
    ],
    /** 火盆：仅用于光照与氛围 */
    braziers: [
      { x: 236, y: 128 }, { x: 484, y: 128 },
      { x: 186, y: 486 }, { x: 534, y: 486 },
      { x: 186, y: 786 }, { x: 534, y: 786 },
      { x: 316, y: 392 }, { x: 404, y: 392 }
    ]
  },

  player: {
    speed: 7 * YARD,      // 7 码/秒
    radius: 9
  },

  construct: {
    maxHP: 65000,
    speed: 3.5 * YARD,    // 3.5 码/秒
    radius: 11,
    /** 生成后的僵直，给玩家反应时间 */
    spawnGrace: 1.0,
    /** 彼此排斥，避免完全重叠导致选不中 */
    separation: 34
  },

  /* ── 技能 ───────────────────────────────────── */
  gcd: 1.0,

  abilities: [
    {
      id: 'strike', key: '1', code: 'Digit1',
      name: { zh: '灵魂打击', en: 'Spirit Strike' },
      range: 6, aoe: false, cd: 0,
      minDmg: 638, maxDmg: 862,
      travel: 0,
      stats: { zh: '近战距离 · 单体 · 仅受公共冷却限制',
               en: 'Melee · single target · GCD only' },
      desc: { zh: '低伤害单体近战攻击。填充空档用，不要为了它跑近身而丢掉灵魂之枪的减速。',
              en: 'Low-damage melee filler. Never walk into melee for this if it costs you Spirit Lance uptime.' }
    },
    {
      id: 'lance', key: '3', code: 'Digit3',
      name: { zh: '灵魂之枪', en: 'Spirit Lance' },
      range: 30, aoe: false, cd: 0,
      minDmg: 6175, maxDmg: 6825,
      travel: 620,
      slow: 0.30, slowDur: 9, maxStacks: 3,
      stats: { zh: '30 码 · 单体 · 减速 30%，最多 3 层，持续 9 秒',
               en: '30 yd · single target · 30% slow, 3 stacks, 9s' },
      desc: { zh: '你的主力技能。三层减速能让构造体几乎原地不动 —— 保住减速比多打一点伤害重要得多。',
              en: 'Your bread and butter. Three stacks nearly freeze a construct in place — uptime on the slow matters far more than squeezing in damage.' }
    },
    {
      id: 'chains', key: '4', code: 'Digit4',
      name: { zh: '灵魂锁链', en: 'Spirit Chains' },
      range: 12, aoe: true, cd: 15,
      minDmg: 1900, maxDmg: 2100,
      travel: 0,
      root: 5,
      stats: { zh: '12 码范围 · 定身 5 秒 · 冷却 15 秒',
               en: '12 yd AoE · 5s root · 15s cooldown' },
      desc: { zh: '把周围的构造体钉在原地。注意：任何伤害都会立刻打断定身，所以别在定身后马上乱输出。',
              en: 'Pins nearby constructs. Careful: any damage breaks the root instantly, so do not follow it up with damage on the same target.' }
    },
    {
      id: 'volley', key: '5', code: 'Digit5',
      name: { zh: '灵魂乱射', en: 'Spirit Volley' },
      range: 12, aoe: true, cd: 15,
      minDmg: 9900, maxDmg: 12100,
      travel: 420,
      stats: { zh: '12 码范围 · 群体高伤害 · 冷却 15 秒',
               en: '12 yd AoE · heavy damage · 15s cooldown' },
      desc: { zh: '唯一的高伤害群体技能。开场四只全叠在你倒下的那一点 —— 那是全场唯一保证打满四个的一发，'
                + '第一个公共冷却就该放掉。之后等它们被减速重新聚拢再放，少于三个都算亏。',
              en: 'Your only real AoE. At the spawn all four are stacked on the spot you died — that is the one cast '
                + 'guaranteed to hit four, so spend your very first GCD on it. After that, wait until they clump again; '
                + 'fewer than three targets is a waste.' }
    },
    {
      id: 'shield', key: '7', code: 'Digit7',
      name: { zh: '灵魂护盾', en: 'Spirit Shield' },
      range: 0, aoe: false, cd: 0,
      minDmg: 0, maxDmg: 0, travel: 0,
      noop: true,
      stats: { zh: '友方目标 · 吸收伤害', en: 'Friendly target · absorbs damage' },
      desc: { zh: '给友方玩家套一个吸收护盾。本模拟中构造体不会攻击你，所以它没有实际作用 —— 但按键位置要记住。',
              en: 'Shields a friendly player. Constructs never attack you here, so it does nothing in this sim — but learn where the key sits.' }
    }
  ],

  /* ── 难度 ───────────────────────────────────── */
  difficulties: [
    {
      id: 'tutorial', name: { zh: '教学', en: 'Tutorial' },
      speedMul: 0.55, debuff: 16, spawnSpread: 20, timeScale: 1.6,
      tutorial: true, forgiving: true,
      desc: { zh: '一步一步带你走完整套循环：先跑远、开场乱射、再叠满减速。构造体很慢，也不会判负。',
              en: 'Walks you through the whole rotation step by step: run, open with Volley, then stack slows. Constructs are slow and you cannot lose.' }
    },
    {
      id: 'novice', name: { zh: '新手', en: 'Novice' },
      speedMul: 0.75, debuff: 14, spawnSpread: 22, timeScale: 0.9,
      desc: { zh: '构造体移动速度 75%，死亡之影读秒 14 秒。适合第一次自己完整打一遍。',
              en: 'Constructs at 75% speed, 14s debuff. Your first unassisted run.' }
    },
    {
      id: 'normal', name: { zh: '普通', en: 'Normal' },
      speedMul: 1.00, debuff: 12, spawnSpread: 24, timeScale: 1.0,
      desc: { zh: '完全还原游戏内数值：构造体 3.5 码/秒，死亡之影 12 秒。这是你真正要练的档位。',
              en: 'Exact in-game values: 3.5 yd/s constructs, 12s debuff. This is the one that matters.' }
    },
    {
      id: 'heroic', name: { zh: '英雄', en: 'Heroic' },
      speedMul: 1.22, debuff: 10, spawnSpread: 34, timeScale: 1.15,
      desc: { zh: '构造体更快、准备时间更短，生成时也更分散。留给已经能稳过普通的人。',
              en: 'Faster constructs, less prep time, wider spawn spread. For people who already clear Normal reliably.' }
    },
    {
      id: 'nightmare', name: { zh: '噩梦', en: 'Nightmare' },
      speedMul: 1.48, debuff: 8, spawnSpread: 52, timeScale: 1.32,
      desc: { zh: '构造体四散生成且移动飞快，灵魂乱射很难一次覆盖四个。容错接近于零。',
              en: 'Scattered spawns and very fast constructs — landing a four-target Volley is genuinely hard. Near-zero margin.' }
    }
  ],

  /**
   * 评级门槛（秒）。四只共 26 万血、每秒一个公共冷却，
   * 理论极限约 29 秒 —— 所以 S 卡在 38 秒是「几乎不浪费一个 GCD」。
   * 难度越高门槛越宽松（能在噩梦活下来本身就更难）。
   */
  grades: [
    { letter: 'S', word: { zh: '完美', en: 'Flawless' }, under: 38 },
    { letter: 'A', word: { zh: '优秀', en: 'Strong' },   under: 48 },
    { letter: 'B', word: { zh: '合格', en: 'Passing' },  under: 62 },
    { letter: 'C', word: { zh: '勉强', en: 'Scraped' },  under: Infinity }
  ],

  /** 界面字号档位 —— 写入 :root 的 --ui */
  uiScales: [
    { name: { zh: '紧凑', en: 'Small' },  value: 0.9 },
    { name: { zh: '标准', en: 'Normal' }, value: 1.0 },
    { name: { zh: '大',   en: 'Large' },  value: 1.15 },
    { name: { zh: '特大', en: 'Huge' },   value: 1.32 }
  ],

  /** 侧栏隐藏断点，必须与 style.css 的媒体查询一致 */
  railBreakpoint: 1280,

  /** 首领随机喊话（战斗中随机播放） */
  bossLines: {
    zh: [
      '你的灵魂将成为我的祭品。',
      '死亡……只是开始。',
      '我曾是伊利丹的将军，如今我是死亡本身。',
      '你们的躯壳如此脆弱。',
      '再挣扎一会儿吧，这很有趣。'
    ],
    en: [
      'Your soul will be my offering.',
      'Death is only the beginning.',
      'I was Illidan\u2019s general. Now I am death itself.',
      'Your shells are so very fragile.',
      'Struggle a while longer. I enjoy it.'
    ]
  },

  /** 战术提示轮播 */
  tips: {
    zh: [
      '拿到<b>死亡之影</b>后立刻朝远离首领的方向跑，你多跑一码，之后就多一秒输出时间。',
      '倒下瞬间四只全叠在同一点 —— <b>第一个公共冷却就按 5</b>，这是全场唯一保证打满四个的乱射。',
      '减速持续 <b>9 秒</b>。盯着目标框上的层数计时，掉到 2 秒就该补枪了。',
      '<b>任何伤害都会打断灵魂锁链的定身</b>，定身后别急着对同一个目标输出。',
      '<b>灵魂锁链是保险，不是输出</b>。开场强插一个实测慢 1 秒；要用就趁它们满速时用。',
      '<b>Tab</b> 循环切换目标，<b>~</b> 直接锁定离首领最近的那一只。',
      '构造体不会追你 —— 它们只认首领。所以你可以贴脸输出，不用拉扯。',
      '技能在控制条上是 <b>1 / 3 / 4 / 5 / 7</b>，真打之前记得先做好宏和键位。'
    ],
    en: [
      'Run the instant you get <b>Shadow of Death</b> — every extra yard is another second of casting time later.',
      'The instant you drop, all four are stacked on one spot — <b>spend your first GCD on 5</b>, the only Volley guaranteed to hit four.',
      'The slow lasts <b>9 seconds</b>. Watch the stack timer on the target frame and refresh at 2s.',
      '<b>Any damage breaks Spirit Chains</b> — do not follow a root with damage on that same target.',
      '<b>Chains is insurance, not damage.</b> Forcing it in the opener measurably costs ~1s — save it, and use it while they are still fast.',
      '<b>Tab</b> cycles targets; <b>~</b> jumps straight to whichever is closest to the boss.',
      'Constructs never chase you — they only want the boss. You can stand right on top of them.',
      'The keys are <b>1 / 3 / 4 / 5 / 7</b> on the possess bar. Set up your macros before the real pull.'
    ]
  },

  winFlavor: {
    zh: [
      '团队的欢呼声穿透了黑暗神殿的回廊 —— 这次没有人倒下。',
      '团长在语音里沉默了两秒，然后说：「就是这样，下一把照着来。」',
      '四具构造体在你脚下溃散。塔隆·血魔的嘲讽卡在了喉咙里。'
    ],
    en: [
      'The raid\u2019s cheer carries down the halls of Black Temple — nobody died this time.',
      'The raid leader goes quiet for two seconds, then says: \u201cThat. Exactly that, every pull.\u201d',
      'Four constructs dissolve at your feet. Gorefiend\u2019s taunt dies in his throat.'
    ]
  },
  loseFlavor: {
    zh: [
      '团长长长地叹了一口气……「行吧，重来。这真的不难，只是……唉。」',
      '构造体撞进了团队，屏幕瞬间变灰。第十二次尝试，准备开始。',
      '「谁又没练过灵魂阶段？」—— 语音频道里没有人回答。'
    ],
    en: [
      'The raid leader sighs, audibly. \u201cOk, wipe it up. This isn\u2019t hard, it\u2019s just\u2026 ugh.\u201d',
      'The constructs crash into the raid and the screen greys out. Attempt twelve, standing by.',
      '\u201cDid nobody practise the ghost phase?\u201d — nobody answers on voice.'
    ]
  }
};

/** 按难度取评级 */
CFG.gradeFor = function (seconds, diff) {
  const scale = diff ? diff.timeScale : 1;
  for (const g of CFG.grades) {
    if (seconds < g.under * scale) return g;
  }
  return CFG.grades[CFG.grades.length - 1];
};

CFG.ability = function (id) { return CFG.abilities.find(a => a.id === id); };
