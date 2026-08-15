(() => {
  "use strict";
  const $=s=>document.querySelector(s);
  const screens={title:$("#screen-title"),field:$("#screen-field"),hub:$("#screen-hub"),debug:$("#screen-debug"),battle:$("#screen-battle"),clear:$("#screen-clear"),defeat:$("#screen-defeat"),status:null};
  const interpreter=new SpellRuntime.SpellInterpreter({stepLimit:1000});

  const partySpecies={
    sophie:{name:"ソフィー",baseStats:{hp:85,attack:110,defense:80,spAttack:20,spDefense:70,speed:95}},
    lumiere:{name:"ルミエル",baseStats:{hp:70,attack:10,defense:65,spAttack:125,spDefense:95,speed:75}}
  };
  const START_LEVEL=8;
  const SPELL_SLOT_COUNT=4;

  function calcStat(base,level,isHp=false){const core=Math.floor((2*base*level)/100);return isHp?core+level+10:core+5}
  function calculateStats(baseStats,level){return{hp:calcStat(baseStats.hp,level,true),attack:calcStat(baseStats.attack,level),defense:calcStat(baseStats.defense,level),spAttack:calcStat(baseStats.spAttack,level),spDefense:calcStat(baseStats.spDefense,level),speed:calcStat(baseStats.speed,level)}}
  function maxMpFor(stats,level){return 15+level+Math.floor(stats.spAttack/3)}
  function expToNext(level){return level*20}
  function addExp(memberKey,amount){
    const member=state.party[memberKey];if(!member)return{levels:0,level:0,exp:0};
    member.exp+=Math.max(0,Math.floor(amount||0));let levels=0;
    while(member.exp>=expToNext(member.level)){member.exp-=expToNext(member.level);member.level+=1;levels+=1}
    return{levels,level:member.level,exp:member.exp,next:expToNext(member.level)};
  }
  function resetParty(){state.party={sophie:{level:START_LEVEL,exp:0},lumiere:{level:START_LEVEL,exp:0}}}
  function serializeParty(){return JSON.parse(JSON.stringify(state.party))}
  function restoreParty(data){
    if(!data)return;
    for(const key of ["sophie","lumiere"]){if(data[key]){state.party[key].level=Math.max(1,Math.floor(data[key].level||START_LEVEL));state.party[key].exp=Math.max(0,Math.floor(data[key].exp||0))}}
  }

  const spellDefinitions={
    fire:{name:"Fire",power:60,initialCode:`# Fire: 1000回ループではオーバーヒートします。\nspell fire\n\nfor i in range(1000):\n    print(5 - i)\n\ncast("fire")`,hint:'range(1000) を必要な回数まで減らし、5 → 4 → 3 → 2 → 1 と出力してから cast("fire") を実行する。',validate:r=>interpreter.validateFire(r)},
    heal:{name:"Heal",heal:20,initialCode:`# Heal: HPが20未満のときだけ回復する。\nspell heal\n\nhp = 12\n\nif hp < 5:\n    cast("heal")`,hint:'hp は12です。HPが20未満なら Heal を実行するよう、if の条件を直してください。',validate:r=>interpreter.validateHeal(r)}
  };

  const state={selectedSpellKey:null,drafts:Object.create(null),lastRun:null,registeredSpells:Object.create(null),spellSlots:Array(SPELL_SLOT_COUNT).fill(null),battle:null,busy:false,pendingActions:{sophie:null,lumiere:null},party:null};
  resetParty();

  function showScreen(name){Object.values(screens).filter(Boolean).forEach(el=>el.classList.remove("active"));screens[name]?.classList.add("active")}
  function isSpellEquipped(key){return state.spellSlots.includes(key)}
  function getEquippedSpell(key){return isSpellEquipped(key)?state.registeredSpells[key]||null:null}
  function equipSpell(key,preferredIndex=null){
    if(!state.registeredSpells[key])return false;
    if(isSpellEquipped(key))return true;
    let index=Number.isInteger(preferredIndex)&&preferredIndex>=0&&preferredIndex<SPELL_SLOT_COUNT&&!state.spellSlots[preferredIndex]?preferredIndex:state.spellSlots.findIndex(v=>!v);
    if(index<0)return false;
    state.spellSlots[index]=key;window.SpellMenu?.renderLoadout?.();return true;
  }
  function unequipSlot(index){
    if(!Number.isInteger(index)||index<0||index>=SPELL_SLOT_COUNT)return false;
    state.spellSlots[index]=null;window.SpellMenu?.renderLoadout?.();updateWorkshop();return true;
  }
  function magicReady(){return Boolean(getEquippedSpell("fire")&&getEquippedSpell("heal"))}

  function setRunState(label,style){const el=$("#run-state");el.textContent=label;el.className=`status ${style}`}
  function resetAll(){state.selectedSpellKey=null;state.drafts=Object.create(null);state.lastRun=null;state.registeredSpells=Object.create(null);state.spellSlots=Array(SPELL_SLOT_COUNT).fill(null);state.battle=null;state.busy=false;state.pendingActions={sophie:null,lumiere:null};resetParty();updateWorkshop()}
  function updateWorkshop(){
    const n=Object.keys(state.registeredSpells).length;
    $("#workshop-progress").textContent=`${n} / 2 開発`;$("#workshop-progress").className=`badge ${n===2?"success":"muted"}`;
    for(const key of ["fire","heal"]){const badge=$(`#${key}-status`),spell=state.registeredSpells[key];badge.textContent=spell?`${isSpellEquipped(key)?"登録中":"開発済み"} / MP ${spell.mpCost}`:"未開発";badge.className=spell?"badge success":"badge muted"}
    window.SpellMenu?.renderLoadout?.();window.SpellField?.updateObjective?.();
  }
  function openWorkshop(){updateWorkshop();showScreen("hub")}
  function resetDebugResult(){state.lastRun=null;$("#register-spell").disabled=true;const key=state.selectedSpellKey,reg=key?state.registeredSpells[key]:null;$("#spell-badge").textContent=reg?`${spellDefinitions[key].name} 開発済み / MP ${reg.mpCost}`:"未開発";$("#spell-badge").className=reg?"badge success":"badge muted";setRunState("READY","neutral");$("#console-output").textContent="コードを実行してください。";$("#metric-steps").textContent="—";$("#metric-mp").textContent="—";$("#metric-result").textContent="未実行"}
  function openDebug(key){state.selectedSpellKey=key;state.lastRun=null;const def=spellDefinitions[key];$("#debug-title").textContent=`魔法開発：${def.name}`;$("#debug-hint").textContent=def.hint;$("#code-editor").value=state.drafts[key]??def.initialCode;resetDebugResult();showScreen("debug")}
  function resetCode(){const key=state.selectedSpellKey;if(!key)return;state.drafts[key]=spellDefinitions[key].initialCode;$("#code-editor").value=state.drafts[key];resetDebugResult()}
  function ngMessages(key,v){const c=v.checks||{},a=[];if(key==="fire"){if(!c.spellMatches)a.push("- `spell fire` が必要です。");if(!c.loopUsed)a.push("- `for` ループを使ってください。");if(!c.outputMatches)a.push("- 出力を 5,4,3,2,1 にしてください。");if(!c.castMatches)a.push('- `cast("fire")` を1回実行してください。')}else{if(!c.spellMatches)a.push("- `spell heal` が必要です。");if(!c.assignmentUsed)a.push("- HPを変数へ代入してください。");if(!c.conditionalUsed)a.push("- `if` 条件分岐を使ってください。");if(!c.castMatches)a.push('- 条件成立時に `cast("heal")` を1回実行してください。')}return a}
  function runCode(){
    const key=state.selectedSpellKey;if(!key)return;const source=$("#code-editor").value;state.drafts[key]=source;
    try{
      const result=interpreter.run(source),validation=spellDefinitions[key].validate(result);state.lastRun={...result,validation,key,source};const lines=result.output.map(v=>`> ${v}`);result.casts.forEach(s=>lines.push(`[CAST] ${s.toUpperCase()}`));if(!lines.length)lines.push("(出力なし)");lines.push("",`実行ステップ: ${result.steps}`,`推定MP: ${result.mpCost}`);
      if(validation.ok){lines.push("",`CHECK OK: ${spellDefinitions[key].name} は開発完了できます。`);setRunState("SUCCESS","good");$("#metric-result").textContent="成功";$("#register-spell").disabled=false}else{lines.push("","CHECK NG:",...ngMessages(key,validation));setRunState("CHECK NG","warn");$("#metric-result").textContent="条件未達";$("#register-spell").disabled=true}
      $("#console-output").textContent=lines.join("\n");$("#metric-steps").textContent=result.steps;$("#metric-mp").textContent=result.mpCost;
    }catch(e){state.lastRun=null;$("#register-spell").disabled=true;const hot=e instanceof SpellRuntime.OverheatError;setRunState(hot?"OVERHEAT":"ERROR","bad");$("#console-output").textContent=hot?`${e.name}: ${e.message}\n\nヒント: ループ回数を減らして再実行してください。`:`${e.name}: ${e.message}`;$("#metric-steps").textContent=hot?">1000":"—";$("#metric-mp").textContent="—";$("#metric-result").textContent=hot?"過熱停止":"エラー"}
  }
  function registerSpell(){
    if(!state.lastRun?.validation?.ok)return;
    const key=state.lastRun.key,def=spellDefinitions[key];
    state.registeredSpells[key]={key,name:def.name,mpCost:state.lastRun.mpCost,steps:state.lastRun.steps,power:def.power||0,heal:def.heal||0,source:state.lastRun.source};
    equipSpell(key);openWorkshop();
  }
  function serializeMagic(){return{drafts:{...state.drafts},registeredSpells:JSON.parse(JSON.stringify(state.registeredSpells)),spellSlots:[...state.spellSlots]}}
  function restoreMagic(data){
    state.drafts=Object.assign(Object.create(null),data?.drafts||{});state.registeredSpells=Object.assign(Object.create(null),data?.registeredSpells||{});
    state.spellSlots=Array(SPELL_SLOT_COUNT).fill(null);
    if(Array.isArray(data?.spellSlots)){for(let i=0;i<SPELL_SLOT_COUNT;i++){const key=data.spellSlots[i];if(key&&state.registeredSpells[key]&&!state.spellSlots.includes(key))state.spellSlots[i]=key}}
    else{Object.keys(state.registeredSpells).slice(0,SPELL_SLOT_COUNT).forEach((key,i)=>state.spellSlots[i]=key)}
    updateWorkshop();
  }

  window.SpellGame03={$,screens,state,interpreter,spellDefinitions,partySpecies,START_LEVEL,SPELL_SLOT_COUNT,calculateStats,maxMpFor,expToNext,addExp,serializeParty,restoreParty,isSpellEquipped,getEquippedSpell,equipSpell,unequipSlot,showScreen,openWorkshop,updateWorkshop,magicReady,serializeMagic,restoreMagic};
  $("#start-button").addEventListener("click",()=>{resetAll();window.SpellField?.startNewGame()});
  $("#develop-fire").addEventListener("click",()=>openDebug("fire"));$("#develop-heal").addEventListener("click",()=>openDebug("heal"));$("#reset-code").addEventListener("click",resetCode);$("#run-code").addEventListener("click",runCode);$("#register-spell").addEventListener("click",registerSpell);$("#back-workshop").addEventListener("click",()=>{if(state.selectedSpellKey)state.drafts[state.selectedSpellKey]=$("#code-editor").value;openWorkshop()});$("#return-field").addEventListener("click",()=>window.SpellField?.returnFromWorkshop());
  resetAll();
})();
