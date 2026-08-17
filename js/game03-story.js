(() => {
  "use strict";
  const G=window.SpellGame03,$=G.$;
  const FRIEND_CIPHER="FDW",FRIEND_ANSWER="CAT",ENCRYPTED="080B07FE080907FA0802080B07F0",PASSWORD="REPAIR7";
  const story={stage:0,friendSolved:false,libraryLearned:false,passwordSolved:false,rewardTaken:false};let overlayOpen=false;
  function ensureOverlay(){const fieldWindow=document.querySelector(".field-window");if(!fieldWindow||$("#field-story-overlay"))return;const overlay=document.createElement("div");overlay.id="field-story-overlay";overlay.className="field-story-overlay hidden";overlay.innerHTML='<div class="field-story-card"><button id="field-story-close" class="field-story-close" aria-label="閉じる">×</button><div id="field-story-content"></div></div>';fieldWindow.appendChild(overlay);overlay.addEventListener("click",e=>{if(e.target===overlay||e.target.closest("#field-story-close")){closeOverlay();return}const shiftButton=e.target.closest("[data-friend-shift]");if(shiftButton){shiftFriend(Number(shiftButton.dataset.friendShift||0));return}if(e.target.closest("#friend-check")){checkFriend();return}if(e.target.closest("#story-check-answer")){checkDecoderAnswer();return}if(e.target.closest("#story-run-code")){runDecoder();return}if(e.target.closest("#story-reset-code")){const ta=$("#story-code");if(ta)ta.value=starterCode();const c=$("#story-console");if(c)c.textContent="初期コードへ戻しました。";}})}
  function esc(v){return String(v).replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
  function openOverlay(html){ensureOverlay();const el=$("#field-story-overlay"),content=$("#field-story-content");if(!el||!content)return;content.innerHTML=html;overlayOpen=true;el.classList.remove("hidden")}
  function closeOverlay(){overlayOpen=false;$("#field-story-overlay")?.classList.add("hidden")}
  function refreshField(){window.SpellField?.updateObjective?.();window.SpellField?.renderQuestMarks?.()}
  function say(payload){window.SpellField?.showDialog?.(payload)}
  function hasUnicodeChart(){return G.inventoryCount?.("unicodeChart")>0}
  function shiftUppercase(text,amount){return [...String(text)].map(char=>{const code=char.charCodeAt(0);if(code<65||code>90)return char;return String.fromCharCode(65+((code-65+amount)%26+26)%26)}).join("")}
  function shiftFriend(amount){const current=$("#friend-shift-text");if(!current||!Number.isFinite(amount)||amount===0)return;current.textContent=shiftUppercase(current.textContent,Math.sign(amount))}
  function openFriendPuzzle(){openOverlay(`<p class="eyebrow">CLASSMATE QUEST</p><h3>シーザー暗号クイズ</h3><p>アルファベットを全部同じ数だけずらす暗号を「シーザー暗号」という。この問題の鍵は3。暗号文は3文字先へずらしてある。矢印は1回押すごとに1文字だけ動く。</p><div class="cipher-card friend-shift-card"><span>暗号文</span><div class="friend-shift-row"><code id="friend-shift-text">${FRIEND_CIPHER}</code><div class="friend-shift-buttons" aria-label="暗号文をずらす"><button type="button" class="secondary compact" data-friend-shift="1" aria-label="1文字先へずらす">↑</button><button type="button" class="secondary compact" data-friend-shift="-1" aria-label="1文字前へずらす">↓</button></div></div><small>鍵：3　↑で1文字先、↓で1文字前。A〜Zは端まで行くと反対側へループする。</small></div><label class="story-input-label">復号した単語<input id="friend-answer" autocomplete="off" spellcheck="false" placeholder="英大文字で入力"></label><p id="friend-result" class="story-result"></p><div class="story-actions"><button class="primary" id="friend-check">答え合わせ</button></div>`);setTimeout(()=>$("#friend-answer")?.focus(),0)}
  function starterCode(){return `code = "${ENCRYPTED}"\npassword = ""\n\nfor i in range(0, len(code), 4):\n    block = code[i:i+4]\n    number = int(block, 16)\n    number = number - 0\n    password = password + chr(number)\n\nprint(password)`}
  function decodeWithOffset(offset){let out="";try{for(let i=0;i<ENCRYPTED.length;i+=4){const n=parseInt(ENCRYPTED.slice(i,i+4),16)-offset;if(n<0||n>0x10ffff)return"";out+=String.fromCodePoint(n)}return out}catch{return""}}
  function validateCode(source){const hasLoop=/range\s*\(\s*0\s*,\s*len\s*\(\s*code\s*\)\s*,\s*4\s*\)/.test(source),hasHex=/int\s*\(\s*block\s*,\s*16\s*\)/.test(source),hasChr=/chr\s*\(\s*number\s*\)/.test(source),m=source.match(/number\s*=\s*number\s*-\s*(\d+)/),offset=m?Number(m[1]):NaN,output=Number.isFinite(offset)?decodeWithOffset(offset):"";return{ok:hasLoop&&hasHex&&hasChr&&offset===1977&&output===PASSWORD,hasLoop,hasHex,hasChr,offset,output}}
  function openDecoderPuzzle(){if(!hasUnicodeChart()){say({speaker:"parts",text:"文字コードの対応が分からないと厳しいな。ピジブルの図書館でUnicode対応表を探してきてくれ。"});return}const chart=G.itemDefinitions.unicodeChart?.description||"Unicode対応表";openOverlay(`<p class="eyebrow">PARTS SHOP QUEST</p><h3>旧式端末のパスワード</h3><p>リュックの『Unicode対応表』を使って文字コードを確認しながら復号する。</p><div class="story-hint"><strong>Unicode対応表</strong><br>${esc(chart)}</div><div class="cipher-card terminal"><span>ENCRYPTED PASSWORD</span><code>${ENCRYPTED}</code><small>4桁の16進数が連結されている。</small></div><label class="story-input-label">分かったパスワードを直接入力<input id="password-answer" autocomplete="off" spellcheck="false" placeholder="英大文字で入力"></label><p id="password-result" class="story-result"></p><div class="story-actions"><button class="primary" id="story-check-answer">この答えで試す</button></div><div class="code-puzzle"><div class="code-puzzle-head"><strong>プログラムで解く場合</strong><button id="story-reset-code" class="secondary compact">初期コード</button></div><textarea id="story-code" spellcheck="false">${esc(starterCode())}</textarea><div class="story-hint">ピジブルのメモ：暗号化時に各文字のUnicode番号へ <strong>1977</strong> を足している。</div><pre id="story-console" class="story-console">Unicode対応表とメモを使って復号してください。</pre></div><div class="story-actions"><button class="secondary" id="story-run-code">▶ 復号プログラムを実行</button></div>`);setTimeout(()=>$("#password-answer")?.focus(),0)}
  function checkFriend(){const answer=$("#friend-answer")?.value.trim().toUpperCase()||"";if(answer!==FRIEND_ANSWER){const r=$("#friend-result");if(r)r.textContent="まだ違う。鍵は3。↓を3回押してFDWを3文字前へ戻してみよう。";return}story.friendSolved=true;story.stage=2;closeOverlay();refreshField();say({speaker:"classmate",text:`正解、${FRIEND_ANSWER}！　図書館のピジブルなら、文字コードを使う暗号も知ってるよ。町へ戻って北側の図書館に行ってみて。`})}
  function completePassword(){story.passwordSolved=true;story.stage=4;closeOverlay();refreshField();say({speaker:"parts",text:`正解。端末に PASSWORD: ${PASSWORD} と表示された。店主に結果を伝えよう。`})}
  function checkDecoderAnswer(){const answer=$("#password-answer")?.value.trim().toUpperCase()||"";if(answer===PASSWORD){completePassword();return}const r=$("#password-result");if(r)r.textContent="そのパスワードでは開かない。Unicode対応表と暗号文を見直そう。"}
  function runDecoder(){const source=$("#story-code")?.value||"",result=validateCode(source),consoleEl=$("#story-console");if(!consoleEl)return;const checks=[`4文字ループ: ${result.hasLoop?"OK":"NG"}`,`16進数変換: ${result.hasHex?"OK":"NG"}`,`chr(): ${result.hasChr?"OK":"NG"}`,`減算値: ${Number.isFinite(result.offset)?result.offset:"未指定"}`];if(result.output)checks.push(`OUTPUT: ${result.output}`);if(result.ok){checks.push("","ACCESS GRANTED");consoleEl.textContent=checks.join("\n");setTimeout(completePassword,350)}else{checks.push("","ACCESS DENIED — Unicode対応表とピジブルのメモを確認してください。");consoleEl.textContent=checks.join("\n")}}
  function grantReward(){if(!story.rewardTaken){story.rewardTaken=true;G.state.money+=200;G.unlockSpellbook?.("repair");window.SpellMenu?.renderFieldMenu?.()}story.stage=5;refreshField();say({speaker:"parts",text:"動いた！　報酬は200G。それと端末から見つかった『Repair』の魔導書データを、ソフィーのパソコンへ転送しておいたぞ。"})}
  function onUnicodeChartPicked(){story.libraryLearned=true;if(story.friendSolved&&story.stage<3)story.stage=3;refreshField();}
  function handleNpc(id){
    if(id==="classmate"){
      if(story.stage===0){story.stage=1;refreshField();say({speaker:"classmate",text:`ソフィー、シーザー暗号って知ってる？　この問題の鍵は3。A→D、B→Eみたいに3文字先へずらしてあるよ。じゃあ「${FRIEND_CIPHER}」を元に戻せる？`});return true}
      if(!story.friendSolved){openFriendPuzzle();return true}
      say({speaker:"classmate",text:"ピジブルの図書館は町の北側。いったん学校を出て向かってみて。"});return true
    }
    if(id==="librarian"){
      if(!story.friendSolved){say({speaker:"pijiburu",text:"暗号の話？　まず学校のクラスメイトの問題を解いてからおいで。"});return true}
      if(!hasUnicodeChart()){say({speaker:"pijiburu",text:"次はUnicodeを使う暗号か。文字にはそれぞれ番号がある。奥の棚の近くに『Unicode対応表』を置いてあるから、持っていくといい。"});return true}
      if(!story.libraryLearned)onUnicodeChartPicked();
      say({speaker:"pijiburu",text:"対応表には数字・英大文字・英小文字のUnicodeコードポイントが載っている。パーツ屋の古い端末で役に立つはずだ。"});return true
    }
    if(id==="parts"){
      if(!story.friendSolved){say({speaker:"parts",text:"端末の暗号なら、まずピジブルに聞いた方がいいんじゃないか？"});return true}
      if(!hasUnicodeChart()){say({speaker:"parts",text:"文字コードの対応が必要そうだ。ピジブルの図書館でUnicode対応表を探してきてくれ。"});return true}
      if(!story.libraryLearned)onUnicodeChartPicked();
      if(!story.passwordSolved){say({speaker:"parts",text:"昔の注文端末のパスワードを忘れたんだ。Unicode対応表を見ながら解いてみてくれ。"});setTimeout(openDecoderPuzzle,120);return true}
      if(!story.rewardTaken){grantReward();return true}
      say({speaker:"parts",text:"Repairの魔導書データ、もうパソコンに入ってるはずだ。"});return true
    }
    return false;
  }
  function startChapter1(){Object.assign(story,{stage:0,friendSolved:false,libraryLearned:false,passwordSolved:false,rewardTaken:false});closeOverlay();G.showScreen("field");refreshField()}
  function resume(){closeOverlay();G.showScreen("field");refreshField()}
  function serialize(){return{...story}}
  function restore(data){Object.assign(story,{stage:0,friendSolved:false,libraryLearned:false,passwordSolved:false,rewardTaken:false},data||{});if(hasUnicodeChart()&&story.friendSolved){story.libraryLearned=true;if(story.stage<3)story.stage=3}if(story.rewardTaken)G.unlockSpellbook?.("repair");closeOverlay()}
  function isComplete(){return story.stage>=5&&story.rewardTaken}
  function objective(){if(story.stage===0)return"学校に入ってクラスメイトに話しかけよう";if(story.stage===1&&!story.friendSolved)return`学校でシーザー暗号 ${FRIEND_CIPHER} を解こう`;if(story.stage===2&&!hasUnicodeChart())return"ピジブルの図書館へ行き、Unicode対応表を手に入れよう";if(story.stage<=3&&!story.passwordSolved)return"Unicode対応表を持って南東のパーツ屋へ行こう";if(story.stage===4&&!story.rewardTaken)return"パーツ屋店主に復号結果を伝えよう";return null}
  function questTarget(){if(story.stage<=1&&!story.friendSolved)return"classmate";if(story.stage===2&&!hasUnicodeChart())return"librarian";if((story.stage>=3&&!story.passwordSolved)||(story.stage===4&&!story.rewardTaken))return"parts";return null}
  function isOverlayOpen(){return overlayOpen}
  ensureOverlay();window.SpellStory={startChapter1,resume,serialize,restore,isComplete,objective,questTarget,handleNpc,isOverlayOpen,onUnicodeChartPicked};
})();
