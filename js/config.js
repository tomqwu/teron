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
      name: '灵魂打击', en: 'Spirit Strike',
      range: 6, aoe: false, cd: 0,
      minDmg: 638, maxDmg: 862,
      travel: 0,
      stats: '近战距离 · 单体 · 仅受公共冷却限制',
      desc: '低伤害单体近战攻击。填充空档用，不要为了它跑近身而丢掉灵魂之枪的减速。'
    },
    {
      id: 'lance', key: '3', code: 'Digit3',
      name: '灵魂之枪', en: 'Spirit Lance',
      range: 30, aoe: false, cd: 0,
      minDmg: 6175, maxDmg: 6825,
      travel: 620,
      slow: 0.30, slowDur: 9, maxStacks: 3,
      stats: '30 码 · 单体 · 减速 30%，最多 3 层，持续 9 秒',
      desc: '你的主力技能。三层减速能让构造体几乎原地不动 —— 保住减速比多打一点伤害重要得多。'
    },
    {
      id: 'chains', key: '4', code: 'Digit4',
      name: '灵魂锁链', en: 'Spirit Chains',
      range: 12, aoe: true, cd: 15,
      minDmg: 1900, maxDmg: 2100,
      travel: 0,
      root: 5,
      stats: '12 码范围 · 定身 5 秒 · 冷却 15 秒',
      desc: '把周围的构造体钉在原地。注意：任何伤害都会立刻打断定身，所以别在定身后马上乱输出。'
    },
    {
      id: 'volley', key: '5', code: 'Digit5',
      name: '灵魂乱射', en: 'Spirit Volley',
      range: 12, aoe: true, cd: 15,
      minDmg: 9900, maxDmg: 12100,
      travel: 420,
      stats: '12 码范围 · 群体高伤害 · 冷却 15 秒',
      desc: '唯一的高伤害群体技能。尽量等构造体聚成一堆时再放，一次打满四个才算不亏。'
    },
    {
      id: 'shield', key: '7', code: 'Digit7',
      name: '灵魂护盾', en: 'Spirit Shield',
      range: 0, aoe: false, cd: 0,
      minDmg: 0, maxDmg: 0, travel: 0,
      noop: true,
      stats: '友方目标 · 吸收伤害',
      desc: '给友方玩家套一个吸收护盾。本模拟中构造体不会攻击你，所以它没有实际作用 —— 但按键位置要记住。'
    }
  ],

  /* ── 难度 ───────────────────────────────────── */
  difficulties: [
    {
      id: 'novice', name: '新手', speedMul: 0.75, debuff: 14, spawnSpread: 22, timeScale: 0.9,
      desc: '构造体移动速度 75%，死亡之影读秒 14 秒。适合第一次熟悉技能循环。'
    },
    {
      id: 'normal', name: '普通', speedMul: 1.00, debuff: 12, spawnSpread: 24, timeScale: 1.0,
      desc: '完全还原游戏内数值：构造体 3.5 码/秒，死亡之影 12 秒。这是你真正要练的档位。'
    },
    {
      id: 'heroic', name: '英雄', speedMul: 1.22, debuff: 10, spawnSpread: 34, timeScale: 1.15,
      desc: '构造体更快、准备时间更短，生成时也更分散。留给已经能稳过普通的人。'
    },
    {
      id: 'nightmare', name: '噩梦', speedMul: 1.48, debuff: 8, spawnSpread: 52, timeScale: 1.32,
      desc: '构造体四散生成且移动飞快，灵魂乱射很难一次覆盖四个。容错接近于零。'
    }
  ],

  /**
   * 评级门槛（秒）。四只共 26 万血、每秒一个公共冷却，
   * 理论极限约 29 秒 —— 所以 S 卡在 38 秒是「几乎不浪费一个 GCD」。
   * 难度越高门槛越宽松（能在噩梦活下来本身就更难）。
   */
  grades: [
    { letter: 'S', word: '完美', under: 38 },
    { letter: 'A', word: '优秀', under: 48 },
    { letter: 'B', word: '合格', under: 62 },
    { letter: 'C', word: '勉强', under: Infinity }
  ],

  /** 界面字号档位 —— 写入 :root 的 --ui */
  uiScales: [
    { name: '紧凑', value: 0.9 },
    { name: '标准', value: 1.0 },
    { name: '大',   value: 1.15 },
    { name: '特大', value: 1.32 }
  ],

  /** 侧栏隐藏断点，必须与 style.css 的媒体查询一致 */
  railBreakpoint: 1280,

  constructNames: ['致命构造体 1', '致命构造体 2', '致命构造体 3', '致命构造体 4'],

  /** 首领随机喊话（战斗中随机播放） */
  bossLines: [
    '你的灵魂将成为我的祭品。',
    '死亡……只是开始。',
    '我曾是伊利丹的将军，如今我是死亡本身。',
    '你们的躯壳如此脆弱。',
    '再挣扎一会儿吧，这很有趣。'
  ],

  /** 战术提示轮播 */
  tips: [
    '拿到<b>死亡之影</b>后立刻朝远离首领的方向跑，你多跑一码，之后就多一秒输出时间。',
    '开局第一件事是给四只构造体<b>各叠满三层灵魂之枪</b>，而不是急着打伤害。',
    '减速持续 <b>9 秒</b>。盯着目标框上的层数计时，掉到 2 秒就该补枪了。',
    '<b>任何伤害都会打断灵魂锁链的定身</b>，定身后别急着对同一个目标输出。',
    '<b>灵魂乱射</b>只有 12 码半径，等它们挤成一堆再放，一次覆盖四个。',
    '<b>Tab</b> 循环切换目标，<b>~</b> 直接锁定离首领最近的那一只。',
    '构造体不会追你 —— 它们只认首领。所以你可以贴脸输出，不用拉扯。',
    '技能在控制条上是 <b>1 / 3 / 4 / 5 / 7</b>，真打之前记得先做好宏和键位。'
  ],

  winFlavor: [
    '团队的欢呼声穿透了黑暗神殿的回廊 —— 这次没有人倒下。',
    '团长在语音里沉默了两秒，然后说：「就是这样，下一把照着来。」',
    '四具构造体在你脚下溃散。塔隆·血魔的嘲讽卡在了喉咙里。'
  ],
  loseFlavor: [
    '团长长长地叹了一口气……「行吧，重来。这真的不难，只是……唉。」',
    '构造体撞进了团队，屏幕瞬间变灰。第十二次尝试，准备开始。',
    '「谁又没练过灵魂阶段？」—— 语音频道里没有人回答。'
  ]
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
