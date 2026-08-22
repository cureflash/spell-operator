(() => {
  "use strict";

  const dialog=document.getElementById("field-dialog");
  const choice=document.getElementById("ido-choice-menu");
  const textEl=document.getElementById("field-dialog-text");
  if(!dialog||!choice||!textEl)return;

  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  let expectedConfirmText=null;
  let destination=null;
  let selectedIndex=0;
  let casting=false;

  const style=document.createElement("style");
  style.textContent=`
    #field-dialog .dialog-message{position:relative!important}
    #field-dialog #ido-choice-menu{
      right:12px!important;
      bottom:10px!important;
      width:132px!important;
      z-index:60!important;
    }
    #field-dialog #ido-choice-menu:not(.ido-ready){display:none!important}
    #field-dialog #ido-choice-menu.ido-ready{display:grid!important}
    #field-dialog.ido-confirm-open .dialog-message{padding-right:170px!important}
    @media(max-width:760px){
      #field-dialog #ido-choice-menu{right:8px!important;bottom:8px!important;width:116px!important}
      #field-dialog.ido-confirm-open .dialog-message{padding-right:138px!important}
    }
  `;
  document.head.appendChild(style);

  function attachChoice(){
    const message=dialog.querySelector(".dialog-message");
    if(message&&choice.parentElement!==message)message.appendChild(choice);
  }

  function ensureButtons(){
    if(choice.querySelectorAll("[data-ido-choice-index]").length>=2)return;
    choice.innerHTML=`
      <button type="button" class="ido-choice-item selected" data-ido-choice-index="0"><span class="menu-cursor">▶</span><span>はい</span></button>
      <button type="button" class="ido-choice-item" data-ido-choice-index="1"><span class="menu-cursor">▶</span><span>いいえ</span></button>`;
  }

  function buttons(){return [...choice.querySelectorAll("[data-ido-choice-index]")]}
  function setSelected(index){
    const list=buttons();
    if(!list.length)return;
    selectedIndex=(index+list.length)%list.length;
    list.forEach((button,i)=>button.classList.toggle("selected",i===selectedIndex));
  }

  function fullTextVisible(){
    return Boolean(expectedConfirmText)&&textEl.textContent===expectedConfirmText;
  }

  function hideChoice(){
    choice.classList.remove("ido-ready");
    choice.classList.add("hidden");
    dialog.classList.remove("ido-confirm-open");
  }

  function showChoice(){
    if(!fullTextVisible()||dialog.classList.contains("hidden"))return;
    attachChoice();
    ensureButtons();
    setSelected(selectedIndex);
    choice.classList.add("ido-ready");
    choice.classList.remove("hidden");
    dialog.classList.add("ido-confirm-open");
  }

  function clearConfirmState(){
    expectedConfirmText=null;
    destination=null;
    selectedIndex=0;
    hideChoice();
  }

  function finishConfirmText(){
    if(!expectedConfirmText||fullTextVisible())return;
    const typing=window.SpellDialogTyping;
    const finished=typing?.finish?.();
    if(!finished){
      if(typing?.start)typing.start(expectedConfirmText,{instant:true});
      else textEl.textContent=expectedConfirmText;
    }
    if(fullTextVisible())showChoice();
  }

  function parseDestination(text){
    if(text.startsWith("フルール村"))return{mapId:"town",label:"フルール村"};
    if(text.startsWith("ラメールシティ"))return{mapId:"la_mer_city",label:"ラメールシティ"};
    return null;
  }

  function closeDialog(){
    if(!dialog.classList.contains("hidden"))document.getElementById("field-action")?.click();
  }

  async function waitForCompletedDialog(expected){
    await delay(60);
    while(textEl.textContent!==expected||window.SpellDialogTyping?.isTyping?.())await delay(25);
  }

  function cancelTravel(){
    hideChoice();
    closeDialog();
    clearConfirmState();
    window.SpellMenu?.openTravelMenu?.();
    document.getElementById("field-main-menu")?.classList.remove("hidden");
  }

  async function confirmTravel(){
    if(casting||!destination)return;
    const target={...destination};
    casting=true;
    hideChoice();
    clearConfirmState();
    document.getElementById("field-main-menu")?.classList.add("hidden");
    closeDialog();
    await delay(40);
    window.SpellField?.showDialog?.({speaker:"lumiere",text:"イードウ！",typing:{allowSkip:false}});
    await waitForCompletedDialog("イードウ！");
    await delay(180);
    closeDialog();
    const fade=document.getElementById("ido-fade");
    fade?.classList.add("active");
    await delay(380);
    window.SpellField?.activateMap?.(target.mapId,{from:"fast-travel"});
    window.SpellPlaces?.refresh?.();
    window.SpellBgm?.sync?.();
    await delay(140);
    fade?.classList.remove("active");
    await delay(380);
    window.SpellMenu?.closeFieldMenu?.();
    casting=false;
  }

  function activateChoice(){
    if(selectedIndex===0)confirmTravel();
    else cancelTravel();
  }

  function isZ(event){return event.code==="KeyZ"||event.key==="z"||event.key==="Z"}

  attachChoice();
  hideChoice();

  const textObserver=new MutationObserver(()=>{
    if(!expectedConfirmText)return;
    if(fullTextVisible())showChoice();
    else hideChoice();
  });
  textObserver.observe(textEl,{childList:true,characterData:true,subtree:true});

  if(window.SpellField?.showDialog){
    const originalShowDialog=window.SpellField.showDialog.bind(window.SpellField);
    window.SpellField.showDialog=(payload,speakerKey)=>{
      const value=String(payload&&typeof payload==="object"?payload.text??"":payload??"");
      const target=/に移動するの？$/.test(value)?parseDestination(value):null;
      if(target){
        expectedConfirmText=value;
        destination=target;
        selectedIndex=0;
        hideChoice();
      }else if(expectedConfirmText){
        clearConfirmState();
      }
      return originalShowDialog(payload,speakerKey);
    };
  }

  window.addEventListener("keydown",event=>{
    if(casting){
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if(!expectedConfirmText||dialog.classList.contains("hidden"))return;

    if(!fullTextVisible()){
      if(isZ(event)){
        event.preventDefault();
        event.stopImmediatePropagation();
        finishConfirmText();
      }
      return;
    }

    if(!choice.classList.contains("ido-ready"))showChoice();

    if(event.key==="ArrowUp"||event.key==="w"||event.key==="W"){
      event.preventDefault();
      event.stopImmediatePropagation();
      setSelected(selectedIndex-1);
      return;
    }
    if(event.key==="ArrowDown"||event.key==="s"||event.key==="S"){
      event.preventDefault();
      event.stopImmediatePropagation();
      setSelected(selectedIndex+1);
      return;
    }
    if(isZ(event)){
      event.preventDefault();
      event.stopImmediatePropagation();
      activateChoice();
      return;
    }
    if(event.key==="Enter"||event.key==="Escape"){
      event.preventDefault();
      event.stopImmediatePropagation();
      cancelTravel();
    }
  },true);

  choice.addEventListener("click",event=>{
    if(casting||!choice.classList.contains("ido-ready"))return;
    const button=event.target.closest("[data-ido-choice-index]");
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    selectedIndex=Number(button.dataset.idoChoiceIndex)||0;
    setSelected(selectedIndex);
    activateChoice();
  },true);
})();
