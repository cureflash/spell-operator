(() => {
  "use strict";
  const G=window.SpellGame03,$=G.$;
  const ENCRYPTED="080B07FE080907FA0802080B07F0";
  const PASSWORD="REPAIR7";
  const story={stage:0,friendSolved:false,libraryLearned:false,passwordSolved:false,rewardTaken:false};
  let overlayOpen=false;

  function ensureOverlay(){
    const fieldWindow=document.querySelector(".field-window");
    if(!fieldWindow||$("#field-story-overlay"))return;
    const overlay=document.createElement("div");
    overlay.id="field-story-overlay";
    overlay.className="field-story-overlay hidden";
    overlay.innerHTML='<div class="field-story-card"><button id="field-story-close" class="field-story-close" aria-label="閉じる">×</button><div id="field-story-content"></div></div>';
    fieldWindow.appendChild(overlay);
    overlay.addEventListener("click",e=>{
      if(e.target===overlay||e.target.closest("#field-story-close")){closeOverlay();return;}
      if(e.target.closest("#friend-check")){checkFriend();return;}
      if(e.target.closest("#story-run-code")){runDecoder();return;}
      if(e.target.closest("#story-reset-code")){
        const ta=$("#story-code");if(ta)ta.value=starterCode();
        const c=$("#story-console");if(c)c.textContent="初期コードへ戻しました。";
      }
    });
  }

  function esc(v){return String(v).replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
  function openOverlay(html){ensureOverlay();const el=$("#field-story-overlay"),content=$("#field-story-content");if(!el||!content)return;content.innerHTML=html;overlayOpen=true;el.classList.remove("hidden");}
  function closeOverlay(){const el=$("#field-story-overlay");overlayOpen=false;el?.classList.add("hidden");}
  function refreshField(){window.SpellField?.updateObjective?.();window.SpellField?.renderQuestMarks?.();}
  function say(payload){window.SpellField?.showDialog?.(payload);}

  function openFriendPuzzle(){
    openOverlay(`
      <p class="eyebrow">CLASSMATE QUEST</p>
      <h3>暗号クイズ</h3>
      <p>クラスメイトが渡した暗号を解読する。A→D、B→Eのように、各文字を3文字先へずらしてある。</p>
      <div class="cipher-card"><span>暗号文</span><code>OLEUDUB</code><small>3文字戻すと元の単語になる。</small></div>
      <label class="story-input-label">復号した単語<input id="friend-answer" autocomplete="off" spellcheck="false" placeholder="英大文字で入力"></label>
      <p id="friend-result" class="story-result"></p>
      <div class="story-actions"><button class="primary" id="friend-check">答え合わせ</button></div>`);
    setTimeout(()=>$("#friend-answer")?.focus(),0);
  }

  function starterCode(){return `code = "${ENCRYPTED}"\npassword = ""\n\nfor i in range(0, len(code), 4):\n    block = code[i:i+4]\n    number = int(block, 16)\n    number = number - 0\n    password = password + chr(number)\n\nprint(password)`;}
  function decodeWithOffset(offset){let out="";try{for(let i=0;i<ENCRYPTED.length;i+=4){const n=parseInt(ENCRYPTED.slice(i,i+4),16)-offset;if(n<0||n>0x10ffff)return"";out+=String.fromCodePoint(n)}return out}catch{return""}}
  function validateCode(source){const hasLoop=/range\s*\(\s*0\s*,\s*len\s*\(\s*code\s*\)\s*,\s*4\s*\)/.test(source);const hasHex=/int\s*\(\s*block\s*,\s*16\s*\)/.test(source);const hasChr=/chr\s*\(\s*number\s*\)/.test(source);const m=source.match(/number\s*=\s*number\s*-\s*(\d+)/);const offset=m?Number(m[1]):NaN;const output=Number.isFinite(offset)?decodeWithOffset(offset):"";return{ok:hasLoop&&hasHex&&hasChr&&offset===1977&&output===PASSWORD,hasLoop,hasHex,hasChr,offset,output}}

  function openDecoderPuzzle(){
    openOverlay(`
      <p class="eyebrow">PARTS SHOP QUEST</p>
      <h3>旧式端末のパスワード</h3>
      <p>店主が見せてくれた暗号を、図書館で聞いた手順で復号する。</p>
      <div class="cipher-card terminal"><span>ENCRYPTED PASSWORD</span><code>${ENCRYPTED}</code><small>4桁の16進数が連結されている。</small></div>
      <div class="code-puzzle"><div class="code-puzzle-head"><strong>DECODE PROGRAM</strong><button id="story-reset-code" class="secondary compact">初期コード</button></div><textarea id="story-code" spellcheck="false">${esc(starterCode())}</textarea><div class="story-hint">ピジブルのメモ：暗号化時に各文字のUnicode番号へ <strong>1977</strong> を足している。</div><pre id="story-console" class="story-console">コードを修正して実行してください。</pre></div>
      <div class="story-actions"><button class="primary" id="story-run-code">▶ 復号プログラムを実行</button></div>`);
  }

  function checkFriend(){
    const answer=$("#friend-answer")?.value.trim().toUpperCase()||"";
    if(answer!=="LIBRARY"){const r=$("#friend-result");if(r)r.textContent="まだ違う。各文字を3つ前へ戻してみよう。";return;}
    story.friendSolved=true;story.stage=2;closeOverlay();refreshField();
    say({speaker:"classmate",text:"正解、LIBRARY！　図書館のピジブルなら、もっと変な暗号も知ってるよ。"});
  }

  function runDecoder(){
    const source=$("#story-code")?.value||"",result=validateCode(source),consoleEl=$("#story-console");if(!consoleEl)return;
    const checks=[`4文字ループ: ${result.hasLoop?"OK":"NG"}`,`16進数変換: ${result.hasHex?"OK":"NG"}`,`chr(): ${result.hasChr?"OK":"NG"}`,`減算値: ${Number.isFinite(result.offset)?result.offset:"未指定"}`];
    if(result.output)checks.push(`OUTPUT: ${result.output}`);
    if(result.ok){story.passwordSolved=true;story.stage=4;checks.push("","ACCESS GRANTED");consoleEl.textContent=checks.join("\n");setTimeout(()=>{closeOverlay();refreshField();say({speaker:"parts",text:`端末に PASSWORD: ${PASSWORD} と表示された。店主に結果を伝えよう。`});},350)}
    else{checks.push("","ACCESS DENIED — ピジブルのメモを確認してください。");consoleEl.textContent=checks.join("\n")}
  }

  function grantReward(){
    if(!story.rewardTaken){story.rewardTaken=true;G.state.money+=200;G.addItem?.("repairManual",1);window.SpellMenu?.renderFieldMenu?.();}
    story.stage=5;refreshField();
    say({speaker:"parts",text:"動いた！　助かったぜ。報酬は200Gと『リペレーションの魔導書』だ。"});
  }

  function handleNpc(id){
    if(id==="classmate"){
      if(story.stage===0){story.stage=1;refreshField();say({speaker:"classmate",text:"ソフィー、暗号って得意？　これを解けたら面白い場所を教えてあげる。AをD、BをEみたいに3文字先へずらしてあるんだ。"});return true;}
      if(!story.friendSolved){openFriendPuzzle();return true;}
      say({speaker:"classmate",text:"図書館は町の北東。ピジブルに『LIBRARY』のことを聞いてみて。"});return true;
    }
    if(id==="librarian"){
      if(!story.friendSolved){say({speaker:"pijiburu",text:"暗号の話？　まずはクラスメイトから問題を解いてきた方がよさそうだね。"});return true;}
      if(!story.libraryLearned){story.libraryLearned=true;story.stage=3;refreshField();say({speaker:"pijiburu",text:"文字はコンピュータの中ではUnicodeの番号として扱える。4文字ずつ区切って16進数を整数にし、暗号化で足された値を引いて chr() で文字へ戻す。ループ向きの処理だね。"});return true;}
      say({speaker:"pijiburu",text:"パーツ屋の古い端末なら、今の復号手順を試せるかもしれない。南東へ行ってみるといい。"});return true;
    }
    if(id==="parts"){
      if(!story.libraryLearned){say({speaker:"parts",text:"古い端末が壊れててな。暗号は残ってるが、今のままじゃ手が出せない。"});return true;}
      if(!story.passwordSolved){say({speaker:"parts",text:"ちょうどいいところに来た。昔の注文端末のパスワードを忘れたんだ。残ってる暗号を見てくれ。"});setTimeout(openDecoderPuzzle,120);return true;}
      if(!story.rewardTaken){grantReward();return true;}
      say({speaker:"parts",text:"端末は快調だ。あの魔導書、使い道が見つかるといいな。"});return true;
    }
    return false;
  }

  function startChapter1(){Object.assign(story,{stage:0,friendSolved:false,libraryLearned:false,passwordSolved:false,rewardTaken:false});closeOverlay();G.showScreen("field");refreshField();}
  function resume(){closeOverlay();G.showScreen("field");refreshField();}
  function serialize(){return {...story}}
  function restore(data){Object.assign(story,{stage:0,friendSolved:false,libraryLearned:false,passwordSolved:false,rewardTaken:false},data||{});closeOverlay();}
  function isComplete(){return story.stage>=5&&story.rewardTaken}
  function objective(){if(story.stage===0)return"学校前のクラスメイトに話しかけよう";if(story.stage===1&&!story.friendSolved)return"クラスメイトの暗号 OLEUDUB を解こう";if(story.stage===2)return"北東の図書館でピジブルに話しかけよう";if(story.stage===3&&!story.passwordSolved)return"南東のパーツ屋店主に話しかけよう";if(story.stage===4&&!story.rewardTaken)return"パーツ屋店主に復号結果を伝えよう";return null}
  function questTarget(){if(story.stage<=1&&!story.friendSolved)return"classmate";if(story.stage===2)return"librarian";if((story.stage===3&&!story.passwordSolved)||(story.stage===4&&!story.rewardTaken))return"parts";return null}
  function isOverlayOpen(){return overlayOpen}

  ensureOverlay();
  window.SpellStory={startChapter1,resume,serialize,restore,isComplete,objective,questTarget,handleNpc,isOverlayOpen};
})();
