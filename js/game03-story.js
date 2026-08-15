(() => {
  "use strict";
  const G=window.SpellGame03,$=G.$,{key}=window.SpellFieldModel;
  const ENCRYPTED="080B07FE080907FA0802080B07F0";
  const PASSWORD="REPAIR7";
  const story={active:false,scene:"school",schoolTalked:false,friendSolved:false,libraryLearned:false,shopAsked:false,passwordSolved:false,rewardTaken:false,puzzle:null};

  const scenes={
    school:{area:"放課後の学校",theme:"school",npc:{x:8,y:4,role:"friend",label:"クラスメイト"},exit:{x:12,y:7},spawn:{player:{x:4,y:7,facing:"right"},follower:{x:3,y:7,facing:"right"}}},
    friend:{area:"友達の家",theme:"friend",npc:{x:8,y:3,role:"friend",label:"クラスメイト"},exit:{x:12,y:7},spawn:{player:{x:4,y:7,facing:"up"},follower:{x:3,y:7,facing:"up"}}},
    library:{area:"ピジブルの私設図書館",theme:"library",npc:{x:7,y:3,role:"pigible",label:"ピジブル"},exit:{x:12,y:7},spawn:{player:{x:4,y:7,facing:"up"},follower:{x:3,y:7,facing:"up"}}},
    parts:{area:"パーツ屋",theme:"parts",npc:{x:6,y:3,role:"shopkeeper",label:"店主"},terminal:{x:9,y:3},exit:{x:12,y:7},spawn:{player:{x:4,y:7,facing:"up"},follower:{x:3,y:7,facing:"up"}}}
  };

  function borderBlocked(){const a=[];for(let x=0;x<14;x++){a.push(key(x,0),key(x,9))}for(let y=1;y<9;y++){a.push(key(0,y),key(13,y))}return a}
  function sceneConfig(){
    const s=scenes[story.scene]||scenes.school,blocked=borderBlocked();
    if(s.npc)blocked.push(key(s.npc.x,s.npc.y));
    if(s.terminal)blocked.push(key(s.terminal.x,s.terminal.y));
    if(s.exit)blocked.push(key(s.exit.x,s.exit.y));
    return {...s,blocked};
  }

  function ensureUi(){
    const main=document.querySelector("main.shell");if(!main)return;
    let section=$("#screen-story");
    if(!section){section=document.createElement("section");section.id="screen-story";section.className="screen";const field=$("#screen-field");main.insertBefore(section,field||null);G.screens.story=section}
    section.innerHTML=`<div class="story-wrap"><div class="story-heading"><div><p class="kicker">CHAPTER 1 / PUZZLE</p><h2 id="story-title">暗号</h2></div><button id="story-cancel" class="secondary">フィールドへ戻る</button></div><div id="story-scene" class="story-scene panel"></div></div>`;
    G.screens.story=section;
  }
  function esc(v){return String(v).replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}

  function objective(){
    if(!story.active)return null;
    if(story.scene==="school")return story.schoolTalked?"東の出口から友達の家へ行こう":"教室にいるクラスメイトに話しかけよう";
    if(story.scene==="friend")return story.friendSolved?"東の出口からピジブルの図書館へ行こう":"クラスメイトに話しかけて暗号を解こう";
    if(story.scene==="library")return story.libraryLearned?"東の出口からパーツ屋へ行こう":"ピジブルに暗号の仕組みを聞こう";
    if(story.scene==="parts"){
      if(!story.shopAsked)return"店主に旧式端末の話を聞こう";
      if(!story.passwordSolved)return"奥の旧式端末を調べてパスワードを復号しよう";
      if(!story.rewardTaken)return"店主に端末が直ったことを報告しよう";
      return"東の出口から平原へ出よう";
    }
    return null;
  }

  function fieldDialog(name,text,portrait="traveler"){window.SpellField?.showDialog?.({speaker:"system",name,portrait,text})}

  function interactNpc(){
    if(story.scene==="school"){
      story.schoolTalked=true;
      fieldDialog("クラスメイト","ソフィー、暗号って得意？　続きはうちで見せるよ。東の出口から来て。\n\nルミエル「規則があるなら、プログラムでも解けそう」");
      window.SpellField?.updateObjective?.();return;
    }
    if(story.scene==="friend"){
      if(story.friendSolved){fieldDialog("クラスメイト","正解は LIBRARY。ピジブルの図書館なら、もっと面白い暗号を知ってるかも。");return}
      openFriendPuzzle();return;
    }
    if(story.scene==="library"){
      if(!story.libraryLearned){
        story.libraryLearned=true;
        fieldDialog("ピジブル","文字はコンピュータの中ではUnicodeの番号として扱える。\n4文字ずつ区切って16進数から整数へ変換し、暗号化で足された1977を引く。それを chr() で文字へ戻すんだ。\n\nルミエル「同じ処理の繰り返し。ループ向きだね」,"system");
        window.SpellField?.updateObjective?.();
      }else fieldDialog("ピジブル","4文字ずつ、16進数、1977を引く、chr()。この4つを覚えておけばいい。","system");
      return;
    }
    if(story.scene==="parts"){
      if(!story.shopAsked){story.shopAsked=true;fieldDialog("パーツ屋の店主","昔の注文端末なんだが、パスワードを忘れちまってな。残ってるのは暗号化された文字列だけだ。奥の端末を見てくれ。","system");window.SpellField?.updateObjective?.();return}
      if(story.passwordSolved&&!story.rewardTaken){grantReward();fieldDialog("パーツ屋の店主","動いた！　注文履歴も景品システムも戻ってる。礼だ、持っていけ。\n\n200G と「リペレーションの魔導書」を手に入れた！","system");window.SpellField?.updateObjective?.();return}
      if(story.rewardTaken){fieldDialog("パーツ屋の店主","助かったぜ。東から平原へ抜けられる。","system");return}
      fieldDialog("パーツ屋の店主","奥の旧式端末を頼む。暗号は端末に残ってる。","system");
    }
  }

  function interactTerminal(){
    if(story.scene!=="parts")return;
    if(!story.shopAsked){fieldDialog("SYSTEM","端末はロックされている。先に店主へ事情を聞こう。","system");return}
    if(story.passwordSolved){fieldDialog("SYSTEM",`ACCESS GRANTED\nPASSWORD: ${PASSWORD}\n注文システムは復旧している。`,"system");return}
    openDecoderPuzzle();
  }

  function canExit(){
    if(story.scene==="school")return story.schoolTalked;
    if(story.scene==="friend")return story.friendSolved;
    if(story.scene==="library")return story.libraryLearned;
    if(story.scene==="parts")return story.rewardTaken;
    return false;
  }
  function useExit(){
    if(!canExit()){fieldDialog("ルミエル","まだここでやることが残ってる。","lumiere");return}
    if(story.scene==="school")story.scene="friend";
    else if(story.scene==="friend")story.scene="library";
    else if(story.scene==="library")story.scene="parts";
    else if(story.scene==="parts"){story.active=false;story.scene="done";window.SpellField?.finishStoryChapter?.();return}
    window.SpellField?.enterStoryScene?.(sceneConfig());
  }

  function entityAt(pos){
    if(!story.active)return null;const s=scenes[story.scene];if(!s)return null;
    if(s.npc&&pos.x===s.npc.x&&pos.y===s.npc.y)return"npc";
    if(s.terminal&&pos.x===s.terminal.x&&pos.y===s.terminal.y)return"terminal";
    if(s.exit&&pos.x===s.exit.x&&pos.y===s.exit.y)return"exit";
    return null;
  }
  function interact(kind){if(kind==="npc")interactNpc();else if(kind==="terminal")interactTerminal();else if(kind==="exit")useExit()}

  function openFriendPuzzle(){story.puzzle="friend";renderPuzzle();G.showScreen("story")}
  function openDecoderPuzzle(){story.puzzle="decoder";renderPuzzle();G.showScreen("story")}
  function returnField(){story.puzzle=null;G.showScreen("field");window.SpellField?.updateObjective?.()}

  function starterCode(){return `code = "${ENCRYPTED}"\npassword = ""\n\nfor i in range(0, len(code), 4):\n    block = code[i:i+4]\n    number = int(block, 16)\n    number = number - 0\n    password = password + chr(number)\n\nprint(password)`}
  function decodeWithOffset(offset){let out="";try{for(let i=0;i<ENCRYPTED.length;i+=4){const n=parseInt(ENCRYPTED.slice(i,i+4),16)-offset;if(n<0||n>0x10ffff)return"";out+=String.fromCodePoint(n)}return out}catch{return""}}
  function validateCode(source){const hasLoop=/range\s*\(\s*0\s*,\s*len\s*\(\s*code\s*\)\s*,\s*4\s*\)/.test(source),hasHex=/int\s*\(\s*block\s*,\s*16\s*\)/.test(source),hasChr=/chr\s*\(\s*number\s*\)/.test(source),m=source.match(/number\s*=\s*number\s*-\s*(\d+)/),offset=m?Number(m[1]):NaN,output=Number.isFinite(offset)?decodeWithOffset(offset):"";return{ok:hasLoop&&hasHex&&hasChr&&offset===1977&&output===PASSWORD,hasLoop,hasHex,hasChr,offset,output}}

  function renderPuzzle(){
    const box=$("#story-scene");if(!box)return;
    if(story.puzzle==="friend"){
      $("#story-title").textContent="友達の暗号クイズ";
      box.innerHTML=`<div class="story-location">友達の家</div><div class="story-dialog"><strong>クラスメイト</strong><p>「AをD、BをEみたいに、3文字先へずらしたよ。元に戻してみて」</p></div><div class="cipher-card"><span>暗号文</span><code>OLEUDUB</code><small>各文字を3つ前へ戻す。</small></div><label class="story-input-label">復号した単語<input id="friend-answer" autocomplete="off" spellcheck="false" placeholder="英大文字で入力"></label><p id="friend-result" class="story-result"></p><div class="story-actions"><button id="friend-check" class="primary">答え合わせ</button></div>`;return;
    }
    $("#story-title").textContent="旧式端末のパスワード復号";
    box.innerHTML=`<div class="story-location">パーツ屋・旧式端末</div><div class="cipher-card terminal"><span>ENCRYPTED PASSWORD</span><code>${ENCRYPTED}</code><small>4桁の16進数が連結されている。</small></div><div class="code-puzzle"><div class="code-puzzle-head"><strong>DECODE PROGRAM</strong><button id="story-reset-code" class="secondary compact">初期コード</button></div><textarea id="story-code" spellcheck="false">${esc(starterCode())}</textarea><div class="story-hint">ピジブルのメモ：各Unicode番号に <strong>1977</strong> が足されている。</div><pre id="story-console" class="story-console">コードを修正して実行してください。</pre></div><div class="story-actions"><button id="story-run-code" class="primary">▶ 復号プログラムを実行</button></div>`;
  }

  function checkFriend(){const answer=$("#friend-answer")?.value.trim().toUpperCase()||"",r=$("#friend-result");if(answer!=="LIBRARY"){if(r)r.textContent="まだ違う。各文字を3つ前へ戻してみよう。";return}story.friendSolved=true;if(r){r.className="story-result story-success";r.textContent="正解：LIBRARY（図書館）"}const actions=document.querySelector("#screen-story .story-actions");if(actions)actions.innerHTML='<button id="story-return" class="primary">友達の家へ戻る</button>'}
  function runDecoder(){const source=$("#story-code")?.value||"",result=validateCode(source),c=$("#story-console");if(!c)return;const lines=[`4文字ループ: ${result.hasLoop?"OK":"NG"}`,`16進数変換: ${result.hasHex?"OK":"NG"}`,`chr(): ${result.hasChr?"OK":"NG"}`,`減算値: ${Number.isFinite(result.offset)?result.offset:"未指定"}`];if(result.output)lines.push(`OUTPUT: ${result.output}`);if(result.ok){story.passwordSolved=true;lines.push("","ACCESS GRANTED");c.textContent=lines.join("\n");const actions=document.querySelector("#screen-story .story-actions");if(actions)actions.innerHTML='<button id="story-return" class="primary">パーツ屋へ戻る</button>'}else{lines.push("","ACCESS DENIED — ピジブルの説明を確認しよう。");c.textContent=lines.join("\n")}}

  function grantReward(){if(story.rewardTaken)return;story.rewardTaken=true;G.state.money+=200;G.addItem?.("repairManual",1);window.SpellItems?.renderBackpack?.();window.SpellMenu?.renderFieldMenu?.()}
  function startChapter1(){Object.assign(story,{active:true,scene:"school",schoolTalked:false,friendSolved:false,libraryLearned:false,shopAsked:false,passwordSolved:false,rewardTaken:false,puzzle:null});window.SpellField?.enterStoryScene?.(sceneConfig())}
  function resume(fieldSnapshot){if(!story.active||story.scene==="done")return;window.SpellField?.enterStoryScene?.(sceneConfig(),fieldSnapshot)}
  function serialize(){return{...story,puzzle:null}}
  function restore(data){Object.assign(story,{active:false,scene:"school",schoolTalked:false,friendSolved:false,libraryLearned:false,shopAsked:false,passwordSolved:false,rewardTaken:false,puzzle:null},data||{});story.puzzle=null}
  function isComplete(){return story.scene==="done"||(!story.active&&story.rewardTaken)}
  function isActive(){return story.active}

  ensureUi();
  $("#screen-story")?.addEventListener("click",e=>{
    if(e.target.closest("#story-cancel")||e.target.closest("#story-return")){returnField();return}
    if(e.target.closest("#friend-check")){checkFriend();return}
    if(e.target.closest("#story-run-code")){runDecoder();return}
    if(e.target.closest("#story-reset-code")){const ta=$("#story-code");if(ta)ta.value=starterCode();const c=$("#story-console");if(c)c.textContent="初期コードへ戻しました。"}
  });

  window.SpellStory={startChapter1,resume,serialize,restore,isComplete,isActive,objective,sceneConfig,entityAt,interact,useExit};
})();
