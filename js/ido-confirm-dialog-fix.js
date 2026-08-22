(() => {
  "use strict";

  const dialog=document.getElementById("field-dialog");
  const choice=document.getElementById("ido-choice-menu");
  const textEl=document.getElementById("field-dialog-text");
  if(!dialog||!choice||!textEl)return;

  const style=document.createElement("style");
  style.textContent=`
    #field-dialog .dialog-message{position:relative!important}
    #field-dialog #ido-choice-menu{
      right:12px!important;
      bottom:10px!important;
      width:132px!important;
      z-index:60!important;
    }
    #field-dialog.ido-confirm-open .dialog-message{
      padding-right:170px!important;
    }
    @media(max-width:760px){
      #field-dialog #ido-choice-menu{right:8px!important;bottom:8px!important;width:116px!important}
      #field-dialog.ido-confirm-open .dialog-message{padding-right:138px!important}
    }
  `;
  document.head.appendChild(style);

  let expectedConfirmText=null;
  let choiceRequested=false;
  let syncing=false;

  function attachChoice(){
    const message=dialog.querySelector(".dialog-message");
    if(message&&choice.parentElement!==message)message.appendChild(choice);
  }

  function confirmTextComplete(){
    return Boolean(expectedConfirmText)&&textEl.textContent===expectedConfirmText;
  }

  function setChoiceHidden(hidden){
    if(choice.classList.contains("hidden")===hidden)return;
    syncing=true;
    choice.classList.toggle("hidden",hidden);
    syncing=false;
  }

  function resetConfirmState(){
    expectedConfirmText=null;
    choiceRequested=false;
    dialog.classList.remove("ido-confirm-open");
    setChoiceHidden(true);
  }

  function syncConfirmState(){
    if(syncing)return;
    attachChoice();

    if(dialog.classList.contains("hidden")){
      resetConfirmState();
      return;
    }

    if(!expectedConfirmText)return;

    const complete=confirmTextComplete();
    if(!choice.classList.contains("hidden")&&!complete){
      choiceRequested=true;
      setChoiceHidden(true);
    }

    if(complete&&choiceRequested)setChoiceHidden(false);
    dialog.classList.toggle("ido-confirm-open",complete&&!choice.classList.contains("hidden"));
  }

  function finishExpectedText(){
    if(!expectedConfirmText||confirmTextComplete())return;
    if(window.SpellDialogTyping?.start){
      window.SpellDialogTyping.start(expectedConfirmText,{instant:true});
    }else{
      textEl.textContent=expectedConfirmText;
    }
    syncConfirmState();
  }

  function guardAgainstPrematureTypingEnd(){
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(!expectedConfirmText||dialog.classList.contains("hidden")||confirmTextComplete())return;
      if(!window.SpellDialogTyping?.isTyping?.())finishExpectedText();
    }));
  }

  attachChoice();
  setChoiceHidden(true);

  const observer=new MutationObserver(()=>{
    if(!choice.classList.contains("hidden")&&!confirmTextComplete())choiceRequested=true;
    syncConfirmState();
  });
  observer.observe(dialog,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["class"]});

  if(window.SpellField?.showDialog){
    const originalShowDialog=window.SpellField.showDialog.bind(window.SpellField);
    window.SpellField.showDialog=(payload,speakerKey)=>{
      const text=String(payload&&typeof payload==="object"?payload.text??"":payload??"");
      if(/に移動するの？$/.test(text)){
        expectedConfirmText=text;
        choiceRequested=false;
        setChoiceHidden(true);
        dialog.classList.remove("ido-confirm-open");
      }else if(expectedConfirmText){
        resetConfirmState();
      }
      const result=originalShowDialog(payload,speakerKey);
      guardAgainstPrematureTypingEnd();
      return result;
    };
  }

  window.addEventListener("keydown",event=>{
    if(!expectedConfirmText||dialog.classList.contains("hidden")||confirmTextComplete())return;
    const isZ=event.code==="KeyZ"||event.key==="z"||event.key==="Z";
    if(!isZ)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    finishExpectedText();
  },true);
})();
