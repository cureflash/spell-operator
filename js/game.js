(() => {
  "use strict";
  const addStyle=href=>{const style=document.createElement("link");style.rel="stylesheet";style.href=href;document.head.appendChild(style);};
  addStyle("css/sophie-sprite.css?v=6");
  addStyle("css/field-assets-v8.css?v=8");
  addStyle("css/dialog-portrait-layout-v3.css?v=3");
  addStyle("css/rpg-systems.css?v=2");
  addStyle("css/items.css?v=2");
  addStyle("css/story.css?v=1");
  addStyle("css/rpg-field-v1.css?v=3");
  addStyle("css/map-interiors.css?v=1");
  addStyle("css/npc-pipoya.css?v=3");
  addStyle("css/computer.css?v=3");
  const load=src=>new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=reject;document.body.appendChild(s);});
  load("js/python-runner.js?v=1")
    .then(()=>load("js/interpreter.js?v=3"))
    .then(()=>load("js/game03-core.js?v=8"))
    .then(()=>load("js/python-grimoire.js?v=1"))
    .then(()=>load("js/game03-items.js?v=3"))
    .then(()=>load("js/game03-menu.js?v=8"))
    .then(()=>load("js/game03-story.js?v=6"))
    .then(()=>load("js/game03-battle.js?v=6"))
    .then(()=>load("js/game03-field.js?v=16"))
    .then(()=>load("js/map-scroll-fix.js?v=1"))
    .then(()=>load("js/python-polish.js?v=1"))
    .then(()=>load("js/npc-facing.js?v=1"))
    .then(()=>load("js/z-escape.js?v=2"))
    .then(()=>{
      const area=document.querySelector(".field-area");if(area&&!area.textContent)area.textContent="はじまりの町";
      const help=[...document.querySelectorAll(".field-help span")];if(help[1])help[1].textContent="話す・調べる・戻る：Z";
      return load("js/sophie-sprite.js?v=5");
    })
    .catch(error=>{console.error("Spell Operator boot failed",error);document.body.insertAdjacentHTML("beforeend",'<p style="padding:16px;color:#fff">ゲームの読み込みに失敗しました。再読み込みしてください。</p>');});
})();
