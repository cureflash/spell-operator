(() => {
  "use strict";
  const G=window.SpellGame03;

  function isZKey(event){
    return event.code==="KeyZ"||event.key==="z"||event.key==="Z";
  }

  function isEditable(target){
    return Boolean(target?.closest?.("input, textarea, [contenteditable='true']"));
  }

  function activeScreen(id){
    return Boolean(document.getElementById(id)?.classList.contains("active"));
  }

  function returnToField(){
    G.showScreen("field");
    requestAnimationFrame(()=>window.SpellField?.renderQuestMarks?.());
  }

  document.addEventListener("keydown",event=>{
    if(!isZKey(event))return;

    /* Field menu keeps Z as CONFIRM. */
    if(window.SpellMenu?.isOpen?.())return;

    /* While editing text/code, Z remains a normal character key. */
    if(isEditable(event.target))return;

    const storyOverlay=document.getElementById("field-story-overlay");
    if(storyOverlay&&!storyOverlay.classList.contains("hidden")){
      event.preventDefault();
      event.stopImmediatePropagation();
      document.getElementById("field-story-close")?.click();
      return;
    }

    if(activeScreen("screen-status")||activeScreen("screen-backpack")||activeScreen("screen-shop")){
      event.preventDefault();
      event.stopImmediatePropagation();
      returnToField();
    }
  },true);
})();
