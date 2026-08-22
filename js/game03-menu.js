(() => {
  "use strict";
  const G=window.SpellGame03,$=G.$,state=G.state;
  let fieldMenuOpen=false,fieldMenuIndex=0,fieldMenuMode="main";
  let pendingTravel=null,travelCasting=false;

  const fieldMenuItems=[
    {label:"ステータス",action:()=>{closeFieldMenu();openStatus();}},
    {label:"リュック",action:()=>{closeFieldMenu();window.SpellItems?.openBackpack?.();}},
    {label:"イードウ",action:()=>openTravelMenu()},
    {label:"設定",action:()=>openSettingsMenu()},
    {label:"パソコン",action:()=>{closeFieldMenu();G.openComputer?.();}},
    {label:"セーブ",action:()=>{closeFieldMenu();window.SpellField?.saveGame?.();}},
    {label:"とじる",action:()=>closeFieldMenu()}
  ];
  const travelMenuItems=[
    {label:"フルール村",action:()=>requestTravel("town","フルール村")},
    {label:"ラメールシティ",action:()=>requestTravel("la_mer_city","ラメールシティ")}
  ];
  const travelConfirmItems=[
    {label:"はい",action:()=>confirmTravel()},
    {label:"いいえ",action:()=>cancelTravel()}
  ];

  function settingsMenuItems(){
    const audio=window.SpellAudioSettings?.snapshot?.()||{bgm:.5,sfx:.5};
    const pct=value=>`${Math.round(value*100)}%`;
    return[
      {label:`BGM音量　${pct(audio.bgm)}`,setting:"bgm"},
      {label:`SE音量　 ${pct(audio.sfx)}`,setting:"sfx"},
      {label:"音量を初期値に戻す",action:()=>{window.SpellAudioSettings?.reset?.();renderFieldMenu();}},
      {label:"戻る",action:()=>returnFromSubMenu()}
    ];
  }
  function activeFieldMenuItems(){if(fieldMenuMode==="travel")return travelMenuItems;if(fieldMenuMode==="travel-confirm")return travelConfirmItems;if(fieldMenuMode==="settings")return settingsMenuItems();return fieldMenuItems}

  function ensureUi(){
    const tools=document.querySelector(".field-tools");if(tools&&!$("#field-menu")){const b=document.createElement("button");b.id="field-menu";b.className="mini-button";b.textContent="MENU";tools.insertBefore(b,tools.firstChild)}
    const fieldWindow=document.querySelector("#screen-field .field-window");if(fieldWindow&&!$("#field-main-menu")){const menu=document.createElement("div");menu.id="field-main-menu";menu.className="field-main-menu hidden";menu.setAttribute("role","menu");menu.innerHTML=`<div class="field-main-menu-title">MENU</div><div id="field-menu-money" class="field-main-menu-money">0 G</div><div id="field-main-menu-items" class="field-main-menu-items"></div><div class="field-main-menu-help">↑↓ 選択　Z 決定　Enter 閉じる</div>`;fieldWindow.appendChild(menu)}
    const help=document.querySelector("#screen-field .field-help");if(help&&!help.querySelector("[data-menu-help]")){const span=document.createElement("span");span.dataset.menuHelp="1";span.textContent="メニュー：Enter";help.appendChild(span)}
    const main=document.querySelector("main.shell");if(main&&!$("#screen-status")){const section=document.createElement("section");section.id="screen-status";section.className="screen";section.innerHTML=`<div class="status-screen-wrap"><div class="status-toolbar"><div><p class="kicker">PARTY STATUS</p><h2>ステータス</h2></div><button id="status-back" class="secondary">フィールドへ戻る</button></div><div id="status-grid" class="status-grid"></div></div>`;main.insertBefore(section,$("#screen-hub")||null);G.screens.status=section}
    if(!$("#ido-fade")){
      const fade=document.createElement("div");fade.id="ido-fade";fade.className="ido-fade";fade.setAttribute("aria-hidden","true");document.body.appendChild(fade);
      const style=document.createElement("style");style.textContent=`.ido-fade{position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:9999;transition:opacity .36s ease}.ido-fade.active{opacity:1;pointer-events:auto}`;document.head.appendChild(style);
    }
    $("#spell-loadout")?.remove();
  }

  function renderFieldMenu(){
    const box=$("#field-main-menu-items");if(!box)return;
    const items=activeFieldMenuItems(),money=$("#field-menu-money"),title=$("#field-main-menu .field-main-menu-title"),help=$("#field-main-menu .field-main-menu-help");
    if(money)money.textContent=`${state.money} G`;
    if(title)title.textContent=fieldMenuMode==="travel"||fieldMenuMode==="travel-confirm"?"イードウ":fieldMenuMode==="settings"?"設定":"MENU";
    if(help)help.textContent=fieldMenuMode==="travel"?"↑↓ 選択　Z 決定　Enter 戻る":fieldMenuMode==="travel-confirm"?"↑↓ 選択　Z 決定":fieldMenuMode==="settings"?"↑↓ 選択　←→ 音量変更　Z 決定　Enter 戻る":"↑↓ 選択　Z 決定　Enter 閉じる";
    box.innerHTML=items.map((item,index)=>`<button type="button" class="field-main-menu-item${index===fieldMenuIndex?" selected":""}" data-field-menu-index="${index}"><span class="menu-cursor">▶</span><span>${item.label}</span></button>`).join("");
  }
  function fieldScreenActive(){return Boolean(G.screens.field?.classList.contains("active"))}
  function dialogIsOpen(){const d=$("#field-dialog");return Boolean(d&&!d.classList.contains("hidden"))}
  function storyOverlayIsOpen(){return Boolean(window.SpellStory?.isOverlayOpen?.())}
  function isOpen(){return fieldMenuOpen||travelCasting}
  function openFieldMenu(){if(!fieldScreenActive()||dialogIsOpen()||storyOverlayIsOpen()||travelCasting)return;fieldMenuOpen=true;fieldMenuMode="main";fieldMenuIndex=0;renderFieldMenu();$("#field-main-menu")?.classList.remove("hidden")}
  function closeFieldMenu(){fieldMenuOpen=false;fieldMenuMode="main";fieldMenuIndex=0;pendingTravel=null;$("#field-main-menu")?.classList.add("hidden")}
  function toggleFieldMenu(){fieldMenuOpen?closeFieldMenu():openFieldMenu()}
  function openTravelMenu(){fieldMenuMode="travel";fieldMenuIndex=0;renderFieldMenu()}
  function openSettingsMenu(){fieldMenuMode="settings";fieldMenuIndex=0;renderFieldMenu()}
  function returnFromSubMenu(){const label=fieldMenuMode.startsWith("travel")?"イードウ":"設定";fieldMenuMode="main";pendingTravel=null;fieldMenuIndex=Math.max(0,fieldMenuItems.findIndex(item=>item.label===label));renderFieldMenu()}

  function closeTravelDialog(){if(dialogIsOpen())$("#field-action")?.click()}
  function requestTravel(mapId,label){
    pendingTravel={mapId,label};
    fieldMenuMode="travel-confirm";
    fieldMenuIndex=0;
    renderFieldMenu();
    window.SpellField?.showDialog?.({speaker:"lumiere",text:`${label}に移動するの？`});
  }
  function cancelTravel(){
    closeTravelDialog();
    pendingTravel=null;
    fieldMenuMode="travel";
    fieldMenuIndex=0;
    renderFieldMenu();
  }
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function waitForDialogTyping(){
    while(window.SpellDialogTyping?.isTyping?.())await delay(30);
  }
  async function confirmTravel(){
    if(!pendingTravel||travelCasting)return;
    const destination={...pendingTravel};
    travelCasting=true;
    fieldMenuOpen=false;
    $("#field-main-menu")?.classList.add("hidden");
    closeTravelDialog();
    await delay(40);
    window.SpellField?.showDialog?.({speaker:"lumiere",text:"イードウ！",typing:{allowSkip:false}});
    await waitForDialogTyping();
    await delay(180);
    closeTravelDialog();
    const fade=$("#ido-fade");
    fade?.classList.add("active");
    await delay(380);
    window.SpellField?.activateMap?.(destination.mapId,{from:"fast-travel"});
    window.SpellPlaces?.refresh?.();
    window.SpellBgm?.sync?.();
    await delay(140);
    fade?.classList.remove("active");
    await delay(380);
    pendingTravel=null;
    fieldMenuMode="main";
    fieldMenuIndex=0;
    travelCasting=false;
  }

  function moveFieldMenu(delta){const items=activeFieldMenuItems();fieldMenuIndex=(fieldMenuIndex+delta+items.length)%items.length;renderFieldMenu()}
  function adjustAudio(delta){if(fieldMenuMode!=="settings")return false;const item=activeFieldMenuItems()[fieldMenuIndex];if(!item?.setting)return false;window.SpellAudioSettings?.adjust?.(item.setting,delta);renderFieldMenu();return true}
  function activateFieldMenu(index=fieldMenuIndex){
    if(fieldMenuMode==="travel-confirm"&&window.SpellDialogTyping?.handleAdvance?.())return;
    const item=activeFieldMenuItems()[index];
    if(item?.setting){adjustAudio(.1);return}
    item?.action?.();
  }
  function statRows(stats,key){const p=state.party[key],rows=[["HP",`${p.hp} / ${stats.hp}`],["MP",`${p.mp} / ${G.maxMpFor(stats,p.level)}`],["攻撃",stats.attack],["防御",stats.defense],["特攻",stats.spAttack],["特防",stats.spDefense],["素早さ",stats.speed]];return rows.map(([name,value])=>`<div><dt>${name}</dt><dd>${value}</dd></div>`).join("")}
  function memberCard(key){const progress=state.party[key],species=G.partySpecies[key],stats=G.getMemberStats(key),next=G.expToNext(progress.level),pct=Math.max(0,Math.min(100,(progress.exp/next)*100)),equipKey=state.equipment[key],equip=G.itemDefinitions[equipKey],equipText=equip?`${equip.name}（${equip.description}）`:"装備なし";return `<article class="status-card"><div class="status-card-head"><h3>${species.name}</h3><span class="status-level">Lv.${progress.level}</span></div><dl class="status-stats">${statRows(stats,key)}</dl><div class="status-equipment"><strong>装備</strong><span>${equipText}</span></div><div class="status-exp"><div class="status-exp-row"><span>EXP</span><span>${progress.exp} / ${next}</span></div><div class="exp-bar"><div class="exp-bar-fill" style="width:${pct}%"></div></div></div></article>`}
  function renderStatus(){const grid=$("#status-grid");if(grid)grid.innerHTML=memberCard("sophie")+memberCard("lumiere")}
  function renderLoadout(){$("#spell-loadout")?.remove()}
  function openStatus(){renderStatus();G.showScreen("status")}
  function closeStatus(){G.showScreen("field")}
  function openPluginPrompt(){
    if(!fieldScreenActive()||dialogIsOpen()||storyOverlayIsOpen()||fieldMenuOpen||travelCasting)return false;
    const dialog=$("#field-dialog");
    if(!dialog||!window.SpellField?.showDialog)return false;
    dialog.dataset.pluginPrompt="1";
    window.SpellField.showDialog({speaker:"sophie",text:"プラグイン！ルミエル.EXE トランスミッション！",typing:{allowSkip:true}});
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
  function onFieldMenuKeydown(event){
    if(storyOverlayIsOpen())return;
    if(travelCasting){event.preventDefault();event.stopImmediatePropagation();return}
    if(fieldMenuOpen){
      if(isEnterKey(event)||event.key==="Escape"){
        event.preventDefault();event.stopImmediatePropagation();
        if(fieldMenuMode==="travel-confirm"){cancelTravel();return}
        if(fieldMenuMode!=="main")returnFromSubMenu();else closeFieldMenu();return;
      }
      if(event.key==="ArrowUp"||event.key==="w"||event.key==="W"){event.preventDefault();event.stopImmediatePropagation();moveFieldMenu(-1);return}
      if(event.key==="ArrowDown"||event.key==="s"||event.key==="S"){event.preventDefault();event.stopImmediatePropagation();moveFieldMenu(1);return}
      if(fieldMenuMode==="settings"&&(event.key==="ArrowLeft"||event.key==="a"||event.key==="A")){event.preventDefault();event.stopImmediatePropagation();adjustAudio(-.1);return}
      if(fieldMenuMode==="settings"&&(event.key==="ArrowRight"||event.key==="d"||event.key==="D")){event.preventDefault();event.stopImmediatePropagation();adjustAudio(.1);return}
      if(isZKey(event)){event.preventDefault();event.stopImmediatePropagation();activateFieldMenu();return}
      event.preventDefault();event.stopImmediatePropagation();return;
    }
    if(!fieldScreenActive())return;
    if(isXKey(event)){if(openPluginPrompt()){event.preventDefault();event.stopImmediatePropagation()}return}
    if(isZKey(event)&&window.SpellDialogTyping?.handleAdvance?.()){event.preventDefault();event.stopImmediatePropagation();return}
    if(isZKey(event)&&continuePlugin()){event.preventDefault();event.stopImmediatePropagation();return}
    if(isEnterKey(event)){event.preventDefault();event.stopImmediatePropagation();if(!dialogIsOpen())openFieldMenu();return}
    if(isZKey(event)){event.preventDefault();event.stopImmediatePropagation();$("#field-action")?.click()}
  }

  ensureUi();
  $("#field-menu")?.addEventListener("click",toggleFieldMenu);
  $("#field-main-menu")?.addEventListener("click",event=>{const b=event.target.closest("[data-field-menu-index]");if(!b)return;fieldMenuIndex=Number(b.dataset.fieldMenuIndex)||0;activateFieldMenu(fieldMenuIndex)});
  $("#status-back")?.addEventListener("click",closeStatus);
  document.addEventListener("keydown",onFieldMenuKeydown,true);
  window.SpellMenu={renderStatus,renderLoadout,renderFieldMenu,openStatus,openFieldMenu,closeFieldMenu,openTravelMenu,openSettingsMenu,toggleFieldMenu,isOpen};
})();
