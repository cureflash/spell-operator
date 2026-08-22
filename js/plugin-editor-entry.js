(() => {
  "use strict";

  function isZKey(event){
    return event.code==="KeyZ"||event.key==="z"||event.key==="Z";
  }

  function pluginPromptReady(){
    const dialog=document.getElementById("field-dialog");
    if(!dialog||dialog.classList.contains("hidden"))return false;
    if(dialog.dataset.pluginPrompt!=="1")return false;
    if(window.SpellDialogTyping?.isTyping?.())return false;
    return true;
  }

  function closePluginDialog(){
    const dialog=document.getElementById("field-dialog");
    if(dialog)delete dialog.dataset.pluginPrompt;
    document.getElementById("field-action")?.click();
  }

  async function playPluginTransition(){
    const transition=window.SpellPluginTransition;
    if(!transition?.play)return;
    try{
      await transition.play();
    }catch(error){
      console.warn("Spell plug-in transition failed; opening editor without effect.",error);
    }
  }

  async function openFirstPythonEditor(){
    await playPluginTransition();
    const game=window.SpellGame03;
    if(!game?.openComputer)return;
    await Promise.resolve(game.openComputer());
    requestAnimationFrame(()=>{
      const button=document.querySelector("#screen-hub [data-python-spellbook]");
      if(button instanceof HTMLElement)button.click();
    });
  }

  function onKeydown(event){
    if(!isZKey(event)||!pluginPromptReady())return;
    event.preventDefault();
    event.stopImmediatePropagation();
    closePluginDialog();
    openFirstPythonEditor();
  }

  window.addEventListener("keydown",onKeydown,true);
})();
