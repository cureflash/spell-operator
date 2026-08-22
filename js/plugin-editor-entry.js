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

  function openFirstPythonEditor(){
    const game=window.SpellGame03;
    if(!game?.openComputer)return;
    Promise.resolve(game.openComputer()).then(()=>{
      requestAnimationFrame(()=>{
        const button=document.querySelector("#screen-hub [data-python-spellbook]");
        if(button instanceof HTMLElement)button.click();
      });
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
