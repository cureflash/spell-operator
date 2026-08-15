(() => {
  "use strict";
  const G=window.SpellGame03,$=G.$;
  const ENCRYPTED="080B07FE080907FA0802080B07F0";
  const PASSWORD="REPAIR7";
  const story={stage:0,friendSolved:false,libraryLearned:false,passwordSolved:false,rewardTaken:false};

  function ensureUi(){
    const main=document.querySelector("main.shell");
    if(!main||$("#screen-story"))return;
    const section=document.createElement("section");
    section.id="screen-story";section.className="screen";
    section.innerHTML=`
      <div class="story-wrap">
        <div class="story-heading"><div><p class="kicker">CHAPTER 1</p><h2 id="story-title">最初の暗号</h2></div><span id="story-progress" class="story-progress">1 / 4</span></div>
        <div id="story-scene" class="story-scene panel"></div>
      </div>`;
    const field=$("#screen-field");main.insertBefore(section,field||null);G.screens.story=section;
  }

  function esc(v){return String(v).replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
  function scene(title,location,body,actions=""){
    $("#story-title").textContent=title;
    $("#story-progress").textContent=`${Math.min(story.stage+1,4)} / 4`;
    $("#story-scene").innerHTML=`<div class="story-location">${location}</div>${body}<div class="story-actions">${actions}</div>`;
  }

  function render(){
    if(story.stage<=0)return renderSchool();
    if(story.stage===1)return renderFriend();
    if(story.stage===2)return renderLibrary();
    if(story.stage===3)return renderPartsShop();
    return renderComplete();
  }

  function renderSchool(){
    scene("最初の暗号","放課後・学校",
      `<div class="story-dialog"><strong>クラスメイト</strong><p>「ソフィー、暗号って得意？　これ、解けたら面白い場所を教えてあげる」</p></div>
       <div class="story-dialog sophie"><strong>ソフィー</strong><p>「暗号？　急だな……まあ、やってみるけど」</p></div>
       <div class="story-dialog lumiere"><strong>ルミエル</strong><p>「規則があるならプログラムでも解ける。人力でやるより確実かもね」</p></div>`,
      `<button class="primary" data-story-next="friend">友達の家へ行く</button>`);
  }

  function renderFriend(){
    const result=story.friendSolved?`<p class="story-success">正解。LIBRARY＝図書館だ。</p>`:"";
    scene("暗号クイズ","友達の家",
      `<div class="story-dialog"><strong>クラスメイト</strong><p>「AをD、BをEみたいに、アルファベットを3文字先へずらしてあるよ」</p></div>
       <div class="cipher-card"><span>暗号文</span><code>OLEUDUB</code><small>3文字戻すと元の単語になる。</small></div>
       <label class="story-input-label">復号した単語<input id="friend-answer" autocomplete="off" spellcheck="false" placeholder="英大文字で入力"></label>
       <p id="friend-result" class="story-result">${result}</p>`,
      story.friendSolved?`<button class="primary" data-story-next="library">図書館へ行く</button>`:`<button class="primary" id="friend-check">答え合わせ</button>`);
  }

  function renderLibrary(){
    scene("文字を数字として見る","ピジブルの私設図書館",
      `<div class="story-dialog"><strong>ピジブル</strong><p>「文字は見た目だけじゃない。コンピュータの中ではUnicodeの番号として扱える」</p></div>
       <div class="lesson-grid">
         <div><strong>① 4文字ずつ区切る</strong><code>080B / 07FE / ...</code></div>
         <div><strong>② 16進数を整数へ</strong><code>int(block, 16)</code></div>
         <div><strong>③ 暗号化時の加算を戻す</strong><code>number - 1977</code></div>
         <div><strong>④ 文字へ戻す</strong><code>chr(number)</code></div>
       </div>
       <div class="story-dialog lumiere"><strong>ルミエル</strong><p>「つまり、同じ処理を4文字ごとに繰り返せばいい。こういうのはループ向きだね」</p></div>`,
      `<button class="primary" data-story-next="parts">パーツ屋へ行く</button>`);
  }

  function starterCode(){return `code = "${ENCRYPTED}"\npassword = ""\n\nfor i in range(0, len(code), 4):\n    block = code[i:i+4]\n    number = int(block, 16)\n    number = number - 0\n    password = password + chr(number)\n\nprint(password)`;}

  function decodeWithOffset(offset){
    let out="";
    try{
      for(let i=0;i<ENCRYPTED.length;i+=4){const n=parseInt(ENCRYPTED.slice(i,i+4),16)-offset;if(n<0||n>0x10ffff)return"";out+=String.fromCodePoint(n)}
      return out;
    }catch{return""}
  }

  function validateCode(source){
    const hasLoop=/range\s*\(\s*0\s*,\s*len\s*\(\s*code\s*\)\s*,\s*4\s*\)/.test(source);
    const hasHex=/int\s*\(\s*block\s*,\s*16\s*\)/.test(source);
    const hasChr=/chr\s*\(\s*number\s*\)/.test(source);
    const m=source.match(/number\s*=\s*number\s*-\s*(\d+)/);
    const offset=m?Number(m[1]):NaN;
    const output=Number.isFinite(offset)?decodeWithOffset(offset):"";
    return {ok:hasLoop&&hasHex&&hasChr&&offset===1977&&output===PASSWORD,hasLoop,hasHex,hasChr,offset,output};
  }

  function renderPartsShop(){
    const success=story.passwordSolved?`<div class="terminal-success">ACCESS GRANTED — PASSWORD: ${PASSWORD}</div>`:"";
    scene("旧式端末のパスワード","パーツ屋・バックヤード",
      `<div class="story-dialog"><strong>パーツ屋の店主</strong><p>「昔の注文端末なんだが、パスワードを忘れちまってな。残ってるのはこの暗号だけだ」</p></div>
       <div class="cipher-card terminal"><span>ENCRYPTED PASSWORD</span><code>${ENCRYPTED}</code><small>4桁の16進数が連結されている。</small></div>
       ${story.passwordSolved?success:`<div class="code-puzzle"><div class="code-puzzle-head"><strong>DECODE PROGRAM</strong><button id="story-reset-code" class="secondary compact">初期コード</button></div><textarea id="story-code" spellcheck="false">${esc(starterCode())}</textarea><div class="story-hint">図書館のメモ：暗号化時に各文字のUnicode番号へ <strong>1977</strong> を足している。</div><pre id="story-console" class="story-console">コードを修正して実行してください。</pre></div>`}`,
      story.passwordSolved?`<button class="primary" data-story-next="reward">端末を起動する</button>`:`<button class="primary" id="story-run-code">▶ 復号プログラムを実行</button>`);
  }

  function renderComplete(){
    scene("端末復旧","パーツ屋",
      `<div class="story-dialog"><strong>パーツ屋の店主</strong><p>「動いた！　注文履歴も景品システムも戻ってる。助かったぜ」</p></div>
       <div class="reward-card"><strong>報酬</strong><p>200 G</p><p>リペレーションの魔導書 ×1</p></div>
       <div class="story-dialog lumiere"><strong>ルミエル</strong><p>「最後に出てきた景品がお菓子じゃなくて魔導書なのは、ちょっと残念だけど……使えそう」</p></div>
       <p class="story-complete-note">第1章クリア。ここから現在のフィールド探索・魔法開発へ続きます。</p>`,
      `<button class="primary big" id="story-finish">平原へ出る</button>`);
  }

  function checkFriend(){
    const answer=$("#friend-answer")?.value.trim().toUpperCase()||"";
    if(answer==="LIBRARY"){
      story.friendSolved=true;story.stage=1;renderFriend();
    }else{
      const r=$("#friend-result");if(r)r.textContent="まだ違う。各文字を3つ前へ戻してみよう。";
    }
  }

  function runDecoder(){
    const source=$("#story-code")?.value||"",result=validateCode(source),consoleEl=$("#story-console");
    if(!consoleEl)return;
    const checks=[`4文字ループ: ${result.hasLoop?"OK":"NG"}`,`16進数変換: ${result.hasHex?"OK":"NG"}`,`chr(): ${result.hasChr?"OK":"NG"}`,`減算値: ${Number.isFinite(result.offset)?result.offset:"未指定"}`];
    if(result.output)checks.push(`OUTPUT: ${result.output}`);
    if(result.ok){story.passwordSolved=true;story.stage=3;checks.push("","ACCESS GRANTED");consoleEl.textContent=checks.join("\n");setTimeout(renderPartsShop,350)}
    else{checks.push("","ACCESS DENIED — 図書館のメモを確認してください。");consoleEl.textContent=checks.join("\n")}
  }

  function grantReward(){
    if(!story.rewardTaken){story.rewardTaken=true;G.state.money+=200;G.addItem?.("repairManual",1);window.SpellMenu?.renderFieldMenu?.()}
    story.stage=4;renderComplete();
  }

  function next(target){
    if(target==="friend"){story.stage=1;renderFriend();return}
    if(target==="library"&&story.friendSolved){story.stage=2;story.libraryLearned=true;renderLibrary();return}
    if(target==="parts"&&story.libraryLearned){story.stage=3;renderPartsShop();return}
    if(target==="reward"&&story.passwordSolved){grantReward();}
  }

  function finish(){G.showScreen("field");window.SpellField?.updateObjective?.();setTimeout(()=>window.SpellField?.showDialog?.({speaker:"lumiere",text:"パスワードの件は片付いた。次は魔法工房で実戦用の魔法を準備しよう。"}),80)}
  function startChapter1(){story.stage=0;story.friendSolved=false;story.libraryLearned=false;story.passwordSolved=false;story.rewardTaken=false;renderSchool();G.showScreen("story")}
  function resume(){render();G.showScreen("story")}
  function serialize(){return {...story}}
  function restore(data){Object.assign(story,{stage:0,friendSolved:false,libraryLearned:false,passwordSolved:false,rewardTaken:false},data||{})}
  function isComplete(){return story.stage>=4&&story.rewardTaken}
  function objective(){if(story.stage<=0)return"放課後、友達の暗号を見てみよう";if(story.stage===1&&!story.friendSolved)return"OLEUDUBを3文字戻して解読しよう";if(story.stage===2)return"ピジブルからUnicode暗号の仕組みを聞こう";if(story.stage===3&&!story.passwordSolved)return"パーツ屋の旧式端末のパスワードを復号しよう";if(!story.rewardTaken)return"復旧した端末を起動しよう";return null}

  ensureUi();
  $("#screen-story")?.addEventListener("click",e=>{
    const nextBtn=e.target.closest("[data-story-next]");if(nextBtn){next(nextBtn.dataset.storyNext);return}
    if(e.target.closest("#friend-check")){checkFriend();return}
    if(e.target.closest("#story-run-code")){runDecoder();return}
    if(e.target.closest("#story-reset-code")){const ta=$("#story-code");if(ta)ta.value=starterCode();const c=$("#story-console");if(c)c.textContent="初期コードへ戻しました。";return}
    if(e.target.closest("#story-finish")){finish();}
  });

  window.SpellStory={startChapter1,resume,serialize,restore,isComplete,objective,render};
})();