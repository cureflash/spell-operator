(() => {
  "use strict";

  const dialog=document.getElementById("field-dialog");
  const textEl=document.getElementById("field-dialog-text");
  if(!dialog||!textEl)return;

  const DEFAULTS={
    charMs:30,
    startDelayMs:0,
    pauses:[],
    stopAt:[],
    allowSkip:true,
    instant:false
  };

  let defaults={...DEFAULTS};
  let preparedConfig=null;
  let timer=null;
  let runId=0;
  let internalWrite=false;
  let state={
    fullText:"",
    chars:[],
    index:0,
    typing:false,
    paused:false,
    config:{...DEFAULTS},
    consumedStops:new Set()
  };

  const segmentText=text=>{
    const value=String(text??"");
    if(typeof Intl!=="undefined"&&Intl.Segmenter){
      const segmenter=new Intl.Segmenter("ja",{granularity:"grapheme"});
      return [...segmenter.segment(value)].map(item=>item.segment);
    }
    return Array.from(value);
  };

  const finiteNonNegative=(value,fallback)=>Number.isFinite(Number(value))&&Number(value)>=0?Number(value):fallback;
  const normalizeStops=value=>{
    const list=Array.isArray(value)?value:(value==null?[]:[value]);
    return [...new Set(list.map(Number).filter(v=>Number.isInteger(v)&&v>0))].sort((a,b)=>a-b);
  };
  const normalizePauses=value=>{
    const list=Array.isArray(value)?value:[];
    return list.map(item=>({at:Number(item?.at),ms:Number(item?.ms)})).filter(item=>Number.isInteger(item.at)&&item.at>0&&Number.isFinite(item.ms)&&item.ms>=0);
  };
  const normalizeConfig=value=>{
    if(value===false)return{...defaults,instant:true};
    const input=value&&typeof value==="object"?value:{};
    return{
      charMs:finiteNonNegative(input.charMs,defaults.charMs),
      startDelayMs:finiteNonNegative(input.startDelayMs,defaults.startDelayMs),
      pauses:normalizePauses(input.pauses??defaults.pauses),
      stopAt:normalizeStops(input.stopAt??defaults.stopAt),
      allowSkip:input.allowSkip==null?defaults.allowSkip:Boolean(input.allowSkip),
      instant:input.instant==null?defaults.instant:Boolean(input.instant)
    };
  };

  const clearTimer=()=>{if(timer!==null){clearTimeout(timer);timer=null;}};
  const write=value=>{
    internalWrite=true;
    textEl.textContent=value;
    queueMicrotask(()=>{internalWrite=false;});
  };
  const pauseMsAt=index=>{
    const pause=state.config.pauses.find(item=>item.at===index);
    return pause?pause.ms:null;
  };
  const shouldStopAt=index=>state.config.stopAt.includes(index)&&!state.consumedStops.has(index);

  function schedule(ms,id){
    clearTimer();
    timer=setTimeout(()=>step(id),Math.max(0,ms));
  }

  function complete(){
    clearTimer();
    state.typing=false;
    state.paused=false;
    state.index=state.chars.length;
  }

  function step(id){
    if(id!==runId||!state.typing||state.paused)return;
    if(state.index>=state.chars.length){complete();return;}

    state.index+=1;
    write(state.chars.slice(0,state.index).join(""));

    if(state.index>=state.chars.length){complete();return;}
    if(shouldStopAt(state.index)){
      state.consumedStops.add(state.index);
      state.paused=true;
      clearTimer();
      return;
    }

    const pause=pauseMsAt(state.index);
    schedule(pause??state.config.charMs,id);
  }

  function start(fullText,config){
    clearTimer();
    runId+=1;
    const id=runId;
    const normalized=normalizeConfig(config);
    const chars=segmentText(fullText);
    state={
      fullText:String(fullText??""),
      chars,
      index:0,
      typing:chars.length>0&&!normalized.instant,
      paused:false,
      config:normalized,
      consumedStops:new Set()
    };

    if(normalized.instant||chars.length===0){
      write(state.fullText);
      complete();
      return;
    }

    write("");
    schedule(normalized.startDelayMs,id);
  }

  function finish(){
    if(!state.typing)return false;
    runId+=1;
    clearTimer();
    write(state.fullText);
    complete();
    return true;
  }

  function resume(){
    if(!state.typing||!state.paused)return false;
    state.paused=false;
    schedule(state.config.charMs,runId);
    return true;
  }

  function handleAdvance(){
    if(!state.typing)return false;
    if(state.config.allowSkip)finish();
    return true;
  }

  function prepare(config){
    preparedConfig=config;
  }

  function configureDefaults(config={}){
    defaults=normalizeConfig({...defaults,...config});
    return{...defaults,pauses:[...defaults.pauses],stopAt:[...defaults.stopAt]};
  }

  const textObserver=new MutationObserver(()=>{
    if(internalWrite)return;
    const fullText=textEl.textContent||"";
    const config=preparedConfig;
    preparedConfig=null;
    start(fullText,config);
  });
  textObserver.observe(textEl,{childList:true,characterData:true,subtree:true});

  const dialogObserver=new MutationObserver(()=>{
    if(!dialog.classList.contains("hidden"))return;
    runId+=1;
    clearTimer();
    state.typing=false;
    state.paused=false;
    preparedConfig=null;
  });
  dialogObserver.observe(dialog,{attributes:true,attributeFilter:["class"]});

  if(window.SpellField?.showDialog){
    const originalShowDialog=window.SpellField.showDialog.bind(window.SpellField);
    window.SpellField.showDialog=(payload,speakerKey)=>{
      if(payload&&typeof payload==="object"&&Object.prototype.hasOwnProperty.call(payload,"typing"))prepare(payload.typing);
      return originalShowDialog(payload,speakerKey);
    };
  }

  window.SpellDialogTyping={
    prepare,
    configureDefaults,
    finish,
    resume,
    handleAdvance,
    isTyping:()=>state.typing,
    isPaused:()=>state.paused,
    visibleCharacters:()=>state.index,
    getConfig:()=>({...state.config,pauses:[...state.config.pauses],stopAt:[...state.config.stopAt]})
  };
})();
