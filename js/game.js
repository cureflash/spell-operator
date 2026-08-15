(() => {
  "use strict";
  const load = src => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src; script.onload = resolve; script.onerror = reject; document.body.appendChild(script);
  });
  load("js/game02-core.js").then(() => load("js/game02-battle.js")).catch(error => {
    console.error("Spell Operator boot failed", error);
    document.body.insertAdjacentHTML("beforeend", '<p style="padding:16px;color:#fff">ゲームの読み込みに失敗しました。再読み込みしてください。</p>');
  });
})();
