(() => {
  "use strict";

  const dialog=document.getElementById("field-dialog");
  const choice=document.getElementById("ido-choice-menu");
  if(!dialog||!choice)return;

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

  function attachChoice(){
    const message=dialog.querySelector(".dialog-message");
    if(message&&choice.parentElement!==message)message.appendChild(choice);
  }

  function syncConfirmState(){
    attachChoice();
    const text=document.getElementById("field-dialog-text")?.textContent||"";
    const isTravelConfirm=/に移動するの？$/.test(text);
    dialog.classList.toggle("ido-confirm-open",isTravelConfirm);
    if(isTravelConfirm)dialog.classList.remove("hidden");
  }

  attachChoice();
  syncConfirmState();

  const observer=new MutationObserver(syncConfirmState);
  observer.observe(dialog,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["class"]});

  if(window.SpellField?.showDialog){
    const originalShowDialog=window.SpellField.showDialog.bind(window.SpellField);
    window.SpellField.showDialog=(payload,speakerKey)=>{
      const result=originalShowDialog(payload,speakerKey);
      requestAnimationFrame(syncConfirmState);
      return result;
    };
  }
})();
