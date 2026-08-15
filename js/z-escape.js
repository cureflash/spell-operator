(() => {
  "use strict";
  const G=window.SpellGame03;
  const isZKey=e=>e.code==="KeyZ"||e.key==="z"||e.key==="Z";
  const isEditable=t=>Boolean(t?.closest?.("input, textarea, [contenteditable='true']"));
  const activeScreen=id=>Boolean(document.getElementById(id)?.classList.contains("active"));
  const returnToField=()=>{G.showScreen("field");requestAnimationFrame(()=>window.SpellField?.renderQuestMarks?.());};

  document.addEventListener("keydown",event=>{
    if(!isZKey(event)||isEditable(event.target))return;

    /* Field menu keeps Z as CONFIRM. */
    if(window.SpellMenu?.isOpen?.())return;

    const storyOverlay=document.getElementById("field-story-overlay");
    if(storyOverlay&&!storyOverlay.classList.contains("hidden")){
      event.preventDefault();
      event.stopImmediatePropagation();
      document.getElementById("field-story-close")?.click();
      return;
    }

    /* From the code editor, Z returns to Sophie's PC. */
    if(activeScreen("screen-debug")){
      event.preventDefault();
      event.stopImmediatePropagation();
      G.openComputer?.();
      return;
    }

    /* PC, status, backpack and shop close back to the field. */
    if(activeScreen("screen-hub")||activeScreen("screen-status")||activeScreen("screen-backpack")||activeScreen("screen-shop")){
      event.preventDefault();
      event.stopImmediatePropagation();
      returnToField();
    }
  },true);
})();
