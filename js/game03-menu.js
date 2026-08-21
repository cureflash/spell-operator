(() => {
  "use strict";
  const G=window.SpellGame03,$=G.$,state=G.state;
  let fieldMenuOpen=false,fieldMenuIndex=0;
  const fieldMenuItems=[
    {label:"ステータス",action:()=>{closeFieldMenu();openStatus();}},
    {label:"リュック",action:()=>{closeFieldMenu();window.SpellItems?.openBackpack?.();}},
    {label:"パソコン",action:()=>{closeFieldMenu();G.openComputer?.();}},
    {label:"セーブ",action:()=>{closeFieldMenu();window.SpellField?.saveGame?.();}},
    {label:"とじる",action:()=>closeFieldMenu()}
  ];

  function ensureUi(){
    const tools=document.querySelector(".field-tools");if(tools&&!$("#field-menu")){const b=document.createElement("button");b.id="field-menu";b.className="mini-button";b.textContent="MENU";tools.insertBefore(b,tools.firstChild)}
    const fieldWindow=document.querySelector("#screen-field .field-window");if(fieldWindow&&!$("#field-main-menu")){const menu=document.createElement("div");menu.id="field-main-menu";menu.className="field-main-menu hidden";menu.setAttribute("role","menu");menu.innerHTML=`<div class="field-main-menu-title">MENU</div><div id="field-menu-money" class="field-main-menu-money">0 G</div><div id="field-main-menu-items" class="field-main-menu-items"></div><div class="field-main-menu-help">↑↓ 選択　Z 決定　Enter 閉じる</div>`;fieldWindow.appendChild(menu)}
    const help=document.querySelector("#screen-field .field-help");if(help&&!help.querySelector("[data-menu-help]")){const span=document.createElement("span");span.dataset.menuHelp="1";span.textContent="メニュー：Enter";help.appendChild(span)}
    const main=document.querySelector("main.shell");if(main&&!$("#screen-status")){const section=document.createElement("section");section.id="screen-status";section.className="screen";section.innerHTML=`<div class="status-screen-wrap"><div class="status-toolbar"><div><p class="kicker">PARTY STATUS</p><h2>ステータス</h2></div><button id="status-back" class="secondary">フィールドへ戻る</button></div><div id="status-grid" class="status-grid"></div></div>`;main.insertBefore(section,$("#screen-hub")||null);G.screens.status=section}
    $("#spell-loadout")?.remove();
  }
  function renderFieldMenu(){const box=$("#field-main-menu-items");if(!box)return;const money=$("#field-menu-money");if(money)money.textContent=`${state.money} G`;box.innerHTML=fieldMenuItems.map((item,index)=>`<button type="button" class="field-main-menu-item${index===fieldMenuIndex?" selected":""}" data-field-menu-index="${index}"><span class="menu-cursor">▶</span><span>${item.label}</span></button>`).join("")}
  function fieldScreenActive(){return Boolean(G.screens.field?.classList.contains("active"))}
  function dialogIsOpen(){const d=$("#field-dialog");return Boolean(d&&!d.classList.contains("hidden"))}
  function storyOverlayIsOpen(){return Boolean(window.SpellStory?.isOverlayOpen?.())}
  function isOpen(){return fieldMenuOpen}
  function openFieldMenu(){if(!fieldScreenActive()||dialogIsOpen()||storyOverlayIsOpen())return;fieldMenuOpen=true;fieldMenuIndex=0;renderFieldMenu();$("#field-main-menu")?.classList.remove("hidden")}
  function closeFieldMenu(){fieldMenuOpen=false;$("#field-main-menu")?.classList.add("hidden")}
  function toggleFieldMenu(){fieldMenuOpen?closeFieldMenu():openFieldMenu()}
  function moveFieldMenu(delta){fieldMenuIndex=(fieldMenuIndex+delta+fieldMenuItems.length)%fieldMenuItems.length;renderFieldMenu()}
  function activateFieldMenu(index=fieldMenuIndex){fieldMenuItems[index]?.action?.()}
  function statRows(stats,key){const p=state.party[key],rows=[["HP",`${p.hp} / ${stats.hp}`],["MP",`${p.mp} / ${G.maxMpFor(stats,p.level)}`],["攻撃",stats.attack],["防御",stats.defense],["特攻",stats.spAttack],["特防",stats.spDefense],["素早さ",stats.speed]];return rows.map(([name,value])=>`<div><dt>${name}</dt><dd>${value}</dd></div>`).join("")}
  function memberCard(key){const progress=state.party[key],species=G.partySpecies[key],stats=G.getMemberStats(key),next=G.expToNext(progress.level),pct=Math.max(0,Math.min(100,(progress.exp/next)*100)),equipKey=state.equipment[key],equip=G.itemDefinitions[equipKey],equipText=equip?`${equip.name}（${equip.description}）`:"装備なし";return `<article class="status-card"><div class="status-card-head"><h3>${species.name}</h3><span class="status-level">Lv.${progress.level}</span></div><dl class="status-stats">${statRows(stats,key)}</dl><div class="status-equipment"><strong>装備</strong><span>${equipText}</span></div><div class="status-exp"><div class="status-exp-row"><span>EXP</span><span>${progress.exp} / ${next}</span></div><div class="exp-bar"><div class="exp-bar-fill" style="width:${pct}%"></div></div></div></article>`}
  function renderStatus(){const grid=$("#status-grid");if(grid)grid.innerHTML=memberCard("sophie")+memberCard("lumiere")}
  function renderLoadout(){$("#spell-loadout")?.remove()}
  function openStatus(){renderStatus();G.showScreen("status")}
  function closeStatus(){G.showScreen("field")}
  function openPluginPrompt(){
    if(!fieldScreenActive()||dialogIsOpen()||storyOverlayIsOpen()||fieldMenuOpen)return false;
    const dialog=$("#field-dialog");
    if(!dialog||!window.SpellField?.showDialog)return false;
    dialog.dataset.pluginPrompt="1";
    window.SpellField.showDialog({
      speaker:"sophie",
      text:"プラグイン！ルミエル.EXE トランスミッション！",
      typing:{allowSkip:true}
    });
    return true;
  }
  function continuePlugin(){
    const dialog=$("#field-dialog");
    if(!dialog||dialog.dataset.pluginPrompt!=="1"||!dialogIsOpen())return false;
    delete dialog.dataset.pluginPrompt;
    $("#field-action")?.click();
    G.openComputer?.();
    return true;
  }
  function isZKey(e){return e.code==="KeyZ"||e.key==="z"||e.key==="Z"}
  function isXKey(e){return e.code==="KeyX"||e.key==="x"||e.key==="X"}
  function isEnterKey(e){return e.key==="Enter"||e.code==="Enter"||e.code==="NumpadEnter"}
  function onFieldMenuKeydown(event){if(storyOverlayIsOpen())return;if(fieldMenuOpen){if(isEnterKey(event)||event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();closeFieldMenu();return}if(event.key==="ArrowUp"||event.key==="w"||event.key==="W"){event.preventDefault();event.stopImmediatePropagation();moveFieldMenu(-1);return}if(event.key==="ArrowDown"||event.key==="s"||event.key==="S"){event.preventDefault();event.stopImmediatePropagation();moveFieldMenu(1);return}if(isZKey(event)){event.preventDefault();event.stopImmediatePropagation();activateFieldMenu();return}event.preventDefault();event.stopImmediatePropagation();return}if(!fieldScreenActive())return;if(isXKey(event)){if(openPluginPrompt()){event.preventDefault();event.stopImmediatePropagation()}return}if(isZKey(event)&&window.SpellDialogTyping?.handleAdvance?.()){event.preventDefault();event.stopImmediatePropagation();return}if(isZKey(event)&&continuePlugin()){event.preventDefault();event.stopImmediatePropagation();return}if(isEnterKey(event)){event.preventDefault();event.stopImmediatePropagation();if(!dialogIsOpen())openFieldMenu();return}if(isZKey(event)){event.preventDefault();event.stopImmediatePropagation();$("#field-action")?.click()}}
  ensureUi();
  $("#field-menu")?.addEventListener("click",toggleFieldMenu);$("#field-main-menu")?.addEventListener("click",event=>{const b=event.target.closest("[data-field-menu-index]");if(!b)return;fieldMenuIndex=Number(b.dataset.fieldMenuIndex)||0;activateFieldMenu(fieldMenuIndex)});$("#status-back")?.addEventListener("click",closeStatus);document.addEventListener("keydown",onFieldMenuKeydown,true);
  window.SpellMenu={renderStatus,renderLoadout,renderFieldMenu,openStatus,openFieldMenu,closeFieldMenu,toggleFieldMenu,isOpen};
})();
