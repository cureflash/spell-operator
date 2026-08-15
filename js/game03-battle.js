(() => {
  "use strict";
  const G=window.SpellGame03,$=G.$,state=G.state,delay=ms=>new Promise(r=>setTimeout(r,ms));

  const enemyTemplate={name:"グリッチスライム",level:7,baseStats:{hp:70,attack:60,defense:55,spAttack:40,spDefense:50,speed:30},expYield:180,moneyYield:120,symbol:"●"};
  const PHYSICAL_POWER={sophie:45,lumiere:40,enemy:40};
  const STAT_LABELS={hp:"HP",attack:"攻撃",defense:"防御",spAttack:"特攻",spDefense:"特防",speed:"素早さ"};
  let lastStart=null;
  let magicCaster=null;
  const log=t=>$("#battle-log").textContent=t;
  const memberName=key=>key==="sophie"?"ソフィー":"ルミエル";

  function ensureBattleUi(){
    const sm=$("#sophie-menu");
    if(sm&&!$("#sophie-magic")){
      const btn=document.createElement("button");btn.id="sophie-magic";btn.className="command";btn.textContent="まほう";
      const defend=$("#sophie-defend");sm.insertBefore(btn,defend||null);
    }
    const lm=$("#lumiere-menu");if(lm&&!$("#lumiere-fight")){const btn=document.createElement("button");btn.id="lumiere-fight";btn.className="command";btn.textContent="たたかう";lm.insertBefore(btn,lm.firstChild)}
    const rows=document.querySelectorAll(".party-status-row");
    if(rows[0]&&!$("#sophie-mp-bar")){
      const line=document.createElement("div");line.className="status-line mp";
      line.innerHTML='<span>MP</span><div class="bar"><div id="sophie-mp-bar" class="bar-fill"></div></div><strong id="sophie-mp-text">0/0</strong>';
      rows[0].appendChild(line);
    }
    const names=document.querySelectorAll(".party-name");if(names[0])names[0].id="sophie-battle-name";if(names[1])names[1].id="lumiere-battle-name";
    const card=document.querySelector("#screen-clear .clear-card");
    if(card&&!$("#clear-level-up")){const div=document.createElement("div");div.id="clear-level-up";div.className="level-up-message";const summary=card.querySelector(".clear-summary");card.insertBefore(div,summary||card.lastChild)}
    if(card&&!$("#clear-money")){const p=document.createElement("p");p.id="clear-money";p.className="clear-money";const summary=card.querySelector(".clear-summary");card.insertBefore(p,summary||card.lastChild)}
  }

  function menu(name){["#sophie-menu","#lumiere-menu","#magic-menu","#heal-target-menu"].forEach(id=>$(id).classList.add("hidden"));if(name==="sophie")$("#sophie-menu").classList.remove("hidden");if(name==="lumiere")$("#lumiere-menu").classList.remove("hidden");if(name==="magic")$("#magic-menu").classList.remove("hidden");if(name==="heal")$("#heal-target-menu").classList.remove("hidden")}
  function bar(b,t,v,m){v=Math.max(0,v);$(b).style.width=`${Math.max(0,Math.min(100,v/m*100))}%`;$(t).textContent=`${v}/${m}`}
  function render(){
    const b=state.battle;if(!b)return;
    bar("#enemy-hp-bar","#enemy-hp-text",b.enemy.hp,b.enemy.maxHp);
    bar("#sophie-hp-bar","#sophie-hp-text",b.sophie.hp,b.sophie.maxHp);
    bar("#sophie-mp-bar","#sophie-mp-text",b.sophie.mp,b.sophie.maxMp);
    bar("#lumiere-hp-bar","#lumiere-hp-text",b.lumiere.hp,b.lumiere.maxHp);
    bar("#lumiere-mp-bar","#lumiere-mp-text",b.lumiere.mp,b.lumiere.maxMp);
    $("#enemy-name").textContent=`${b.enemy.name} Lv.${b.enemy.level}`;
    const sn=$("#sophie-battle-name"),ln=$("#lumiere-battle-name");if(sn)sn.textContent=`ソフィー Lv.${b.sophie.level}`;if(ln)ln.textContent=`ルミエル Lv.${b.lumiere.level}`;
  }
  function anim(sel,cls){const el=$(sel);el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),650)}

  function makePartyMember(key){
    const progress=state.party[key],species=G.partySpecies[key],stats=G.getMemberStats(key);
    const maxMp=G.maxMpFor(stats,progress.level);
    return {key,name:species.name,level:progress.level,stats,hp:Math.max(0,Math.min(progress.hp,stats.hp)),maxHp:stats.hp,mp:Math.max(0,Math.min(progress.mp,maxMp)),maxMp};
  }
  function makeEnemy(){const stats=G.calculateStats(enemyTemplate.baseStats,enemyTemplate.level);return{...enemyTemplate,stats,hp:stats.hp,maxHp:stats.hp}}
  function syncPartyVitals(){
    const b=state.battle;if(!b)return;
    for(const key of ["sophie","lumiere"]){
      state.party[key].hp=Math.max(0,Math.min(b[key].hp,b[key].maxHp));
      state.party[key].mp=Math.max(0,Math.min(b[key].mp,b[key].maxMp));
    }
  }
  function damageFormula(level,power,attack,defense){const value=Math.floor((((2*level/5+2)*power*attack/Math.max(1,defense))/50)+2);return Math.max(1,value)}
  function physicalDamage(attacker,defender,power){return damageFormula(attacker.level,power,attacker.stats.attack,defender.stats.defense)}
  function magicDamage(attacker,defender,power){return damageFormula(attacker.level,power,attacker.stats.spAttack,defender.stats.spDefense)}

  function startFieldBattle(){
    const fireSpell=G.getEquippedSpell("fire"),healSpell=G.getEquippedSpell("heal");
    if(!fireSpell||!healSpell){window.SpellField?.showDialog({speaker:"lumiere",text:"実戦登録枠に Fire と Heal をセットしてから行こう。"});return false}
    if(state.party.sophie.hp<=0||state.party.lumiere.hp<=0){window.SpellField?.showDialog({speaker:"lumiere",text:"このHPでは戦えないよ。リュックの回復アイテムを使おう。"});return false}
    lastStart="field";magicCaster=null;
    state.battle={enemy:makeEnemy(),sophie:makePartyMember("sophie"),lumiere:makePartyMember("lumiere"),defend:{sophie:false,lumiere:false}};
    state.pendingActions={sophie:null,lumiere:null};state.busy=false;
    $("#enemy-sprite").textContent=state.battle.enemy.symbol;$("#fire-cost").textContent=`MP ${fireSpell.mpCost}`;$("#heal-cost").textContent=`MP ${healSpell.mpCost}`;
    log(`${state.battle.enemy.name}が あらわれた！\nソフィーはどうする？`);menu("sophie");render();G.showScreen("battle");return true;
  }

  function sophie(action){
    if(state.busy)return;
    if(action==="magic"){magicCaster="sophie";log("ソフィーはどの魔法を使う？");menu("magic");return}
    state.pendingActions.sophie={type:action};log(`ソフィー：${action==="fight"?"たたかう":"ぼうぎょ"}\nルミエルはどうする？`);menu("lumiere");
  }
  function lumiere(action){
    if(state.busy)return;
    if(action==="magic"){magicCaster="lumiere";log("ルミエルはどの魔法を使う？");menu("magic");return}
    state.pendingActions.lumiere={type:action};round();
  }
  function mpCheck(caster,spell){
    if(spell&&state.battle[caster].mp>=spell.mpCost)return true;
    log(spell?`MPが足りない！\n${memberName(caster)}は別の行動を選んでください。`:"その魔法は実戦登録されていない。");
    magicCaster=null;menu(caster);return false;
  }
  function finishSpellSelection(caster){
    if(caster==="sophie"){log("ソフィーの行動を決めた。\nルミエルはどうする？");menu("lumiere");}
    else round();
  }
  function fire(){
    const caster=magicCaster,spell=G.getEquippedSpell("fire");if(state.busy||!caster||!mpCheck(caster,spell))return;
    state.pendingActions[caster]={type:"fire"};magicCaster=null;finishSpellSelection(caster);
  }
  function heal(){
    const caster=magicCaster,spell=G.getEquippedSpell("heal");if(state.busy||!caster||!mpCheck(caster,spell))return;
    log(`${memberName(caster)}は Heal を誰に使う？`);menu("heal");
  }
  function healTarget(target){
    if(state.busy||!magicCaster)return;
    const caster=magicCaster;state.pendingActions[caster]={type:"heal",target};magicCaster=null;finishSpellSelection(caster);
  }
  function magicBack(){
    const caster=magicCaster||"lumiere";magicCaster=null;log(`${memberName(caster)}はどうする？`);menu(caster);
  }
  function healBack(){if(!magicCaster)return;log(`${memberName(magicCaster)}はどの魔法を使う？`);menu("magic")}

  async function doMemberAction(key,action){
    const b=state.battle,actor=b[key];if(!actor||actor.hp<=0||!action)return;
    if(action.type==="fight"){
      const dmg=physicalDamage(actor,b.enemy,PHYSICAL_POWER[key]);b.enemy.hp-=dmg;anim(key==="sophie"?".sophie-battle":".lumiere-battle","cast");anim("#enemy-sprite","hit");
      const tail=key==="lumiere"?"\n……あまり効いていない。":"";log(`${memberName(key)}の こうげき！\n${b.enemy.name}に ${dmg} のダメージ！${tail}`);render();await delay(500);return;
    }
    if(action.type==="fire"){
      const s=G.getEquippedSpell("fire");if(!s)return;const dmg=magicDamage(actor,b.enemy,s.power||60);actor.mp-=s.mpCost;b.enemy.hp-=dmg;
      anim(key==="sophie"?".sophie-battle":".lumiere-battle","cast");anim("#enemy-sprite","hit");
      log(`${memberName(key)}は 自作魔法 Fire を実行した！\n${b.enemy.name}に ${dmg} のダメージ！\nMP ${s.mpCost} 消費（${s.steps} steps）。`);render();await delay(600);return;
    }
    if(action.type==="heal"){
      const s=G.getEquippedSpell("heal");if(!s)return;const t=b[action.target],before=t.hp;t.hp=Math.min(t.maxHp,t.hp+s.heal);actor.mp-=s.mpCost;
      anim(key==="sophie"?".sophie-battle":".lumiere-battle","cast");
      log(`${memberName(key)}は 自作魔法 Heal を実行した！\n${memberName(action.target)}のHPが ${t.hp-before} 回復した。\nMP ${s.mpCost} 消費（${s.steps} steps）。`);render();await delay(600);return;
    }
    log(`${memberName(key)}は みをまもっている。`);await delay(300);
  }
  async function doEnemyAction(){const b=state.battle;if(b.enemy.hp<=0)return;const candidates=["sophie","lumiere"].filter(k=>b[k].hp>0);if(!candidates.length)return;const target=candidates[Math.floor(Math.random()*candidates.length)];let dmg=physicalDamage(b.enemy,b[target],PHYSICAL_POWER.enemy);if(b.defend[target])dmg=Math.max(1,Math.ceil(dmg/2));b[target].hp-=dmg;anim(target==="sophie"?".sophie-battle":".lumiere-battle","hit");log(`${b.enemy.name}の こうげき！\n${memberName(target)}は ${dmg} のダメージをうけた。`);render();await delay(560)}

  function growthData(key,beforeLevel,afterLevel){
    const species=G.partySpecies[key],before=G.calculateStats(species.baseStats,beforeLevel),after=G.calculateStats(species.baseStats,afterLevel),growth=Object.keys(STAT_LABELS).map(stat=>[STAT_LABELS[stat],after[stat]-before[stat]]).filter(([,value])=>value>0);
    const beforeMp=G.maxMpFor(before,beforeLevel),afterMp=G.maxMpFor(after,afterLevel);if(afterMp>beforeMp)growth.splice(1,0,["MP",afterMp-beforeMp]);return growth;
  }
  function growthCard(key,result,beforeLevel){const name=G.partySpecies[key].name,progress=state.party[key];if(!result.levels)return `<div class="growth-card"><div class="growth-title">${name} Lv.${progress.level}</div><div class="growth-exp">EXP ${progress.exp} / ${G.expToNext(progress.level)}</div></div>`;const gains=growthData(key,beforeLevel,progress.level).map(([label,value])=>`<span>${label} +${value}</span>`).join("");return `<div class="growth-card"><div class="growth-title">${name}は Lv.${progress.level} に上がった！</div><div class="growth-stats">${gains}</div><div class="growth-exp">EXP ${progress.exp} / ${G.expToNext(progress.level)}</div></div>`}

  async function win(){
    const b=state.battle,exp=b.enemy.expYield,money=b.enemy.moneyYield,beforeS=state.party.sophie.level,beforeL=state.party.lumiere.level;
    const oldSMax=b.sophie.maxHp,oldLMax=b.lumiere.maxHp,oldSMp=b.sophie.maxMp,oldLMp=b.lumiere.maxMp;
    syncPartyVitals();
    const s=G.addExp("sophie",exp),l=G.addExp("lumiere",exp);
    const newS=G.getMemberStats("sophie"),newL=G.getMemberStats("lumiere"),newSMp=G.maxMpFor(newS,state.party.sophie.level),newLMp=G.maxMpFor(newL,state.party.lumiere.level);
    state.party.sophie.hp=Math.min(newS.hp,state.party.sophie.hp+Math.max(0,newS.hp-oldSMax));
    state.party.lumiere.hp=Math.min(newL.hp,state.party.lumiere.hp+Math.max(0,newL.hp-oldLMax));
    state.party.sophie.mp=Math.min(newSMp,state.party.sophie.mp+Math.max(0,newSMp-oldSMp));
    state.party.lumiere.mp=Math.min(newLMp,state.party.lumiere.mp+Math.max(0,newLMp-oldLMp));
    state.money+=money;
    const levelEl=$("#clear-level-up");if(levelEl)levelEl.innerHTML=`<div class="level-up-summary">${exp} EXPを獲得！</div>${growthCard("sophie",s,beforeS)}${growthCard("lumiere",l,beforeL)}`;
    const moneyEl=$("#clear-money");if(moneyEl)moneyEl.textContent=`${money} Gを手に入れた！　所持金 ${state.money} G`;
    state.busy=false;const fire=G.getEquippedSpell("fire"),heal=G.getEquippedSpell("heal");$("#clear-fire-mp").textContent=fire?.mpCost??"—";$("#clear-heal-mp").textContent=heal?.mpCost??"—";window.SpellMenu?.renderStatus?.();window.SpellMenu?.renderFieldMenu?.();G.showScreen("clear");
  }

  async function round(){
    if(state.busy||!state.battle)return;state.busy=true;const b=state.battle,sa=state.pendingActions.sophie,la=state.pendingActions.lumiere;b.defend.sophie=sa?.type==="defend";b.defend.lumiere=la?.type==="defend";menu("none");
    const queue=[{actor:"sophie",speed:b.sophie.stats.speed,run:()=>doMemberAction("sophie",sa)},{actor:"lumiere",speed:b.lumiere.stats.speed,run:()=>doMemberAction("lumiere",la)},{actor:"enemy",speed:b.enemy.stats.speed,run:()=>doEnemyAction()}].sort((a,c)=>c.speed-a.speed);
    for(const item of queue){if(b.enemy.hp<=0)return win();if(b.sophie.hp<=0||b.lumiere.hp<=0)break;await item.run()}
    if(b.enemy.hp<=0)return win();
    if(b.sophie.hp<=0||b.lumiere.hp<=0){syncPartyVitals();state.busy=false;window.SpellMenu?.renderStatus?.();G.showScreen("defeat");return}
    state.pendingActions={sophie:null,lumiere:null};state.busy=false;log("次のターン。\nソフィーはどうする？");menu("sophie");
  }

  ensureBattleUi();
  $("#sophie-fight").addEventListener("click",()=>sophie("fight"));$("#sophie-magic").addEventListener("click",()=>sophie("magic"));$("#sophie-defend").addEventListener("click",()=>sophie("defend"));
  $("#lumiere-fight").addEventListener("click",()=>lumiere("fight"));$("#lumiere-magic").addEventListener("click",()=>lumiere("magic"));$("#lumiere-defend").addEventListener("click",()=>lumiere("defend"));
  $("#cast-fire").addEventListener("click",fire);$("#cast-heal").addEventListener("click",heal);$("#magic-back").addEventListener("click",magicBack);
  $("#heal-sophie").addEventListener("click",()=>healTarget("sophie"));$("#heal-lumiere").addEventListener("click",()=>healTarget("lumiere"));$("#heal-back").addEventListener("click",healBack);
  $("#retry-battle").addEventListener("click",()=>{if(lastStart==="field")startFieldBattle()});$("#defeat-workshop").addEventListener("click",G.openWorkshop);$("#clear-field").addEventListener("click",()=>window.SpellField?.onBattleWon());
  G.startFieldBattle=startFieldBattle;
})();