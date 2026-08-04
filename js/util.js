/* ═══════════════════════════════════════════════════════════
   基础工具
   ═══════════════════════════════════════════════════════════ */
'use strict';

const U = {

  clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; },

  lerp(a, b, t) { return a + (b - a) * t; },

  /** 指数平滑，帧率无关 */
  damp(a, b, lambda, dt) { return U.lerp(a, b, 1 - Math.exp(-lambda * dt)); },

  dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); },

  dist2(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; },

  rand(a, b) { return a + Math.random() * (b - a); },

  randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },

  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },

  /** 可复现的伪随机数生成器（美术烘焙用，保证每次纹理一致） */
  mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  /** 数字千分位 */
  num(n) { return Math.round(n).toLocaleString('zh-CN'); },

  /** 秒 → "12.34" */
  secs(s, digits) { return s.toFixed(digits === undefined ? 2 : digits); },

  $(sel, root) { return (root || document).querySelector(sel); },
  $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); },

  el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  },

  /** 创建一个已按 dpr 缩放好的离屏画布 */
  canvas(w, h, scale) {
    const s = scale || 1;
    const c = document.createElement('canvas');
    c.width = Math.round(w * s);
    c.height = Math.round(h * s);
    const ctx = c.getContext('2d');
    ctx.scale(s, s);
    return { canvas: c, ctx, w, h };
  },

  /** 本地存储，静默失败（隐私模式 / file:// 下也不炸） */
  store: {
    get(key, dflt) {
      try {
        const v = localStorage.getItem('teron.' + key);
        return v === null ? dflt : JSON.parse(v);
      } catch (e) { return dflt; }
    },
    set(key, val) {
      try { localStorage.setItem('teron.' + key, JSON.stringify(val)); } catch (e) { /* ignore */ }
    }
  }
};
