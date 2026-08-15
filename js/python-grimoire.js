(() => {
  "use strict";
  const G=window.SpellGame03,$=G.$,state=G.state;
  if(!window.SpellPython)throw new Error("SpellPython runner is not loaded.");

  const defs={
    fire:{name:"Fire",power:60,baseMp:3,manaDivisor:400,problem:"魔導炉に整数 N が1つ入力される。炎の出力値として N の2倍を1行に出力せよ。",inputFormat:"整数 N（0 ≤ N ≤ 10000）",outputFormat:"N × 2 を整数で1行に出力する。",samples:[{input:"7\n",output:"14\n"}],tests:[{input:"0\n",output:"0\n"},{input:"1\n",output:"2\n"},{input:"25\n",output:"50\n"},{input:"999\n",output:"1998\n"},{input:"10000\n",output:"20000\n"}]},
    repair:{name:"Repair",heal:20,baseMp:2,manaDivisor:400,problem:"現在HP H と最大HP M が空白区切りで入力される。完全修復に必要なHP量 M-H を出力せよ。",inputFormat:"整数 H M（0 ≤ H ≤ M ≤ 10000）",outputFormat:"M - H を整数で1行に出力する。",samples:[{input:"12 30\n",output:"18\n"}],tests:[{input:"0 30\n",output:"30\n"},{input:"30 30\n",output:"0\n"},{input:"17 80\n",output:"63\n"},{input:"1 999\n",output:"998\n"},{input:"4321 10000\n",output:"5679\n"}]}
  };

  const esc=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const isUnlocked=key=>Boolean(state.unlockedSpellbooks?.[key]);
  const isLearned=key=>Boolean(state.registeredSpells?.[key]);
  const manaFor=(def,cost)=>Math.min(99,def.baseMp+Math.ceil(Math.max(0,Number(cost)||0)/def.manaDivisor));
  const suiteTests=def=>[...def.samples.map(t=>({...t,kind:"sample"})),...def.tests.map(t=>({...t,kind:"hidden"}))];

  function normalizeSaved(){
    state.registeredSpells=state.registeredSpells||Object.create(null);
    if(state.registeredSpells.heal&&!state.registeredSpells.repair)state.registeredSpells.repair={...state.registeredSpells.heal,key:"repair",name:"Repair"};
    delete state.registeredSpells.heal;
    state.drafts=state.drafts||Object.create(null);
    if(state.drafts.heal&&!state.drafts.repair)state.drafts.repair="";
    delete state.drafts.heal;
    state.unlockedSpellbooks={fire:true,repair:Boolean(state.unlockedSpellbooks?.repair||state.registeredSpells.repair)};
    state.spellSlots=[];
    for(const key of Object.keys(state.registeredSpells)){
      const def=defs[key];if(!def){delete state.registeredSpells[key];continue;}
      const spell=state.registeredSpells[key],oldSource=String(spell.source||"");
      spell.key=key;spell.name=def.name;spell.power=def.power||0;spell.heal=def.heal||0;
      if(!Number.isFinite(spell.mpCost))spell.mpCost=manaFor(def,spell.abstractCost||0);
      if(!Number.isFinite(spell.abstractCost))spell.abstractCost=Number.isFinite(spell.steps)?spell.steps:null;
      if(/^\s*spell\s/m.test(oldSource)||/cast\s*\(/.test(oldSource))spell.source="";
    }
  }

  function sampleHtml(def){const s=def.samples[0];return `<div class="grimoire-sample"><strong>サンプル</strong><div><span>入力</span><pre>${esc(s.input.trimEnd())}</pre></div><div><span>出力</span><pre>${esc(s.output.trimEnd())}</pre></div></div>`}
  function card(key,learned){
    const def=defs[key],spell=state.registeredSpells[key],mp=learned?spell.mpCost:"コード効率で決定",cost=learned&&Number.isFinite(spell.abstractCost)?spell.abstractCost:"—";
    return `<article class="panel spell-card ${learned?"learned":""}"><div class="spell-card-head"><div><p class="eyebrow">PROGRAMMING GRIMOIRE</p><h3>${def.name}</h3></div><span class="badge ${learned?"success":"muted"}">${learned?"修得済み":"未修得"}</span></div><p class="grimoire-problem">${esc(def.problem)}</p><div class="grimoire-spec"><strong>入出力仕様</strong><dl><div><dt>入力</dt><dd>${esc(def.inputFormat)}</dd></div><div><dt>出力</dt><dd>${esc(def.outputFormat)}</dd></div></dl></div>${sampleHtml(def)}<dl class="spell-spec"><div><dt>効果</dt><dd>${key==="fire"?"威力60":"HPを20修復"}</dd></div><div><dt>消費MP</dt><dd>${mp}</dd></div><div><dt>計算コスト</dt><dd>${cost}</dd></div></dl><button type="button" class="${learned?"secondary":"primary"}" data-python-spellbook="${key}">${learned?"再テスト / 最適化":"Pythonで挑戦"}</button>${learned?'<small class="spell-learned-note">全テスト合格済み。より効率の良いコードでMPを下げられます。</small>':""}</article>`;
  }

  function ensureUi(){
    const hub=$("#screen-hub"),debug=$("#screen-debug");if(!hub||!debug)return;
    hub.classList.add("computer-screen");debug.classList.add("computer-editor-screen");
    const heading=hub.querySelector(".screen-heading");if(heading){heading.querySelector(".kicker").textContent="SOPHIE PC";heading.querySelector("h2").textContent="魔導書"}
    const grid=hub.querySelector(".spell-grid");if(grid){grid.className="spell-grid grimoire-library";grid.innerHTML=`<section class="spellbook-group"><div class="spellbook-group-head"><div><p class="eyebrow">UNLEARNED</p><h3>未修得</h3></div><span>Pythonで問題を解き、全テストに通れば修得</span></div><div id="spellbooks-unlearned" class="spellbook-list"></div></section><section class="spellbook-group learned-group"><div class="spellbook-group-head"><div><p class="eyebrow">LEARNED</p><h3>修得済み</h3></div><span>計算コストが低いほど消費MPも低い</span></div><div id="spellbooks-learned" class="spellbook-list"></div></section>`}
    $("#spell-loadout")?.remove();
    const deploy=hub.querySelector(".deploy-panel");if(deploy){deploy.querySelector(".eyebrow").textContent="LOG OUT";deploy.querySelector("h3").textContent="パソコンを閉じる";deploy.querySelector("p").textContent="修得した魔法はすぐ戦闘で使えます。再テストでコードを最適化すると消費MPを下げられます。"}
    const k=debug.querySelector(".kicker");if(k)k.textContent="PYTHON / GRIMOIRE TEST";
    const manual=debug.querySelector(".manual");if(manual)manual.innerHTML='<h4>Python 3</h4><p><code>input()</code> で入力を読み、<code>print()</code> で答えを出力します。通常のPython構文を使用できます。</p><p>正誤はテストケースで判定。消費MPは実時間ではなく、Python命令と主要な組み込み処理から算出した抽象計算コストで決まります。</p>';
    if(!hub.dataset.pythonGrimoire){hub.dataset.pythonGrimoire="1";hub.addEventListener("click",e=>{const b=e.target.closest("[data-python-spellbook]");if(b)openEditor(b.dataset.pythonSpellbook)})}
    replaceButton("reset-code",resetCode);replaceButton("run-code",runCode);replaceButton("back-workshop",backToPc);
    const reg=$("#register-spell");if(reg)reg.hidden=true;
  }

  function replaceButton(id,handler){const old=$("#"+id);if(!old||old.dataset.pythonBound)return;const fresh=old.cloneNode(true);fresh.dataset.pythonBound="1";old.replaceWith(fresh);fresh.addEventListener("click",handler)}
  function updateComputer(){ensureUi();normalizeSaved();const available=Object.keys(defs).filter(isUnlocked),unlearned=available.filter(k=>!isLearned(k)),learned=available.filter(isLearned),u=$("#spellbooks-unlearned"),l=$("#spellbooks-learned");if(u)u.innerHTML=unlearned.length?unlearned.map(k=>card(k,false)).join(""):'<p class="spellbook-empty">未修得の魔導書はありません。</p>';if(l)l.innerHTML=learned.length?learned.map(k=>card(k,true)).join(""):'<p class="spellbook-empty">修得済みの魔法はまだありません。</p>';const p=$("#workshop-progress");if(p){p.textContent=`${learned.length} / ${available.length} 修得`;p.className=`badge ${available.length&&learned.length===available.length?"success":"muted"}`}window.SpellField?.updateObjective?.()}
  function openComputer(){updateComputer();G.showScreen("hub");window.SpellPython.warmup().catch(()=>{})}
  function problemHtml(def){const s=def.samples[0];return `<div class="editor-problem"><p>${esc(def.problem)}</p><dl><div><dt>入力</dt><dd>${esc(def.inputFormat)}</dd></div><div><dt>出力</dt><dd>${esc(def.outputFormat)}</dd></div></dl><div class="editor-sample"><div><strong>入力例</strong><pre>${esc(s.input.trimEnd())}</pre></div><div><strong>出力例</strong><pre>${esc(s.output.trimEnd())}</pre></div></div></div>`}
  function setState(label,style){const el=$("#run-state");if(el){el.textContent=label;el.className=`status ${style}`}}
  function openEditor(key){if(!isUnlocked(key))return;state.selectedSpellKey=key;const def=defs[key],spell=state.registeredSpells[key];$("#debug-title").textContent=`${def.name} — Python仕様テスト`;$("#debug-hint").innerHTML=problemHtml(def);$("#code-editor").value=state.drafts[key]??spell?.source??"";$("#code-editor").placeholder='例：\nn = int(input())\nprint(n * 2)';const badge=$("#spell-badge");if(badge){badge.textContent=spell?`${def.name} 修得済み / MP ${spell.mpCost}`:"未修得";badge.className=spell?"badge success":"badge muted"}$("#metric-steps").textContent=spell?.abstractCost??"—";$("#metric-mp").textContent=spell?.mpCost??"—";$("#metric-result").textContent="未実行";$("#console-output").textContent="Pythonコードを書いてテスト実行してください。";setState("READY","neutral");G.showScreen("debug");setTimeout(()=>$("#code-editor")?.focus(),0)}
  function resetCode(){const key=state.selectedSpellKey;if(!key)return;state.drafts[key]="";$("#code-editor").value="";$("#console-output").textContent="コードをクリアしました。";setState("READY","neutral")}
  function backToPc(){const key=state.selectedSpellKey;if(key)state.drafts[key]=$("#code-editor").value;openComputer()}
  function saveBest(key,raw,source){const def=defs[key],cost=Math.max(0,Number(raw.maxCost)||0),mpCost=manaFor(def,cost),old=state.registeredSpells[key],candidate={key,name:def.name,mpCost,abstractCost:cost,steps:cost,costBreakdown:raw.maxBreakdown||null,power:def.power||0,heal:def.heal||0,source};const improved=!old||!Number.isFinite(old.abstractCost)||mpCost<old.mpCost||(mpCost===old.mpCost&&cost<old.abstractCost);if(improved)state.registeredSpells[key]=candidate;updateComputer();return{spell:state.registeredSpells[key],improved,submittedMp:mpCost,submittedCost:cost}}

  async function runCode(){
    const key=state.selectedSpellKey;if(!key)return;const def=defs[key],source=$("#code-editor").value;state.drafts[key]=source;if(!source.trim()){setState("ERROR","bad");$("#console-output").textContent="コードが空です。";return}
    const btn=$("#run-code");btn.disabled=true;setState("RUNNING PYTHON","neutral");$("#console-output").textContent="Python実行環境を準備してテストしています…";$("#metric-result").textContent="実行中";
    try{
      const raw=await window.SpellPython.runSuite(source,suiteTests(def),{timeoutMs:7000}),cases=raw.tests||[],passedCount=cases.filter(c=>c.passed).length,total=cases.length,passed=Boolean(raw.ok)&&total>0;
      const lines=[`TEST: ${passedCount} / ${total}`,`最大抽象コスト: ${raw.maxCost??0}`,`  Python opcode: ${raw.maxBreakdown?.opcode??0}`,`  組み込み処理: ${raw.maxBreakdown?.builtin??0}`];
      if(raw.compileError){lines.push("",raw.compileError);setState("PYTHON ERROR","bad");$("#metric-result").textContent="エラー";$("#metric-steps").textContent="—";$("#metric-mp").textContent="—";$("#console-output").textContent=lines.join("\n");return}
      if(!passed){const failed=cases.find(c=>!c.passed);if(failed?.error)lines.push("",failed.error);else if((failed?.index??0)<def.samples.length)lines.push("","サンプルテスト不合格",`あなたの出力: ${String(failed?.actual||"").trimEnd()||"(出力なし)"}`,`期待出力: ${String(failed?.expected||"").trimEnd()}`);else lines.push("",`隠しテスト ${Math.max(1,(failed?.index??def.samples.length)-def.samples.length+1)} で不正解。`);setState("TEST FAILED","warn");$("#metric-result").textContent="不合格";$("#metric-steps").textContent=raw.maxCost??0;$("#metric-mp").textContent="—";$("#console-output").textContent=lines.join("\n");return}
      const saved=saveBest(key,raw,source),spell=saved.spell;lines.push("",`ALL TESTS PASSED — ${def.name} を修得しました。`,`今回の消費MP: ${saved.submittedMp}`,`保存中の最良MP: ${spell.mpCost}`);lines.push(saved.improved?"このコードを戦闘用として保存しました。":"既存コードの方が効率的なので、戦闘用コードは更新しませんでした。");setState("TEST PASS","good");$("#metric-result").textContent="修得";$("#metric-steps").textContent=saved.submittedCost;$("#metric-mp").textContent=saved.submittedMp;const badge=$("#spell-badge");if(badge){badge.textContent=`${def.name} 修得済み / MP ${spell.mpCost}`;badge.className="badge success"}$("#console-output").textContent=lines.join("\n");
    }catch(e){setState("PYTHON ERROR","bad");$("#console-output").textContent=`${e.name||"Error"}: ${e.message||e}`;$("#metric-steps").textContent="—";$("#metric-mp").textContent="—";$("#metric-result").textContent="エラー"}
    finally{btn.disabled=false}
  }

  const originalRestoreItems=G.restoreItems;
  G.spellDefinitions=defs;
  G.isSpellbookUnlocked=isUnlocked;G.isSpellLearned=isLearned;G.isSpellEquipped=isLearned;G.getEquippedSpell=key=>state.registeredSpells[key]||null;G.equipSpell=isLearned;G.unequipSlot=()=>false;G.magicReady=()=>isLearned("fire")&&isLearned("repair");
  G.unlockSpellbook=key=>{if(!defs[key])return false;state.unlockedSpellbooks[key]=true;updateComputer();return true};
  G.openComputer=openComputer;G.openWorkshop=openComputer;G.updateComputer=updateComputer;G.updateWorkshop=updateComputer;
  G.serializeMagic=()=>({drafts:{...state.drafts},registeredSpells:JSON.parse(JSON.stringify(state.registeredSpells)),unlockedSpellbooks:{...state.unlockedSpellbooks}});
  G.restoreMagic=data=>{state.drafts=Object.assign(Object.create(null),data?.drafts||{});state.registeredSpells=Object.assign(Object.create(null),JSON.parse(JSON.stringify(data?.registeredSpells||{})));state.unlockedSpellbooks={fire:true,...(data?.unlockedSpellbooks||{})};normalizeSaved();updateComputer()};
  G.restoreItems=data=>{originalRestoreItems(data);if(Number(data?.inventory?.repairManual||0)>0)state.unlockedSpellbooks.repair=true;updateComputer()};

  normalizeSaved();updateComputer();
  $("#start-button")?.addEventListener("click",()=>queueMicrotask(()=>{state.spellSlots=[];updateComputer()}));
})();
