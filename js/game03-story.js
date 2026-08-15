(() => {
  "use strict";
  const G=window.SpellGame03,$=G.$;
  const FRIEND_CIPHER="DBU";
  const FRIEND_ANSWER="CAT";
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
      if(e.target.closest("#story-check-answer")){checkDecoderAnswer();return;}
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
      <h3>シーザー暗号クイズ</h3>
      <p>アルファベットを全部同じ数だけずらす暗号を「シーザー暗号」という。今回は1文字だけ先へずらしてある。</p>
      <div class="cipher-card"><span>暗号文</span><code>${FRIEND_CIPHER}</code><small>A→B、B→C。1文字前へ戻せば元の単語になる。</small></div>
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
      <p>答えが分かった時点で直接入力してよい。プログラムを書いて復号してもよい。</p>
      <div class="cipher-card terminal"><span>ENCRYPTED PASSWORD</span><code>${ENCRYPTED}</code><small>4桁の16進数が連結されている。</small></div>
      <label class="story-input-label">分かったパスワードを直接入力<input id="password-answer" autocomplete="off" spellcheck="false" placeholder="英大文字で入力"></label>
      <p id="password-result" class="story-result"></p>
      <div class="story-actions"><button class="primary" id="story-check-answer">この答えで試す</button></div>
      <div class="code-puzzle"><div class="code-puzzle-head"><strong>プログラムで解く場合</strong><button id="story-reset-code" class="secondary compact">初期コード</button></div><textarea id="story-code" spellcheck="false">${esc(starterCode())}</textarea><div class="story-hint">ピジブルのメモ：暗号化時に各文字のUnicode番号へ <strong>1977</strong> を足している。</div><pre id="story-console" class="story-console">コードを修正して実行してもクリアできます。</pre></div>
      <div class="story-actions"><button class="secondary" id="story-run-code">▶ 復号プログラムを実行</button></div>`);
    setTimeout(()=>$("#password-answer")?.focus(),0);
  }

  function checkFriend(){
    const answer=$("#friend-answer")?.value.trim().toUpperCase()||"";
    if(answer!==FRIEND_ANSWER){const r=$("#friend-result");if(r)r.textContent="まだ違う。DBUをそれぞれ1文字前へ戻してみよう。";return;}
    story.friendSolved=true;story.stage=2;closeOverlay();refreshField();
    say({speaker:"classmate",text:`正解、${FRIEND_ANSWER}！　こういう文字ずらしがシーザー暗号。図書館のピジブルなら、もっと変わった暗号も知ってるよ。`});
  }

  function completePassword(){
    story.passwordSolved=true;story.stage=4;closeOverlay();refreshField();
    say({speaker:"parts",text:`正解。端末に PASSWORD: ${PASSWORD} と表示された。店主に結果を伝えよう。`});
  }

  function checkDecoderAnswer(){
    const answer=$("#password-answer")?.value.trim().toUpperCase()||"";
    if(answer===PASSWORD){completePassword();return;}
    const r=$("#password-result");if(r)r.textContent="そのパスワードでは開かない。別の答えを試そう。";
  }

  function runDecoder(){
    const source=$("#story-code")?.value||"",result=validateCode(source),consoleEl=$("#story-console");if(!consoleEl)return;
    const checks=[`4文字ループ: ${result.hasLoop?"OK":"NG"}`,`16進数変換: ${result.hasHex?"OK":"NG"}`,`chr(): ${result.hasChr?"OK":"NG"}`,`減算値: ${Number.isFinite(result.offset)?result.offset:"未指定"}`];
    if(result.output)checks.push(`OUTPUT: ${result.output}`);
    if(result.ok){checks.push("","ACCESS GRANTED");consoleEl.textContent=checks.join("\n");setTimeout(completePassword,350)}
    else{checks.push("","ACCESS DENIED — ピジブルのメモを確認してください。");consoleEl.textContent=checks.join("\n")}
  }

  function grantReward(){
    if(!story.rewardTaken){story.rewardTaken=true;G.state.money+=200;G.addItem?.("repairManual",1);window.SpellMenu?.renderFieldMenu?.();}
    story.stage=5;refreshField();
    say({speaker:"parts",text:"動いた！　助かったぜ。報酬は200Gと『リペレーションの魔導書』だ。"});
  }

  function handleNpc(id){
    if(id==="classmate"){
      if(story.stage===0){story.stage=1;refreshField();say({speaker:"classmate",text:`ソフィー、シーザー暗号って知ってる？　アルファベットを全部同じ数だけずらす暗号なんだって。今回は1文字だけ先にずらしたよ。A→B、B→C。じゃあ「${FRIEND_CIPHER}」を元に戻せる？`});return true;}
      if(!story.friendSolved){openFriendPuzzle();return true;}
      say({speaker:"classmate",text:"図書館は町の北東。ピジブルなら、もっと変わった暗号を知ってるよ。"});return true;
    }
    if(id==="librarian"){
      if(!story.friendSolved){say({speaker:"pijiburu",text:"暗号の話？　まずはクラスメイトから問題を解いてきた方がよさそうだね。"});return true;}
      if(!story.libraryLearned){story.libraryLearned=true;story.stage=3;refreshField();say({speaker:"pijiburu",text:"文字はコンピュータの中ではUnicodeの番号として扱える。4文字ずつ区切って16進数を整数にし、暗号化で足された値を引いて chr() で文字へ戻す。手で解いて答えを入れてもいいし、同じ処理が続くからプログラムにやらせてもいい。"});return true;}
      say({speaker:"pijiburu",text:"パーツ屋の古い端末なら、今の復号手順を試せるかもしれない。南東へ行ってみるといい。"});return true;
    }
    if(id==="parts"){
      if(!story.libraryLearned){say({speaker:"parts",text:"古い端末が壊れててな。暗号は残ってるが、今のままじゃ手が出せない。"});return true;}
      if(!story.passwordSolved){say({speaker:"parts",text:"ちょうどいいところに来た。昔の注文端末のパスワードを忘れたんだ。答えが分かったら直接入れてくれていいし、プログラムで解いても構わない。"});setTimeout(openDecoderPuzzle,120);return true;}
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
  function objective(){if(story.stage===0)return"学校前のクラスメイトに話しかけよう";if(story.stage===1&&!story.friendSolved)return`クラスメイトのシーザー暗号 ${FRIEND_CIPHER} を解こう`;if(story.stage===2)return"北東の図書館でピジブルに話しかけよう";if(story.stage===3&&!story.passwordSolved)return"南東のパーツ屋店主に話しかけよう";if(story.stage===4&&!story.rewardTaken)return"パーツ屋店主に復号結果を伝えよう";return null}
  function questTarget(){if(story.stage<=1&&!story.friendSolved)return"classmate";if(story.stage===2)return"librarian";if((story.stage===3&&!story.passwordSolved)||(story.stage===4&&!story.rewardTaken))return"parts";return null}
  function isOverlayOpen(){return overlayOpen}

  ensureOverlay();
  window.SpellStory={startChapter1,resume,serialize,restore,isComplete,objective,questTarget,handleNpc,isOverlayOpen};
})();