(() => {
  "use strict";
  const G=window.SpellGame03;
  const replacements=[
    ["メニューのパソコンで Fire と Repair の魔導書を解析しよう","メニューのパソコンで Fire と Repair の問題を解いて修得しよう"],
    ["Fire と Repair は実戦登録できた。あとは東側で実戦テスト。","Fire と Repair は修得できた。あとは東側で実戦テスト。"],
    ["パソコンを開いて魔導書を解析しよう。Fire と Repair の両方を実戦登録しておくといい。","パソコンで問題を解いて Fire と Repair を修得しよう。"],
    ["待って。Fire と Repair がまだ実戦登録されてない。パソコンを開こう。","待って。Fire と Repair がまだ修得できていない。パソコンを開こう。"],
    ["実戦登録枠に Fire と Repair をセットしてから行こう。","Fire と Repair を修得してから行こう。"],
    ["その魔法は実戦登録されていない。","その魔法はまだ修得していない。"]
  ];
  function polish(el){if(!el)return;let text=el.textContent,next=text;for(const [a,b] of replacements)next=next.split(a).join(b);next=next.replace(/\((\d+) steps\)/g,"(計算コスト $1)");if(next!==text)el.textContent=next}
  for(const id of ["field-objective","field-dialog-text","battle-log"]){const el=document.getElementById(id);if(!el)continue;polish(el);new MutationObserver(()=>polish(el)).observe(el,{childList:true,subtree:true,characterData:true})}
  const original=G.startFieldBattle;
  if(typeof original==="function")G.startFieldBattle=()=>{if(!G.getEquippedSpell?.("fire")||!G.getEquippedSpell?.("repair")){window.SpellField?.showDialog?.({speaker:"lumiere",text:"Fire と Repair を修得してから行こう。"});return false}return original()};
})();
