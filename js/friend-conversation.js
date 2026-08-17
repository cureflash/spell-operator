(() => {
  "use strict";

  const Story=window.SpellStory;
  if(!Story)return;

  const originalHandleNpc=Story.handleNpc.bind(Story);
  const originalSerialize=Story.serialize.bind(Story);
  const originalRestore=Story.restore.bind(Story);
  const originalIsOverlayOpen=Story.isOverlayOpen.bind(Story);

  let active=false;
  let index=0;

  const lines=[
    {speaker:"友達",portrait:"friend",text:"ソフィー、ちょうどいいところに来た！　今、暗号を考えてたんだ。"},
    {speaker:"ソフィー",portrait:"sophie",text:"暗号？"},
    {speaker:"友達",portrait:"friend",text:"うん。『シーザー暗号』っていうやつ。アルファベットを全部、決まった数だけ横にずらして別の文字にするんだ。"},
    {speaker:"友達",portrait:"friend",text:"たとえば3文字先にずらすなら、AはD、BはE……XはA、YはB、ZはCになる。"},
    {speaker:"ソフィー",portrait:"sophie",text:"なるほど。元に戻すなら、逆向きに同じ数だけずらせばいいんだね。"},
    {speaker:"友達",portrait:"friend",text:"その通り！　じゃあこれはどう？　『FDW』。全部3文字先にずらしてあるよ。"},
    {speaker:"ソフィー",portrait:"sophie",text:"面白そう！　解いてみる！"}
  ];

  function ensureUi(){
    if(document.getElementById("friend-conversation"))return;
    const fieldWindow=document.querySelector("#screen-field .field-window");
    if(!fieldWindow)return;
    const root=document.createElement("div");
    root.id="friend-conversation";
    root.className="friend-conversation hidden";
    root.setAttribute("aria-live","polite");
    root.innerHTML=`
      <div class="friend-conversation-box">
        <div id="friend-conversation-portrait" class="friend-conversation-portrait" aria-hidden="true"></div>
        <div class="friend-conversation-body">
          <div id="friend-conversation-speaker" class="friend-conversation-speaker"></div>
          <div id="friend-conversation-text" class="friend-conversation-text"></div>
          <div class="friend-conversation-next">Z / TAP ▶</div>
        </div>
      </div>`;
    fieldWindow.appendChild(root);
    root.addEventListener("click",event=>{
      if(!active)return;
      event.preventDefault();
      event.stopPropagation();
      advance();
    });
  }

  function render(){
    ensureUi();
    const line=lines[index];
    const root=document.getElementById("friend-conversation");
    if(!root||!line)return;
    document.getElementById("friend-conversation-speaker").textContent=line.speaker;
    document.getElementById("friend-conversation-text").textContent=line.text;
    const portrait=document.getElementById("friend-conversation-portrait");
    portrait.dataset.character=line.portrait;
    root.classList.remove("hidden");
  }

  function start(){
    if(active)return;
    active=true;
    index=0;
    render();
  }

  function finish(){
    active=false;
    document.getElementById("friend-conversation")?.classList.add("hidden");

    const state=originalSerialize();
    originalRestore({...state,stage:1});
    originalHandleNpc("classmate");

    requestAnimationFrame(()=>{
      const content=document.getElementById("field-story-content");
      if(!content)return;
      const eyebrow=content.querySelector(".eyebrow");
      const title=content.querySelector("h3");
      const intro=content.querySelector("h3 + p");
      const small=content.querySelector(".cipher-card small");
      if(eyebrow)eyebrow.textContent="CIPHER BREAK";
      if(title)title.textContent="暗号解読";
      if(intro)intro.textContent="友達が作ったシーザー暗号を解読しよう。";
      if(small)small.textContent="全部3文字先にずらしてある。3文字前へ戻せば元の単語になる。";
    });
  }

  function advance(){
    if(!active)return;
    if(index<lines.length-1){
      index++;
      render();
      return;
    }
    finish();
  }

  Story.handleNpc=function(id){
    if(id==="classmate"){
      const state=originalSerialize();
      if(Number(state.stage||0)===0&&!state.friendSolved){
        start();
        return true;
      }
    }
    return originalHandleNpc(id);
  };

  Story.isOverlayOpen=function(){
    return active||originalIsOverlayOpen();
  };

  document.addEventListener("keydown",event=>{
    if(!active)return;
    const isZ=event.code==="KeyZ"||event.key==="z"||event.key==="Z";
    const isEnter=event.key==="Enter"||event.code==="Enter"||event.code==="NumpadEnter";
    if(!isZ&&!isEnter)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    advance();
  },true);

  ensureUi();
  window.SpellFriendConversation={isActive:()=>active,start,advance};
})();
