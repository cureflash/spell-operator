(() => {
  "use strict";

  const TABLE_URL="data/python-error-dialogues.json";
  const FALLBACK="Pythonのコードに問題があるみたい。もう一度確認してみて。";
  let tablePromise=null;

  function loadTable(){
    if(!tablePromise){
      tablePromise=fetch(TABLE_URL,{cache:"no-store"})
        .then(response=>{
          if(!response.ok)throw new Error(`Failed to load ${TABLE_URL}: ${response.status}`);
          return response.json();
        })
        .catch(error=>{
          console.warn("Lumiere Python error dialogue table could not be loaded.",error);
          return {default:FALLBACK};
        });
    }
    return tablePromise;
  }

  function extractType(errorText){
    const text=String(errorText??"").trim();
    if(/TIME LIMIT:/i.test(text))return "TimeoutError";
    const match=text.match(/(?:^|\n)([A-Za-z_][A-Za-z0-9_]*Error|StopIteration|StopAsyncIteration|KeyboardInterrupt|SystemExit|GeneratorExit):/);
    return match?.[1]||null;
  }

  async function resolve(errorText){
    const raw=String(errorText??"");
    const table=await loadTable();
    const type=extractType(raw);
    const specific=type&&typeof table?.[type]==="string"?table[type].trim():"";
    const fallback=typeof table?.default==="string"?table.default.trim():FALLBACK;
    return {type,dialogue:specific||fallback,raw};
  }

  async function format(errorText){
    const result=await resolve(errorText);
    return `ルミエル「${result.dialogue}」`;
  }

  // Error guidance is presentation-only. Never rewrite SpellPython.runSuite results.
  function install(){
    if(!window.SpellPython)return false;
    window.SpellPython.__lumiereErrorGuideInstalled=true;
    return true;
  }

  window.SpellLumierePythonErrors={loadTable,extractType,resolve,format,install};
  install();
  loadTable();
})();
