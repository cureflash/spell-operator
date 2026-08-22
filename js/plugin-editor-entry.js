(() => {
  "use strict";

  const SE_SOURCE = "assets/audio/sfx/plugin-sparkle.base64";
  const directSe = new Audio();
  directSe.preload = "auto";
  let directSeReady = false;
  let directSeLoadPromise = null;

  function currentSfxVolume(){
    const value=window.SpellAudioSettings?.get?.("sfx");
    return Number.isFinite(value)?Math.max(0,Math.min(1,value)):0.5;
  }

  function preloadDirectSe(){
    if(directSeLoadPromise)return directSeLoadPromise;
    directSeLoadPromise=fetch(SE_SOURCE,{cache:"force-cache"})
      .then(response=>{
        if(!response.ok)throw new Error(`plug-in SE fetch failed: ${response.status}`);
        return response.text();
      })
      .then(encoded=>{
        const clean=encoded.replace(/\s+/g,"");
        directSe.src=`data:audio/mpeg;base64,${clean}`;
        directSe.load();
        if(directSe.readyState>=2){directSeReady=true;return true;}
        return new Promise(resolve=>{
          let settled=false;
          const finish=value=>{
            if(settled)return;
            settled=true;
            directSeReady=value;
            resolve(value);
          };
          directSe.addEventListener("loadeddata",()=>finish(true),{once:true});
          directSe.addEventListener("canplaythrough",()=>finish(true),{once:true});
          directSe.addEventListener("error",()=>finish(false),{once:true});
          setTimeout(()=>finish(directSe.readyState>=2),3000);
        });
      })
      .catch(error=>{
        console.warn("Direct plug-in SE preload failed",error);
        directSeReady=false;
        return false;
      });
    return directSeLoadPromise;
  }

  preloadDirectSe();

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

  function playSeOnGesture(){
    const transition=window.SpellPluginTransition;
    transition?.unlockAudioFromGesture?.();
    const volume=currentSfxVolume();
    if(volume<=0)return;

    if(directSeReady||directSe.readyState>=2){
      try{
        directSe.pause();
        directSe.currentTime=0;
        directSe.volume=volume;
        const promise=directSe.play();
        if(promise?.catch){
          promise.catch(error=>{
            console.warn("Direct plug-in SE playback failed",error);
            transition?.testSound?.();
          });
        }
        return;
      }catch(error){
        console.warn("Direct plug-in SE playback failed",error);
      }
    }

    transition?.testSound?.();
    preloadDirectSe();
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

    // The final Z is intercepted here at window-capture level. Start audio
    // before stopping propagation so Safari/Chrome treat it as user-initiated.
    playSeOnGesture();
    event.preventDefault();
    event.stopImmediatePropagation();
    closePluginDialog();
    openFirstPythonEditor();
  }

  window.addEventListener("keydown",onKeydown,true);
})();
