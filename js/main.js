/* ═══════════════════════════════════════════════════════════
   启动与主循环
   ═══════════════════════════════════════════════════════════ */
'use strict';

(function boot() {

  function start() {
    Game.init();

    let last = performance.now();
    let t = 0;

    function frame(now) {
      // 限制单帧步长，切标签页回来时不会瞬移
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.1) dt = 0.1;
      t += dt;

      Game.update(dt);
      Game.render(t);
      UI.update(dt);

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // 首次交互解锁音频
    const unlock = () => { Sfx.unlock(); Sfx.setEnabled(U.$('#optSound').checked); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
