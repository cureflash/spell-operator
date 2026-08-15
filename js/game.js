(() => {
  "use strict";
  const addStyle = href => { const style=document.createElement("link"); style.rel="stylesheet"; style.href=href; document.head.appendChild(style); };
  addStyle("css/sophie-sprite.css?v=4");
  addStyle("css/field-assets.css?v=5");
  addStyle("css/dialog-portrait-layout-v3.css?v=3");
  const load = src => new Promise((resolve,reject)=>{ const s=document.createElement("script"); s.src=src; s.onload=resolve; s.onerror=reject; document.body.appendChild(s); });
  load("js/game03-core.js")
    .then(()=>load("js/game03-battle.js"))
    .then(()=>load("js/game03-field.js?v=4"))
    .then(()=>load("js/sophie-sprite.js?v=3"))
    .catch(error=>{
      console.error("Spell Operator boot failed",error); document.body.insertAdjacentHTML("beforeend",'<p style="padding:16px;color:#fff">ゲームの読み込みに失敗しました。再読み込みしてください。</p>');
    });
})();
