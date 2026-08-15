(() => {
  "use strict";
  const G=window.SpellGame03,$=G.$,state=G.state;

  function ensureUi(){
    const tools=document.querySelector(".field-tools");
    if(tools&&!$("#field-menu")){
      const b=document.createElement("button");
      b.id="field-menu";b.className="mini-button";b.textContent="MENU";
      tools.insertBefore(b,tools.firstChild);
    }

    const main=document.querySelector("main.shell");
    if(main&&!$("#screen-status")){
      const section=document.createElement("section");
      section.id="screen-status";section.className="screen";
      section.innerHTML=`
        <div class="status-screen-wrap">
          <div class="status-toolbar">
            <div><p class="kicker">PARTY STATUS</p><h2>ステータス</h2></div>
            <button id="status-back" class="secondary">フィールドへ戻る</button>
          </div>
          <div id="status-grid" class="status-grid"></div>
        </div>`;
      const hub=$("#screen-hub");
      main.insertBefore(section,hub||null);
      G.screens.status=section;
    }

    const spellGrid=document.querySelector("#screen-hub .spell-grid");
    if(spellGrid&&!$("#spell-loadout")){
      const section=document.createElement("section");
      section.id="spell-loadout";section.className="panel spell-loadout";
      section.innerHTML=`
        <div class="spell-loadout-head">
          <div><p class="eyebrow">BATTLE LOADOUT</p><h3>魔法登録枠</h3></div>
          <span id="loadout-count" class="badge muted">0 / 4</span>
        </div>
        <div id="spell-loadout-slots" class="loadout-slots"></div>
        <div id="known-spell-list" class="known-spells"></div>
        <p id="loadout-message" class="loadout-warning">戦闘で使う魔法を登録枠へセットしてください。</p>`;
      spellGrid.insertAdjacentElement("afterend",section);
    }
  }

  function statRows(stats,key){
    const rows=[
      ["HP",stats.hp],["攻撃",stats.attack],["防御",stats.defense],
      ["特攻",stats.spAttack],["特防",stats.spDefense],["素早さ",stats.speed]
    ];
    if(key==="lumiere")rows.splice(1,0,["MP",G.maxMpFor(stats,state.party[key].level)]);
    return rows.map(([name,value])=>`<div><dt>${name}</dt><dd>${value}</dd></div>`).join("");
  }

  function memberCard(key){
    const progress=state.party[key],species=G.partySpecies[key];
    const stats=G.calculateStats(species.baseStats,progress.level);
    const next=G.expToNext(progress.level);
    const pct=Math.max(0,Math.min(100,(progress.exp/next)*100));
    return `<article class="status-card">
      <div class="status-card-head"><h3>${species.name}</h3><span class="status-level">Lv.${progress.level}</span></div>
      <dl class="status-stats">${statRows(stats,key)}</dl>
      <div class="status-exp">
        <div class="status-exp-row"><span>EXP</span><span>${progress.exp} / ${next}</span></div>
        <div class="exp-bar"><div class="exp-bar-fill" style="width:${pct}%"></div></div>
      </div>
      <p class="status-note">個体値・努力値なし。能力値は種族値とレベルだけで決まります。</p>
    </article>`;
  }

  function renderStatus(){
    const grid=$("#status-grid");if(!grid)return;
    grid.innerHTML=memberCard("sophie")+memberCard("lumiere");
  }

  function renderLoadout(){
    const slots=$("#spell-loadout-slots"),known=$("#known-spell-list");
    if(!slots||!known)return;
    slots.innerHTML=state.spellSlots.map((key,index)=>{
      if(!key)return `<div class="loadout-slot empty"><span class="loadout-slot-number">SLOT ${index+1}</span><span>EMPTY</span></div>`;
      const spell=state.registeredSpells[key];
      return `<div class="loadout-slot"><span class="loadout-slot-number">SLOT ${index+1}</span><div><div class="loadout-spell-name">${spell?.name||key}</div><div class="loadout-spell-meta">MP ${spell?.mpCost??"—"}</div></div><button class="slot-remove" data-remove-slot="${index}">外す</button></div>`;
    }).join("");

    const keys=Object.keys(state.registeredSpells);
    known.innerHTML=keys.length?keys.map(key=>{
      const spell=state.registeredSpells[key],equipped=G.isSpellEquipped(key);
      return `<div class="known-spell"><strong>${spell.name}</strong><span>MP ${spell.mpCost}</span><button class="secondary compact" data-equip-spell="${key}" ${equipped?"disabled":""}>${equipped?"登録中":"セット"}</button></div>`;
    }).join(""):`<span class="muted">開発済みの魔法はまだありません。</span>`;

    const count=state.spellSlots.filter(Boolean).length;
    const badge=$("#loadout-count");if(badge){badge.textContent=`${count} / 4`;badge.className=`badge ${count?"success":"muted"}`;}
    const msg=$("#loadout-message");
    if(msg){
      const ready=G.magicReady();
      msg.textContent=ready?"Fire と Heal が実戦登録されています。":"この試作戦闘では Fire と Heal の両方を登録枠へセットしてください。";
      msg.className=ready?"loadout-warning loadout-ready":"loadout-warning";
    }
  }

  function openStatus(){renderStatus();G.showScreen("status")}
  function closeStatus(){G.showScreen("field")}

  ensureUi();
  $("#field-menu")?.addEventListener("click",openStatus);
  $("#status-back")?.addEventListener("click",closeStatus);
  $("#spell-loadout")?.addEventListener("click",event=>{
    const remove=event.target.closest("[data-remove-slot]");
    if(remove){G.unequipSlot(Number(remove.dataset.removeSlot));renderLoadout();return;}
    const equip=event.target.closest("[data-equip-spell]");
    if(equip){G.equipSpell(equip.dataset.equipSpell);renderLoadout();}
  });

  window.SpellMenu={renderStatus,renderLoadout,openStatus};
  renderLoadout();
})();
