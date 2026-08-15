(() => {
  "use strict";
  const G=window.SpellGame03,$=G.$,state=G.state;
  let fieldMenuOpen=false;
  let fieldMenuIndex=0;

  const fieldMenuItems=[
    {label:"ステータス",action:()=>{closeFieldMenu();openStatus();}},
    {label:"リュック",action:()=>{closeFieldMenu();window.SpellItems?.openBackpack?.();}},
    {label:"セーブ",action:()=>{closeFieldMenu();window.SpellField?.saveGame?.();}},
    {label:"とじる",action:()=>closeFieldMenu()}
  ];

  function ensureUi(){
    const tools=document.querySelector(".field-tools");
    if(tools&&!$("#field-menu")){const b=document.createElement("button");b.id="field-menu";b.className="mini-button";b.textContent="MENU";tools.insertBefore(b,tools.firstChild)}
    const fieldWindow=document.querySelector("#screen-field .field-window");
    if(fieldWindow&&!$("#field-main-menu")){
      const menu=document.createElement("div");menu.id="field-main-menu";menu.className="field-main-menu hidden";menu.setAttribute("role","menu");menu.setAttribute("aria-label","フィールドメニュー");
      menu.innerHTML=`<div class="field-main-menu-title">MENU</div><div id="field-menu-money" class="field-main-menu-money">0 G</div><div id="field-main-menu-items" class="field-main-menu-items"></div><div class="field-main-menu-help">↑↓ 選択　Enter 決定　Z 閉じる</div>`;fieldWindow.appendChild(menu);
    }
    const help=document.querySelector("#screen-field .field-help");if(help&&!help.querySelector("[data-menu-help]")){const span=document.createElement("span");span.dataset.menuHelp="1";span.textContent="メニュー：Z";help.appendChild(span)}
    const main=document.querySelector("main.shell");
    if(main&&!$("#screen-status")){
      const section=document.createElement("section");section.id="screen-status";section.className="screen";
      section.innerHTML=`<div class="status-screen-wrap"><div class="status-toolbar"><div><p class="kicker">PARTY STATUS</p><h2>ステータス</h2></div><button id="status-back" class="secondary">フィールドへ戻る</button></div><div id="status-grid" class="status-grid"></div></div>`;
      const hub=$("#screen-hub");main.insertBefore(section,hub||null);G.screens.status=section;
    }
    const spellGrid=document.querySelector("#screen-hub .spell-grid");
    if(spellGrid&&!$("#spell-loadout")){
      const section=document.createElement("section");section.id="spell-loadout";section.className="panel spell-loadout";
      section.innerHTML=`<div class="spell-loadout-head"><div><p class="eyebrow">BATTLE LOADOUT</p><h3>魔法登録枠</h3></div><span id="loadout-count" class="badge muted">0 / 4</span></div><div id="spell-loadout-slots" class="loadout-slots"></div><div id="known-spell-list" class="known-spells"></div><p id="loadout-message" class="loadout-warning">戦闘で使う魔法を登録枠へセットしてください。</p>`;
      spellGrid.insertAdjacentElement("afterend",section);
    }
  }

  function renderFieldMenu(){
    const box=$("#field-main-menu-items");if(!box)return;
    const money=$("#field-menu-money");if(money)money.textContent=`${state.money} G`;
    box.innerHTML=fieldMenuItems.map((item,index)=>`<button type="button" class="field-main-menu-item${index===fieldMenuIndex?" selected":""}" data-field-menu-index="${index}" role="menuitem"><span class="menu-cursor">▶</span><span>${item.label}</span></button>`).join("");
  }

  function fieldScreenActive(){return Boolean(G.screens.field?.classList.contains("active"))}
  function dialogIsOpen(){const dialog=$("#field-dialog");return Boolean(dialog&&!dialog.classList.contains("hidden"))}
  function isOpen(){return fieldMenuOpen}
  function openFieldMenu(){if(!fieldScreenActive()||dialogIsOpen())return;fieldMenuOpen=true;fieldMenuIndex=0;renderFieldMenu();$("#field-main-menu")?.classList.remove("hidden")}
  function closeFieldMenu(){fieldMenuOpen=false;$("#field-main-menu")?.classList.add("hidden")}
  function toggleFieldMenu(){fieldMenuOpen?closeFieldMenu():openFieldMenu()}
  function moveFieldMenu(delta){fieldMenuIndex=(fieldMenuIndex+delta+fieldMenuItems.length)%fieldMenuItems.length;renderFieldMenu()}
  function activateFieldMenu(index=fieldMenuIndex){const item=fieldMenuItems[index];if(item)item.action()}

  function statRows(stats,key){
    const p=state.party[key];
    const rows=[["HP",`${p.hp} / ${stats.hp}`],["MP",`${p.mp} / ${G.maxMpFor(stats,p.level)}`],["攻撃",stats.attack],["防御",stats.defense],["特攻",stats.spAttack],["特防",stats.spDefense],["素早さ",stats.speed]];
    return rows.map(([name,value])=>`<div><dt>${name}</dt><dd>${value}</dd></div>`).join("");
  }
  function memberCard(key){
    const progress=state.party[key],species=G.partySpecies[key],stats=G.getMemberStats(key),next=G.expToNext(progress.level),pct=Math.max(0,Math.min(100,(progress.exp/next)*100));
    const equipKey=state.equipment[key],equip=G.itemDefinitions[equipKey];
    const equipText=equip?`${equip.name}（${equip.description}）`:"装備なし";
    return `<article class="status-card"><div class="status-card-head"><h3>${species.name}</h3><span class="status-level">Lv.${progress.level}</span></div><dl class="status-stats">${statRows(stats,key)}</dl><div class="status-equipment"><strong>装備</strong><span>${equipText}</span></div><div class="status-exp"><div class="status-exp-row"><span>EXP</span><span>${progress.exp} / ${next}</span></div><div class="exp-bar"><div class="exp-bar-fill" style="width:${pct}%"></div></div></div><p class="status-note">個体値・努力値なし。能力値は種族値・レベル・装備補正で決まります。</p></article>`;
  }
  function renderStatus(){const grid=$("#status-grid");if(grid)grid.innerHTML=memberCard("sophie")+memberCard("lumiere")}

  function renderLoadout(){
    const slots=$("#spell-loadout-slots"),known=$("#known-spell-list");if(!slots||!known)return;
    slots.innerHTML=state.spellSlots.map((key,index)=>{if(!key)return `<div class="loadout-slot empty"><span class="loadout-slot-number">SLOT ${index+1}</span><span>EMPTY</span></div>`;const spell=state.registeredSpells[key];return `<div class="loadout-slot"><span class="loadout-slot-number">SLOT ${index+1}</span><div><div class="loadout-spell-name">${spell?.name||key}</div><div class="loadout-spell-meta">MP ${spell?.mpCost??"—"}</div></div><button class="slot-remove" data-remove-slot="${index}">外す</button></div>`}).join("");
    const keys=Object.keys(state.registeredSpells);known.innerHTML=keys.length?keys.map(key=>{const spell=state.registeredSpells[key],equipped=G.isSpellEquipped(key);return `<div class="known-spell"><strong>${spell.name}</strong><span>MP ${spell.mpCost}</span><button class="secondary compact" data-equip-spell="${key}" ${equipped?"disabled":""}>${equipped?"登録中":"セット"}</button></div>`}).join(""):`<span class="muted">開発済みの魔法はまだありません。</span>`;
    const count=state.spellSlots.filter(Boolean).length,badge=$("#loadout-count");if(badge){badge.textContent=`${count} / 4`;badge.className=`badge ${count?"success":"muted"}`}
    const msg=$("#loadout-message");if(msg){const ready=G.magicReady();msg.textContent=ready?"Fire と Heal が実戦登録されています。":"この試作戦闘では Fire と Heal の両方を登録枠へセットしてください。";msg.className=ready?"loadout-warning loadout-ready":"loadout-warning"}
  }

  function openStatus(){renderStatus();G.showScreen("status")}
  function closeStatus(){G.showScreen("field")}
  function isZKey(event){return event.code==="KeyZ"||event.key==="z"||event.key==="Z"}
  function onFieldMenuKeydown(event){
    if(fieldMenuOpen){
      if(isZKey(event)||event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();closeFieldMenu();return}
      if(event.key==="ArrowUp"||event.key==="w"||event.key==="W"){event.preventDefault();event.stopImmediatePropagation();moveFieldMenu(-1);return}
      if(event.key==="ArrowDown"||event.key==="s"||event.key==="S"){event.preventDefault();event.stopImmediatePropagation();moveFieldMenu(1);return}
      if(event.key==="Enter"||event.code==="Enter"||event.code==="NumpadEnter"){event.preventDefault();event.stopImmediatePropagation();activateFieldMenu();return}
      event.preventDefault();event.stopImmediatePropagation();return;
    }
    if(fieldScreenActive()&&isZKey(event)&&!dialogIsOpen()){event.preventDefault();event.stopImmediatePropagation();openFieldMenu()}
  }

  ensureUi();
  $("#field-menu")?.addEventListener("click",toggleFieldMenu);
  $("#field-main-menu")?.addEventListener("click",event=>{const button=event.target.closest("[data-field-menu-index]");if(!button)return;fieldMenuIndex=Number(button.dataset.fieldMenuIndex)||0;activateFieldMenu(fieldMenuIndex)});
  $("#status-back")?.addEventListener("click",closeStatus);
  $("#spell-loadout")?.addEventListener("click",event=>{const remove=event.target.closest("[data-remove-slot]");if(remove){G.unequipSlot(Number(remove.dataset.removeSlot));renderLoadout();return}const equip=event.target.closest("[data-equip-spell]");if(equip){G.equipSpell(equip.dataset.equipSpell);renderLoadout()}});
  document.addEventListener("keydown",onFieldMenuKeydown,true);

  window.SpellMenu={renderStatus,renderLoadout,renderFieldMenu,openStatus,openFieldMenu,closeFieldMenu,toggleFieldMenu,isOpen};renderLoadout();
})();