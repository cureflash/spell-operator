(() => {
  "use strict";

  const $=selector=>document.querySelector(selector);
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  let casting=false;

  function choiceBox(){return $("#ido-choice-menu")}
  function dialog(){return $("#field-dialog")}
  function text(){return $("#field-dialog-text")?.textContent||""}
  function visible(){
    const box=choiceBox();
    return Boolean(box&&!box.classList.contains("hidden")&&dialog()&&!dialog().classList.contains("hidden")&&/に移動するの？$/.test(text()));
  }
  function buttons(){return [...(choiceBox()?.querySelectorAll("[data-ido-choice-index]")||[])]}
  function selectedIndex(){
    const list=buttons();
    const index=list.findIndex(button=>button.classList.contains("selected"));
    return index>=0?index:0;
  }
  function setSelected(index){
    const list=buttons();
    if(!list.length)return;
    const next=(index+list.length)%list.length;
    list.forEach((button,i)=>button.classList.toggle("selected",i===next));
  }
  function hideChoice(){choiceBox()?.classList.add("hidden");dialog()?.classList.remove("ido-confirm-open")}
  function closeDialog(){
    if(dialog()&&!dialog().classList.contains("hidden"))$("#field-action")?.click();
  }
  async function waitTyping(){
    await delay(0);
    while(window.SpellDialogTyping?.isTyping?.())await delay(25);
  }
  function destinationFromText(value){
    if(value.startsWith("フルール村"))return{mapId:"town",label:"フルール村"};
    if(value.startsWith("ラメールシティ"))return{mapId:"la_mer_city",label:"ラメールシティ"};
    return null;
  }
  function cancel(){
    hideChoice();
    closeDialog();
    window.SpellMenu?.openTravelMenu?.();
    $("#field-main-menu")?.classList.remove("hidden");
  }
  async function confirm(){
    if(casting)return;
    const destination=destinationFromText(text());
    if(!destination)return;
    casting=true;
    hideChoice();
    $("#field-main-menu")?.classList.add("hidden");
    closeDialog();
    await delay(40);
    window.SpellField?.showDialog?.({speaker:"lumiere",text:"イードウ！",typing:{allowSkip:false}});
    await waitTyping();
    await delay(180);
    closeDialog();
    const fade=$("#ido-fade");
    fade?.classList.add("active");
    await delay(380);
    window.SpellField?.activateMap?.(destination.mapId,{from:"fast-travel"});
    window.SpellPlaces?.refresh?.();
    window.SpellBgm?.sync?.();
    await delay(140);
    fade?.classList.remove("active");
    await delay(380);
    window.SpellMenu?.closeFieldMenu?.();
    casting=false;
  }
  function activate(index){
    if(index===0)confirm();
    else cancel();
  }
  function isZ(event){return event.code==="KeyZ"||event.key==="z"||event.key==="Z"}

  window.addEventListener("keydown",event=>{
    if(casting){
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if(!visible())return;
    if(event.key==="ArrowUp"||event.key==="w"||event.key==="W"){
      event.preventDefault();event.stopImmediatePropagation();setSelected(selectedIndex()-1);return;
    }
    if(event.key==="ArrowDown"||event.key==="s"||event.key==="S"){
      event.preventDefault();event.stopImmediatePropagation();setSelected(selectedIndex()+1);return;
    }
    if(isZ(event)){
      event.preventDefault();event.stopImmediatePropagation();activate(selectedIndex());return;
    }
    if(event.key==="Enter"||event.key==="Escape"){
      event.preventDefault();event.stopImmediatePropagation();cancel();
    }
  },true);

  choiceBox()?.addEventListener("click",event=>{
    if(casting||!visible())return;
    const button=event.target.closest("[data-ido-choice-index]");
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    activate(Number(button.dataset.idoChoiceIndex)||0);
  },true);
})();
