(() => {
  "use strict";
  const G=window.SpellGame03,$=G.$,{FollowFieldModel,key}=window.SpellFieldModel;
  const W=14,H=10,door={x:2,y:3},shop={x:9,y:3},npc={x:6,y:4},enemy={x:11,y:5},sign={x:8,y:7};
  const blocked=[];
  for(let x=0;x<W;x++){blocked.push(key(x,0),key(x,H-1))}for(let y=1;y<H-1;y++){blocked.push(key(0,y),key(W-1,y))}
  for(let y=1;y<=3;y++)for(let x=1;x<=4;x++)blocked.push(key(x,y));
  for(let y=1;y<=2;y++)for(let x=10;x<=12;x++)blocked.push(key(x,y));
  blocked.push(key(shop.x,shop.y));

  const dialogStyle=document.createElement("link");dialogStyle.rel="stylesheet";dialogStyle.href="css/dialog-portrait.css?v=1";document.head.appendChild(dialogStyle);
  const dialog=$("#field-dialog");
  dialog.innerHTML=`<div class="dialog-speaker"><div id="field-dialog-portrait" class="dialog-portrait" aria-hidden="true"></div><div id="field-dialog-name" class="dialog-name">SYSTEM</div></div><div class="dialog-message"><div id="field-dialog-text"></div><span class="dialog-next">▼</span></div>`;

  const model=new FollowFieldModel({width:W,height:H,blocked,player:{x:5,y:7,facing:"up"},follower:{x:5,y:8,facing:"up"}});
  const fieldState={enemyDefeated:false,dialogOpen:false,steps:0};
  const speakers={sophie:{name:"ソフィー",portrait:"sophie"},lumiere:{name:"ルミエル",portrait:"lumiere"},traveler:{name:"旅人",portrait:"traveler"},sign:{name:"看板",portrait:"sign"},system:{name:"SYSTEM",portrait:"system"}};

  function tileType(x,y){if(y===0||y===H-1||x===0||x===W-1)return"tree";if(x>=1&&x<=4&&y>=1&&y<=3){if(x===2&&y===3)return"door";if(y===1)return"roof";return"building"}if(x>=10&&x<=12&&y>=1&&y<=2)return"water";if((y>=4&&y<=7&&x>=2&&x<=11)||(x===5&&y===8))return"path";if((x+y)%7===0)return"flower";return"grass"}
  function buildMap(){
    const map=$("#field-map");[...map.querySelectorAll(".field-tile")].forEach(el=>el.remove());
    const frag=document.createDocumentFragment();for(let y=0;y<H;y++)for(let x=0;x<W;x++){const t=document.createElement("div");t.className=`field-tile ${tileType(x,y)}`;t.dataset.x=x;t.dataset.y=y;frag.appendChild(t)}map.insertBefore(frag,map.firstChild);
    if(!$("#field-shop")){const el=document.createElement("div");el.id="field-shop";el.className="field-entity field-shop";el.setAttribute("aria-label","魔導具店");map.appendChild(el)}
  }
  function place(sel,pos){const el=$(sel);if(!el)return;el.style.setProperty("--x",pos.x);el.style.setProperty("--y",pos.y);if(pos.facing)el.dataset.facing=pos.facing;el.classList.remove("facing-left");if(pos.facing==="left")el.classList.add("facing-left")}
  function render(){place("#field-player",model.player);place("#field-follower",model.follower);place("#field-npc",npc);place("#field-enemy",enemy);place("#field-sign",sign);place("#field-shop",shop);$("#field-enemy").classList.toggle("defeated",fieldState.enemyDefeated);updateObjective();window.SpellMenu?.renderFieldMenu?.()}
  function updateObjective(){
    const storyObjective=window.SpellStory?.objective?.();
    let text;
    if(storyObjective)text=storyObjective;
    else if(fieldState.enemyDefeated)text="実戦成功。ルミエルと話してみよう";
    else if(G.magicReady())text="東の草むらにいる魔物へ向かおう";
    else text="北西の魔法工房で Fire と Heal を登録しよう";
    $("#field-objective").textContent=text;
  }

  function showDialog(payload,speakerKey="system"){const data=typeof payload==="string"?{text:payload,speaker:speakerKey}:payload,speaker=speakers[data.speaker]||speakers.system;fieldState.dialogOpen=true;$("#field-dialog-name").textContent=data.name||speaker.name;$("#field-dialog-text").textContent=data.text||"";dialog.dataset.portrait=data.portrait||speaker.portrait;dialog.classList.remove("hidden")}
  function closeDialog(){fieldState.dialogOpen=false;dialog.classList.add("hidden")}
  function same(a,b){return a.x===b.x&&a.y===b.y}
  function front(){return model.front(model.player)}
  function lumiereText(){return fieldState.enemyDefeated?"……今の戦い、悪くなかった。自分で書いた魔法がちゃんと動くと、ちょっと気分いいね。":G.magicReady()?"Fire と Heal は登録できた。あとは実戦で挙動を見るだけ。":"先に工房。戦闘中にコードを書くわけじゃないから、使う魔法はここで準備しておこう。"}
  function directionToward(from,to){const dx=to.x-from.x,dy=to.y-from.y;if(dx===0&&dy===0)return from.facing||"down";if(Math.abs(dx)>Math.abs(dy))return dx>0?"right":"left";return dy>0?"down":"up"}
  function opposite(direction){return{up:"down",down:"up",left:"right",right:"left"}[direction]||"down"}
  function faceLumiere(){const direction=directionToward(model.player,model.follower);model.player.facing=direction;model.follower.facing=opposite(direction);render()}
  function talkToLumiere(){if(fieldState.dialogOpen){closeDialog();return}faceLumiere();showDialog({speaker:"lumiere",text:lumiereText()})}

  function interact(){
    if(fieldState.dialogOpen){closeDialog();return}
    const f=front();
    if(same(f,model.follower)){showDialog({speaker:"lumiere",text:lumiereText()});return}
    if(same(f,door)){G.openWorkshop();return}
    if(same(f,shop)){window.SpellItems?.openShop?.();return}
    if(same(f,npc)){showDialog({speaker:"traveler",text:"東の草むらには変な魔物がいるよ。魔法を準備してから行った方がいい。"});return}
    if(same(f,sign)){showDialog({speaker:"sign",text:"← 魔法工房　　北東：魔導具店　　東の草むら →"});return}
  }

  function tryMove(direction){
    if(fieldState.dialogOpen||window.SpellMenu?.isOpen?.()||!G.screens.field.classList.contains("active"))return;
    const d=window.SpellFieldModel.DIRS[direction],next={x:model.player.x+d.x,y:model.player.y+d.y};
    if(!fieldState.enemyDefeated&&same(next,enemy)){model.player.facing=direction;render();if(G.magicReady())G.startFieldBattle();else showDialog({speaker:"lumiere",text:"待って。まだ実戦用の魔法が揃ってない。工房へ戻ろう。"});return}
    const result=model.tryMove(direction);if(result.moved){fieldState.steps++;render()}else render();
  }

  function startNewGame(){
    model.restore({player:{x:5,y:7,facing:"up"},follower:{x:5,y:8,facing:"up"}});fieldState.enemyDefeated=false;fieldState.dialogOpen=false;fieldState.steps=0;closeDialog();render();
    if(window.SpellStory?.startChapter1)window.SpellStory.startChapter1();
    else{G.showScreen("field");setTimeout(()=>showDialog({speaker:"lumiere",text:"まずは魔法工房で Fire と Heal を準備しよう。北東には魔導具店もあるみたい。"}),80)}
  }
  function returnFromWorkshop(){render();G.showScreen("field");if(G.magicReady())setTimeout(()=>showDialog({speaker:"lumiere",text:"準備完了。東の草むらで実戦テストしよう。"}),80)}
  function onBattleWon(){fieldState.enemyDefeated=true;render();G.showScreen("field");setTimeout(()=>showDialog({speaker:"system",text:"グリッチスライムを倒した。\nルミエルが少し得意そうにこちらを見ている。"}),80)}

  function saveGame(){
    const data={version:6,magic:G.serializeMagic(),party:G.serializeParty(),items:G.serializeItems(),story:window.SpellStory?.serialize?.()||null,field:{...model.snapshot(),enemyDefeated:fieldState.enemyDefeated,steps:fieldState.steps}};
    localStorage.setItem("spell-operator-v03",JSON.stringify(data));
    if(G.screens.field.classList.contains("active"))showDialog({speaker:"system",text:"セーブしました。"});
    return true;
  }
  function loadGame(){
    try{
      const raw=localStorage.getItem("spell-operator-v03");if(!raw){showDialog({speaker:"system",text:"セーブデータがありません。"});return}
      const data=JSON.parse(raw);G.restoreMagic(data.magic||{});G.restoreItems(data.items||{});G.restoreParty(data.party||{});window.SpellStory?.restore?.(data.story);model.restore(data.field||{});fieldState.enemyDefeated=Boolean(data.field?.enemyDefeated);fieldState.steps=Number(data.field?.steps||0);render();
      if(window.SpellStory&&!window.SpellStory.isComplete())window.SpellStory.resume();
      else{G.showScreen("field");showDialog({speaker:"system",text:"ロードしました。"})}
    }catch(e){console.error(e);showDialog({speaker:"system",text:"ロードに失敗しました。"})}
  }

  function isSpaceKey(e){return e.code==="Space"||e.key===" "||e.key==="Spacebar"}
  function isEnterKey(e){return e.key==="Enter"||e.code==="Enter"||e.code==="NumpadEnter"}
  function keydown(e){if(!G.screens.field.classList.contains("active"))return;const map={ArrowUp:"up",w:"up",W:"up",ArrowDown:"down",s:"down",S:"down",ArrowLeft:"left",a:"left",A:"left",ArrowRight:"right",d:"right",D:"right"};if(map[e.key]){e.preventDefault();tryMove(map[e.key]);return}if(isSpaceKey(e)){e.preventDefault();talkToLumiere();return}if(isEnterKey(e)){e.preventDefault();interact()}}

  buildMap();render();document.addEventListener("keydown",keydown);document.querySelectorAll("[data-dir]").forEach(b=>b.addEventListener("click",()=>tryMove(b.dataset.dir)));$("#field-action").addEventListener("click",interact);$("#field-save").addEventListener("click",saveGame);$("#field-load").addEventListener("click",loadGame);
  window.SpellField={startNewGame,returnFromWorkshop,onBattleWon,showDialog,updateObjective,saveGame,loadGame};
})();