(() => {
  "use strict";
  const addStyle=href=>{const style=document.createElement("link");style.rel="stylesheet";style.href=href;document.head.appendChild(style);};
  addStyle("css/dialog-portrait-layout-v3.css?v=6");
  addStyle("css/character-portraits.css?v=1");
  addStyle("css/rpg-systems.css?v=2");
  addStyle("css/items.css?v=2");
  addStyle("css/story.css?v=2");
  addStyle("css/friend-conversation.css?v=1");
  addStyle("css/rpg-field-v1.css?v=3");
  addStyle("css/map-interiors.css?v=2");
  addStyle("css/npc-pipoya.css?v=4");
  addStyle("css/computer.css?v=3");
  addStyle("css/pipoya-map.css?v=2");
  addStyle("css/house-maps.css?v=1");
  addStyle("css/house-rooms-v2.css?v=2");
  addStyle("css/pokemon-house-compact.css?v=1");
  addStyle("css/sophie-sprite.css?v=21");
  const load=src=>new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=reject;document.body.appendChild(s);});
  const loadOptional=src=>load(src).catch(error=>{console.warn(`Optional module failed to load: ${src}`,error);});
  load("js/python-runner.js?v=1")
    .then(()=>load("js/interpreter.js?v=3"))
    .then(()=>load("js/game03-core.js?v=8"))
    .then(()=>load("js/audio-settings.js?v=1"))
    .then(()=>loadOptional("js/lumiere-python-errors.js?v=2"))
    .then(()=>load("js/python-grimoire.js?v=1"))
    .then(()=>load("js/map-transition.js?v=3"))
    .then(()=>load("js/movement-step-lock.js?v=1"))
    .then(()=>load("js/house-movement-fix.js?v=1"))
    .then(()=>load("js/game03-items.js?v=3"))
    .then(()=>load("js/game03-menu.js?v=18"))
    .then(()=>load("js/game03-story.js?v=10"))
    .then(()=>load("js/friend-conversation.js?v=3"))
    .then(()=>load("js/game03-battle.js?v=6"))
    .then(()=>load("js/follower-normalize.js?v=1"))
    .then(()=>load("js/tilemap-runtime.js?v=1"))
    .then(()=>window.SpellTilemapRuntime?.ready)
    .then(()=>load("js/game03-field.js?v=20"))
    .then(()=>load("js/la-mer-expanded.js?v=3"))
    .then(()=>load("js/fleur-start-sprites.js?v=3"))
    .then(()=>load("js/place-names.js?v=2"))
    .then(()=>load("js/game-bgm.js?v=6"))
    .then(()=>load("js/character-portraits.js?v=3"))
    .then(()=>load("js/dialog-typewriter.js?v=4"))
    .then(()=>load("js/dialog-sfx.js?v=3"))
    .then(()=>load("js/ido-confirm-dialog-fix.js?v=4"))
    .then(()=>load("js/plugin-transition.js?v=2"))
    .then(()=>load("js/plugin-editor-entry.js?v=1"))
    .then(()=>load("js/house-room-layout.js?v=4"))
    .then(()=>window.SpellTilemapRuntime?.apply?.(window.SpellField?.currentMap?.()))
    .then(()=>load("js/party-lockstep.js?v=6"))
    .then(()=>load("js/map-scroll-fix.js?v=1"))
    .then(()=>load("js/python-polish.js?v=1"))
    .then(()=>load("js/npc-facing.js?v=1"))
    .then(()=>load("js/z-escape.js?v=2"))
    .then(()=>{
      const area=document.querySelector(".field-area");if(area&&!area.textContent)area.textContent="フルール村";
      const help=[...document.querySelectorAll(".field-help span")];if(help[1])help[1].textContent="話す・調べる・戻る：Z";
      return load("js/sophie-sprite.js?v=7");
    })
    .catch(error=>{console.error("Spell Operator boot failed",error);document.body.insertAdjacentHTML("beforeend",'<p style="padding:16px;color:#fff">ゲームの読み込みに失敗しました。再読み込みしてください。</p>');});
})();
