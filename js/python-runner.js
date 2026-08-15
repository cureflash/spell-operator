(() => {
  "use strict";
  let worker=null,readyPromise=null,readyResolve=null,readyReject=null,seq=1;
  const pending=new Map();

  function resetWorker(reason=null){
    if(worker)worker.terminate();
    worker=null;readyPromise=null;readyResolve=null;readyReject=null;
    for(const [id,p] of pending){clearTimeout(p.timer);p.reject(reason||new Error("Python worker was reset."));pending.delete(id)}
  }

  function ensureWorker(){
    if(worker&&readyPromise)return readyPromise;
    worker=new Worker("js/python-worker.mjs?v=1",{type:"module"});
    readyPromise=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject});
    worker.addEventListener("message",event=>{
      const data=event.data||{};
      if(data.type==="ready"){readyResolve?.();return}
      if(data.type==="fatal"){const error=new Error(data.error||"Python runtime failed to load.");readyReject?.(error);resetWorker(error);return}
      if(!data.id)return;
      const p=pending.get(data.id);if(!p)return;pending.delete(data.id);clearTimeout(p.timer);
      if(data.type==="result")p.resolve(data.result);else p.reject(new Error(data.error||"Python execution failed."));
    });
    worker.addEventListener("error",event=>{const error=new Error(event.message||"Python worker error.");readyReject?.(error);resetWorker(error)});
    return readyPromise;
  }

  async function runSuite(source,tests,{timeoutMs=6000}={}){
    await ensureWorker();
    const id=seq++;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);const error=new Error("TIME LIMIT: Pythonの実行が制限時間を超えました。");resetWorker(error);reject(error)},timeoutMs);
      pending.set(id,{resolve,reject,timer});
      worker.postMessage({id,type:"run",source:String(source??""),tests:Array.isArray(tests)?tests:[]});
    });
  }

  function warmup(){return ensureWorker()}
  window.SpellPython={runSuite,warmup,resetWorker};
})();
