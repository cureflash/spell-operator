(() => {
  "use strict";
  let worker=null,readyPromise=null,readyResolve=null,readyReject=null,seq=1;
  let lastResult=null,lastError=null;
  const pending=new Map();

  function setLastResult(result){lastResult=result||null;lastError=null}
  function setLastError(error){lastError=error||null;lastResult=null}

  function resetWorker(reason=null){
    if(worker)worker.terminate();
    worker=null;readyPromise=null;readyResolve=null;readyReject=null;
    if(reason)setLastError(reason);
    for(const [id,p] of pending){clearTimeout(p.timer);p.reject(reason||new Error("Python worker was reset."));pending.delete(id)}
  }

  function ensureWorker(){
    if(worker&&readyPromise)return readyPromise;
    worker=new Worker("js/python-worker.mjs?v=1",{type:"module"});
    readyPromise=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject});
    worker.addEventListener("message",event=>{
      const data=event.data||{};
      if(data.type==="ready"){readyResolve?.();return}
      if(data.type==="fatal"){const error=new Error(data.error||"Python runtime failed to load.");setLastError(error);readyReject?.(error);resetWorker(error);return}
      if(!data.id)return;
      const p=pending.get(data.id);if(!p)return;pending.delete(data.id);clearTimeout(p.timer);
      if(data.type==="result"){setLastResult(data.result);p.resolve(data.result)}else{const error=new Error(data.error||"Python execution failed.");setLastError(error);p.reject(error)}
    });
    worker.addEventListener("error",event=>{const error=new Error(event.message||"Python worker error.");setLastError(error);readyReject?.(error);resetWorker(error)});
    return readyPromise;
  }

  async function runSuite(source,tests,{timeoutMs=6000}={}){
    try{
      await ensureWorker();
      const id=seq++;
      return await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{pending.delete(id);const error=new Error("TIME LIMIT: Pythonの実行が制限時間を超えました。");setLastError(error);resetWorker(error);reject(error)},timeoutMs);
        pending.set(id,{resolve,reject,timer});
        worker.postMessage({id,type:"run",source:String(source??""),tests:Array.isArray(tests)?tests:[]});
      });
    }catch(error){
      setLastError(error);
      throw error;
    }
  }

  function warmup(){return ensureWorker()}
  window.SpellPython={
    runSuite,
    warmup,
    resetWorker,
    get lastResult(){return lastResult},
    get lastError(){return lastError}
  };
})();
