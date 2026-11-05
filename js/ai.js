// 敵人 AI。每種敵人一個 takeTurn(battle, unit)。
(function () {
  const R = window.RPG;
  R.AI = R.AI || {};

  // 史萊姆：低智力，只會在自己的回合把行動點全部用完（不會留點數）
  R.AI.slime = {
    async takeTurn(b, u) {
      const d0 = u.def;
      let guard = 0;
      while (u.ap > 0 && !b.dead && b.phase !== "over" && guard++ < 12) {
        const p = b.player;
        const d = R.dist(u.x, u.y, p.x, p.y);
        const ramReach = d0.ram.length + b.cfg.body;   // 中心到中心的撞擊距離
        const slamReady = !u.state.slamPending && !(u.state.slamCd > 0) && u.ap >= d0.slam.ap;

        if (slamReady && d > ramReach && d <= d0.slam.range) {
          b.declareSlam(u, p);                       // 有距離、技能好了 → 壓制
        } else if (d <= ramReach && u.ap >= d0.ram.ap) {
          await b.enemyRam(u, p);                    // 夠近 → 撞擊
        } else if (b.enemyMoveToward(u, p, ramReach * 0.7)) {
          // 太遠 → 往玩家靠近
        } else {
          b.say(`${u.name} 呆呆地愣在原地`);         // 什麼都做不了，點數直接浪費掉
          u.ap = 0;
        }
        b.emit();
        if (u.ap > 0) await R.sleep(b.cfg.aiDelay);
      }
    },
  };
})();
