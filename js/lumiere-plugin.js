(() => {
  "use strict";
  const G=window.SpellGame03;
  let pending=false;

  const isXKey=e=>e.code==="KeyX"||e.key==="x"||e.key==="X";
  const isZKey=e=>e.code==="KeyZ"||e.key==="z"||e.key==="Z";
  const isEditable=t=>Boolean(t?.closest?.("input, textarea, [contenteditable='true']"));
  const fieldActive=()=>Boolean(G.screens.field?.classList.contains("active"));
  const dialogOpen=()=>{
    const dialog=document.getElementById("field-dialog");
    return Boolean(dialog&&!dialog.classList.contains("hidden"));
  };

  function startPlugin(){
    if(!fieldActive()||pending||dialogOpen()||window.SpellStory?.isOverlayOpen?.()||window.SpellMenu?.isOpen?.())return false;
    pending=true;
    window.SpellField?.showDialog?.({speaker:"sophie",text:"プラグイン！ルミエル.EXE トランスミッション！"});
    return true;
  }

  function continuePlugin(){
    if(!pending)return false;
    if(!dialogOpen()){pending=false;return false;}
    pending=false;
    document.getElementById("field-action")?.click();
    G.openComputer?.();
    return true;
  }

  document.addEventListener("keydown",event=>{
    if(isEditable(event.target)||!fieldActive())return;
    if(isXKey(event)){
      if(startPlugin()){
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return;
    }
    if(isZKey(event)&&pending){
      event.preventDefault();
      event.stopImmediatePropagation();
      continuePlugin();
    }
  },true);

  window.SpellPlugin={start:startPlugin,continue:continuePlugin,isPending:()=>pending};
})();