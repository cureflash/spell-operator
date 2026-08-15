(() => {
  "use strict";
  const $=s=>document.querySelector(s);
  const screens={title:$("#screen-title"),field:$("#screen-field"),hub:$("#screen-hub"),debug:$("#screen-debug"),battle:$("#screen-battle"),clear:$("#screen-clear"),defeat:$("#screen-defeat"),status:null,backpack:null,shop:null};
  const interpreter=new SpellRuntime.SpellInterpreter({stepLimit:1000});
  const partySpecies={
    sophie:{name:"ソフィー",baseStats:{hp:85,attack:110,defense:80,spAttack:20,spDefense:70,speed:95}},
    lumiere:{name:"ルミエル",baseStats:{hp:70,attack:10,defense:65,spAttack:125,spDefense:95,speed:75}}
  };
  const START_LEVEL=8,SPELL_SLOT_COUNT=4,START_MONEY=600;
  const itemDefinitions={
    healPotion:{name:"ヒールポーション",type:"consumable",price:80,healHp:30,description:"仲間1人のHPを30回復する。"},
    manaPotion:{name:"マナポーション",type:"consumable",price:100,healMp:20,description:"仲間1人のMPを20回復する。"},
    powerGrimoire:{name:"力の魔導書",type:"equipment",price:350,stat:"attack",bonus:8,description:"装備中、攻撃が8上がる。"},
    guardGrimoire:{name:"守りの魔導書",type:"equipment",price:350,stat:"defense",bonus:8,description:"装備中、防御が8上がる。"},
    magicGrimoire:{name:"魔力の魔導書",type:"equipment",price:450,stat:"spAttack",bonus:10,description:"装備中、特攻が10上がる。"},
    swiftGrimoire:{name:"迅速の魔導書",type:"equipment",price:400,stat:"speed",bonus:8,description:"装備中、素早さが8上がる。"}
  };

  function calcStat(base,level,isHp=false){const core=Math.floor((2*base*level)/100);return isHp?core+level+10:core+5}
  function calculateStats(baseStats,level){return{hp:calcStat(baseStats.hp,level,true),attack:calcStat(baseStats.attack,level),defense:calcStat(baseStats.defense,level),spAttack:calcStat(baseStats.spAttack,level),spDefense:calcStat(baseStats.spDefense,level),speed:calcStat(baseStats.speed,level)}}
  function maxMpFor(stats,level){return 15+level+Math.floor(stats.spAttack/3)}
  function expToNext(level){return level*20}

  const state={
    selectedSpellKey:null,drafts:Object.create(null),lastRun:null,
    registeredSpells:Object.create(null),spellSlots:Array(SPELL_SLOT_COUNT).fill(null),
    unlockedSpellbooks:{fire:true,repair:false},
    battle:null,busy:false,pendingActions:{sophie:null,lumiere:null},
    party:null,money:START_MONEY,inventory:Object.create(null),equipment:{sophie:null,lumiere:null}
  };

  function equipmentBonus(memberKey){const itemKey=state.equipment?.[memberKey],item=itemDefinitions[itemKey];return item?.type==="equipment"?item:null}
  function getMemberStats(memberKey){const progress=state.party[memberKey],species=partySpecies[memberKey],stats=calculateStats(species.baseStats,progress.level),equip=equipmentBonus(memberKey);if(equip?.stat&&Object.prototype.hasOwnProperty.call(stats,equip.stat))stats[equip.stat]+=equip.bonus||0;return stats}
  function normalizeVitals(memberKey){const p=state.party[memberKey],stats=getMemberStats(memberKey);p.hp=Math.max(0,Math.min(Number.isFinite(p.hp)?p.hp:stats.hp,stats.hp));const maxMp=maxMpFor(stats,p.level);p.mp=Math.max(0,Math.min(Number.isFinite(p.mp)?p.mp:maxMp,maxMp))}
  function resetParty(){state.party={sophie:{level:START_LEVEL,exp:0,hp:null,mp:null},lumiere:{level:START_LEVEL,exp:0,hp:null,mp:null}};normalizeVitals("sophie");normalizeVitals("lumiere")}
  function resetItems(){state.money=START_MONEY;state.inventory=Object.create(null);state.equipment={sophie:null,lumiere:null}}
  function addExp(memberKey,amount){const member=state.party[memberKey];if(!member)return{levels:0,level:0,exp:0};member.exp+=Math.max(0,Math.floor(amount||0));let levels=0;while(member.exp>=expToNext(member.level)){member.exp-=expToNext(member.level);member.level++;levels++}return{levels,level:member.level,exp:member.exp,next:expToNext(member.level)}}
  function serializeParty(){return JSON.parse(JSON.stringify(state.party))}
  function restoreParty(data){if(!data)return;for(const key of ["sophie","lumiere"]){if(data[key]){state.party[key].level=Math.max(1,Math.floor(data[key].level||START_LEVEL));state.party[key].exp=Math.max(0,Math.floor(data[key].exp||0));state.party[key].hp=Number.isFinite(data[key].hp)?data[key].hp:null;state.party[key].mp=Number.isFinite(data[key].mp)?data[key].mp:null;normalizeVitals(key)}}}
  function serializeItems(){return{money:state.money,inventory:{...state.inventory},equipment:{...state.equipment}}}
  function restoreItems(data){state.money=Math.max(0,Math.floor(data?.money??START_MONEY));state.inventory=Object.assign(Object.create(null),data?.inventory||{});if(Number(data?.inventory?.repairManual||0)>0){state.unlockedSpellbooks.repair=true;delete state.inventory.repairManual}state.equipment={sophie:null,lumiere:null,...(data?.equipment||{})};for(const key of ["sophie","lumiere"]){if(!itemDefinitions[state.equipment[key]]||itemDefinitions[state.equipment[key]].type!=="equipment")state.equipment[key]=null}normalizeVitals("sophie");normalizeVitals("lumiere");updateComputer()}
  function inventoryCount(key){return Math.max(0,Math.floor(state.inventory[key]||0))}
  function addItem(key,count=1){if(!itemDefinitions[key])return false;state.inventory[key]=inventoryCount(key)+Math.max(0,Math.floor(count));return true}
  function removeItem(key,count=1){const n=Math.max(0,Math.floor(count));if(inventoryCount(key)<n)return false;state.inventory[key]=inventoryCount(key)-n;if(state.inventory[key]<=0)delete state.inventory[key];return true}
  function buyItem(key){const item=itemDefinitions[key];if(!item||item.price<=0||state.money<item.price)return false;state.money-=item.price;addItem(key,1);return true}
  function equipItem(memberKey,itemKey){const item=itemDefinitions[itemKey];if(!partySpecies[memberKey]||item?.type!=="equipment"||inventoryCount(itemKey)<1)return false;const old=state.equipment[memberKey];removeItem(itemKey,1);if(old)addItem(old,1);state.equipment[memberKey]=itemKey;normalizeVitals(memberKey);return true}
  function unequipItem(memberKey){const old=state.equipment[memberKey];if(!old)return false;addItem(old,1);state.equipment[memberKey]=null;normalizeVitals(memberKey);return true}
  function useItem(memberKey,itemKey){const item=itemDefinitions[itemKey],p=state.party[memberKey];if(!p||item?.type!=="consumable"||inventoryCount(itemKey)<1)return{ok:false,amount:0};const stats=getMemberStats(memberKey);if(item.healHp){const before=p.hp;p.hp=Math.min(stats.hp,p.hp+item.healHp);const amount=p.hp-before;if(amount<=0)return{ok:false,amount:0};removeItem(itemKey,1);return{ok:true,amount}}if(item.healMp){const maxMp=maxMpFor(stats,p.level),before=p.mp;p.mp=Math.min(maxMp,p.mp+item.healMp);const amount=p.mp-before;if(amount<=0)return{ok:false,amount:0};removeItem(itemKey,1);return{ok:true,amount}}return{ok:false,amount:0}}
  resetItems();resetParty();

  const commonTest=(key,result)=>{
    const spellMatches=result.spell===key;
    const printed=result.output.length>=1;
    const castMatches=result.casts.includes(key);
    return{ok:spellMatches&&printed&&castMatches,checks:{spellMatches,printed,castMatches}};
  };
  const spellDefinitions={
    fire:{name:"Fire",power:60,mpCost:8,initialCode:"",specification:["`spell fire` と宣言する","`print()` を1回以上実行する。出力内容は自由","`cast(\"fire\")` でFireを発動する"],hint:"仕様を満たせばコードの書き方や print() の内容は自由です。",validate:r=>commonTest("fire",r)},
    repair:{name:"Repair",heal:20,mpCost:6,initialCode:"",specification:["`spell repair` と宣言する","`print()` を1回以上実行する。出力内容は自由","`cast(\"repair\")` でRepairを発動する"],hint:"仕様を満たせばコードの書き方や print() の内容は自由です。",validate:r=>commonTest("repair",r)}
  };

  function showScreen(name){Object.values(screens).filter(Boolean).forEach(el=>el.classList.remove("active"));screens[name]?.classList.add("active")}
  function isSpellbookUnlocked(key){return Boolean(state.unlockedSpellbooks[key])}
  function isSpellLearned(key){return Boolean(state.registeredSpells[key])}
  function unlockSpellbook(key){if(!spellDefinitions[key])return false;state.unlockedSpellbooks[key]=true;updateComputer();return true}
  function isSpellEquipped(key){return isSpellLearned(key)}
  function getEquippedSpell(key){return state.registeredSpells[key]||null}
  function equipSpell(key){return isSpellLearned(key)}
  function unequipSlot(){return false}
  function magicReady(){return isSpellLearned("fire")&&isSpellLearned("repair")}

  function spellbookCard(key,learned){
    const def=spellDefinitions[key],spec=def.specification.map(v=>`<li>${v}</li>`).join(""),spell=state.registeredSpells[key];
    return `<article class="panel spell-card ${learned?"learned":""}" data-spellbook="${key}"><div class="spell-card-head"><div><p class="eyebrow">GRIMOIRE SPEC</p><h3>${def.name}</h3></div><span class="badge ${learned?"success":"muted"}">${learned?"修得済み":"未修得"}</span></div><p>${learned?"テスト合格済み。戦闘で使用できます。":"仕様を満たすプログラムを書いてテストに合格すると修得できます。"}</p><div class="grimoire-spec"><strong>仕様</strong><ul>${spec}</ul></div><dl class="spell-spec"><div><dt>効果</dt><dd>${key==="fire"?"威力60":"HPを20修復"}</dd></div><div><dt>消費MP</dt><dd>${def.mpCost}</dd></div></dl><button type="button" class="${learned?"secondary":"primary"}" data-open-spellbook="${key}">${learned?"コードを見る":"エディタで挑戦"}</button>${spell?'<small class="spell-learned-note">修得コード保存済み</small>':""}</article>`;
  }

  function ensureComputerUi(){
    const hub=$("#screen-hub");if(!hub)return;
    hub.classList.add("computer-screen");
    const heading=hub.querySelector(".screen-heading");if(heading){heading.querySelector(".kicker").textContent="SOPHIE PC";heading.querySelector("h2").textContent="魔導書"}
    const grid=hub.querySelector(".spell-grid");
    if(grid&&!$("#spellbooks-unlearned")){grid.classList.add("grimoire-library");grid.innerHTML=`<section class="spellbook-group"><div class="spellbook-group-head"><div><p class="eyebrow">UNLEARNED</p><h3>未修得</h3></div><span>仕様テストに合格すると修得済みへ移動</span></div><div id="spellbooks-unlearned" class="spellbook-list"></div></section><section class="spellbook-group learned-group"><div class="spellbook-group-head"><div><p class="eyebrow">LEARNED</p><h3>修得済み</h3></div><span>戦闘で使用可能</span></div><div id="spellbooks-learned" class="spellbook-list"></div></section>`}
    $("#spell-loadout")?.remove();
    const deploy=hub.querySelector(".deploy-panel");if(deploy){deploy.querySelector(".eyebrow").textContent="LOG OUT";deploy.querySelector("h3").textContent="パソコンを閉じる";deploy.querySelector("p").textContent="未修得の魔導書は仕様テストに合格すると修得済みへ移動します。";const b=deploy.querySelector("button");if(b)b.textContent="フィールドへ戻る"}
    const debug=$("#screen-debug");if(debug){debug.classList.add("computer-editor-screen");const k=debug.querySelector(".kicker");if(k)k.textContent="GRIMOIRE TEST EDITOR";const strong=debug.querySelector(".hint-box strong");if(strong)strong.textContent="仕様";const reset=$("#reset-code");if(reset)reset.textContent="コードをクリア";const run=$("#run-code");if(run)run.textContent="▶ テスト実行";const register=$("#register-spell");if(register)register.hidden=true;const back=$("#back-workshop");if(back)back.textContent="魔導書一覧へ戻る";const manual=debug.querySelector(".manual h4");if(manual)manual.textContent="エディタで使える命令"}
    if(!hub.dataset.grimoireEvents){hub.dataset.grimoireEvents="1";hub.addEventListener("click",event=>{const b=event.target.closest("[data-open-spellbook]");if(b)openDebug(b.dataset.openSpellbook)})}
  }

  function updateComputer(){
    ensureComputerUi();
    const available=Object.keys(spellDefinitions).filter(isSpellbookUnlocked),unlearned=available.filter(k=>!isSpellLearned(k)),learned=available.filter(isSpellLearned),u=$("#spellbooks-unlearned"),l=$("#spellbooks-learned");
    if(u)u.innerHTML=unlearned.length?unlearned.map(k=>spellbookCard(k,false)).join(""):'<p class="spellbook-empty">未修得の魔導書はありません。</p>';
    if(l)l.innerHTML=learned.length?learned.map(k=>spellbookCard(k,true)).join(""):'<p class="spellbook-empty">修得済みの魔法はまだありません。</p>';
    const progress=$("#workshop-progress");if(progress){progress.textContent=`${learned.length} / ${available.length} 修得`;progress.className=`badge ${available.length&&learned.length===available.length?"success":"muted"}`}
    window.SpellMenu?.renderLoadout?.();window.SpellField?.updateObjective?.();
  }

  function openComputer(){updateComputer();showScreen("hub")}
  function openWorkshop(){openComputer()}
  function setRunState(label,style){const el=$("#run-state");if(el){el.textContent=label;el.className=`status ${style}`}}
  function resetAll(){state.selectedSpellKey=null;state.drafts=Object.create(null);state.lastRun=null;state.registeredSpells=Object.create(null);state.spellSlots=Array(SPELL_SLOT_COUNT).fill(null);state.unlockedSpellbooks={fire:true,repair:false};state.battle=null;state.busy=false;state.pendingActions={sophie:null,lumiere:null};resetItems();resetParty();updateComputer()}

  function resetDebugResult(){state.lastRun=null;const key=state.selectedSpellKey,learned=key&&isSpellLearned(key),badge=$("#spell-badge");if(badge){badge.textContent=learned?`${spellDefinitions[key].name} 修得済み`:"未修得";badge.className=learned?"badge success":"badge muted"}setRunState("READY","neutral");$("#console-output").textContent="仕様を満たすコードを書いて、テスト実行してください。";$("#metric-steps").textContent="—";$("#metric-mp").textContent=key?spellDefinitions[key].mpCost:"—";$("#metric-result").textContent="未実行"}
  function openDebug(key){if(!isSpellbookUnlocked(key))return;state.selectedSpellKey=key;state.lastRun=null;const def=spellDefinitions[key];$("#debug-title").textContent=`${def.name} 仕様テスト`;$("#debug-hint").innerHTML=`<ul>${def.specification.map(v=>`<li>${v}</li>`).join("")}</ul><p>${def.hint}</p>`;$("#code-editor").value=state.drafts[key]??state.registeredSpells[key]?.source??"";resetDebugResult();showScreen("debug");setTimeout(()=>$("#code-editor")?.focus(),0)}
  function resetCode(){const key=state.selectedSpellKey;if(!key)return;state.drafts[key]="";$("#code-editor").value="";resetDebugResult()}
  function ngMessages(key,v){const c=v.checks||{},a=[];if(!c.spellMatches)a.push(`- \`spell ${key}\` と宣言してください。`);if(!c.printed)a.push("- `print()` を1回以上実行してください。内容は自由です。");if(!c.castMatches)a.push(`- \`cast(\"${key}\")\` で魔法を発動してください。`);return a}
  function learnSpell(key,result,source){const def=spellDefinitions[key];state.registeredSpells[key]={key,name:def.name,mpCost:def.mpCost,steps:result.steps,power:def.power||0,heal:def.heal||0,source};state.spellSlots=[];updateComputer()}
  function runCode(){
    const key=state.selectedSpellKey;if(!key)return;const source=$("#code-editor").value;state.drafts[key]=source;
    try{
      const result=interpreter.run(source),validation=spellDefinitions[key].validate(result);state.lastRun={...result,validation,key,source};const lines=result.output.map(v=>`> ${v}`);result.casts.forEach(s=>lines.push(`[CAST] ${s.toUpperCase()}`));if(!lines.length)lines.push("(出力なし)");lines.push("",`実行ステップ: ${result.steps}`,`魔法の消費MP: ${spellDefinitions[key].mpCost}`);
      if(validation.ok){learnSpell(key,result,source);lines.push("",`TEST PASS — ${spellDefinitions[key].name} を修得しました。`,"魔法はすぐに戦闘で使用できます。");setRunState("TEST PASS","good");$("#metric-result").textContent="修得";const badge=$("#spell-badge");if(badge){badge.textContent=`${spellDefinitions[key].name} 修得済み`;badge.className="badge success"}}
      else{lines.push("","TEST FAILED:",...ngMessages(key,validation));setRunState("TEST FAILED","warn");$("#metric-result").textContent="条件未達"}
      $("#console-output").textContent=lines.join("\n");$("#metric-steps").textContent=result.steps;$("#metric-mp").textContent=spellDefinitions[key].mpCost;
    }catch(e){state.lastRun=null;const hot=e instanceof SpellRuntime.OverheatError;setRunState(hot?"OVERHEAT":"ERROR","bad");$("#console-output").textContent=`${e.name}: ${e.message}`;$("#metric-steps").textContent=hot?">1000":"—";$("#metric-mp").textContent=spellDefinitions[key]?.mpCost??"—";$("#metric-result").textContent=hot?"過熱停止":"エラー"}
  }

  function serializeMagic(){return{drafts:{...state.drafts},registeredSpells:JSON.parse(JSON.stringify(state.registeredSpells)),unlockedSpellbooks:{...state.unlockedSpellbooks}}}
  function restoreMagic(data){const drafts={...(data?.drafts||{})};if(drafts.heal&&!drafts.repair)drafts.repair=String(drafts.heal).replace(/heal/g,"repair");delete drafts.heal;state.drafts=Object.assign(Object.create(null),drafts);const registered=JSON.parse(JSON.stringify(data?.registeredSpells||{}));if(registered.heal&&!registered.repair)registered.repair={...registered.heal,key:"repair",name:"Repair",source:String(registered.heal.source||"").replace(/heal/g,"repair")};delete registered.heal;for(const key of Object.keys(registered)){if(spellDefinitions[key])registered[key]={...registered[key],mpCost:spellDefinitions[key].mpCost,power:spellDefinitions[key].power||0,heal:spellDefinitions[key].heal||0}}state.registeredSpells=Object.assign(Object.create(null),registered);state.unlockedSpellbooks={fire:true,repair:Boolean(data?.unlockedSpellbooks?.repair||registered.repair)};state.spellSlots=[];updateComputer()}

  ensureComputerUi();
  window.SpellGame03={$,screens,state,interpreter,spellDefinitions,partySpecies,itemDefinitions,START_LEVEL,SPELL_SLOT_COUNT,START_MONEY,calculateStats,getMemberStats,maxMpFor,expToNext,addExp,serializeParty,restoreParty,serializeItems,restoreItems,inventoryCount,addItem,removeItem,buyItem,equipItem,unequipItem,useItem,isSpellEquipped,getEquippedSpell,equipSpell,unequipSlot,isSpellbookUnlocked,isSpellLearned,unlockSpellbook,showScreen,openComputer,openWorkshop,updateComputer,updateWorkshop:updateComputer,magicReady,serializeMagic,restoreMagic,normalizeVitals};
  $("#start-button").addEventListener("click",()=>{resetAll();window.SpellField?.startNewGame()});
  $("#reset-code").addEventListener("click",resetCode);$("#run-code").addEventListener("click",runCode);$("#back-workshop").addEventListener("click",()=>{if(state.selectedSpellKey)state.drafts[state.selectedSpellKey]=$("#code-editor").value;openComputer()});$("#return-field").addEventListener("click",()=>window.SpellField?.returnFromWorkshop());
  resetAll();
})();