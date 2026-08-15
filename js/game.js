(() => {
  "use strict";
  const style=document.createElement("link"); style.rel="stylesheet"; style.href="css/sophie-sprite.css?v=3"; document.head.appendChild(style);
  const load = src => new Promise((resolve,reject)=>{ const s=document.createElement("script"); s.src=src; s.onload=resolve; s.onerror=reject; document.body.appendChild(s); });
  load("js/game03-core.js")
    .then(()=>load("js/game03-battle.js"))
    .then(()=>load("js/game03-field.js"))
    .then(()=>load("js/sophie-sprite.js?v=3"))
    .catch(error=>{
      console.error("Spell Operator boot failed",error); document.body.insertAdjacentHTML("beforeend",'<p style="padding:16px;color:#fff">ゲームの読み込みに失敗しました。再読み込みしてください。</p>');
    });
})();
