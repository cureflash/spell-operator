(() => {
  "use strict";
  const load = src => new Promise((resolve,reject)=>{ const s=document.createElement("script"); s.src=src; s.onload=resolve; s.onerror=reject; document.body.appendChild(s); });
  load("js/game03-core.js").then(()=>load("js/game03-battle.js")).then(()=>load("js/game03-field.js")).catch(error=>{
    console.error("Spell Operator boot failed",error); document.body.insertAdjacentHTML("beforeend",'<p style="padding:16px;color:#fff">ゲームの読み込みに失敗しました。再読み込みしてください。</p>');
  });
})();
