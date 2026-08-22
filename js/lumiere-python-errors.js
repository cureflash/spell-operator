(() => {
  "use strict";

  const TABLE_URL="data/python-error-dialogues.json";
  const FALLBACK="Pythonの実行中に問題が起きたみたい。コードをもう一度確認してみて。";
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

  function install(){
    const python=window.SpellPython;
    if(!python||python.__lumiereErrorGuideInstalled)return false;
    const originalRunSuite=python.runSuite.bind(python);
    python.runSuite=async(...args)=>{
      const result=await originalRunSuite(...args);
      if(result?.compileError)result.compileError=await format(result.compileError);
      if(Array.isArray(result?.tests)){
        for(const test of result.tests){
          if(test?.error)test.error=await format(test.error);
        }
      }
      return result;
    };
    python.__lumiereErrorGuideInstalled=true;
    return true;
  }

  window.SpellLumierePythonErrors={loadTable,extractType,resolve,format,install};
  install();
  loadTable();
})();