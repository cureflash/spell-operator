(() => {
  "use strict";
  const G=window.SpellGame03,$=G.$,{FollowFieldModel,key}=window.SpellFieldModel;
  const W=20,H=14;
  const door={x:2,y:8},shop={x:11,y:11},enemy={x:17,y:5},sign={x:9,y:5};
  const npcs={classmate:{x:5,y:5},librarian:{x:13,y:4},parts:{x:16,y:10},traveler:{x:8,y:8}};
  const blocked=[];
  const addRect=(x1,y1,x2,y2)=>{for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)blocked.push(key(x,y));};
  for(let x=0;x<W;x++){blocked.push(key(x,0),key(x,H-1))}
  for(let y=1;y<H-1;y++){blocked.push(key(0,y),key(W-1,y))}
  addRect(1,1,5,3);addRect(1,6,4,8);addRect(11,1,15,3);addRect(15,7,18,9);addRect(10,10,12,11);addRect(6,1,9,3);
  Object.values(npcs).forEach(p=>blocked.push(key(p.x,p.y)));blocked.push(key(shop.x,shop.y));

  const dialogStyle=document.createElement("link");dialogStyle.rel="stylesheet";dialogStyle.href="css/dialog-portrait.css?v=2";document.head.appendChild(dialogStyle);
  const dialog=$("#field-dialog");
  dialog.innerHTML=`<div class="dialog-speaker"><div id="field-dialog-portrait" class="dialog-portrait" aria-hidden="true"></div><div id="field-dialog-name" class="dialog-name">SYSTEM</div></div><div class="dialog-message"><div id="field-dialog-text"></div><span class="dialog-next">▼</span></div>`;

  const model=new FollowFieldModel({width:W,height:H,blocked,player:{x:4,y:5,facing:"right"},follower:{x:3,y:5,facing:"right"}});
  const fieldState={enemyDefeated:false,dialogOpen:false,steps:0};
  const speakers={sophie:{name:"ソフィー",portrait:"sophie"},lumiere:{name:"ルミエル",portrait:"lumiere"},classmate:{name:"クラスメイト",portrait:"traveler"},pijiburu:{name:"ピジブル",portrait:"traveler"},parts:{name:"パーツ屋の店主",portrait:"traveler"},traveler:{name:"旅人",portrait:"traveler"},sign:{name:"看板",portrait:"sign"},system:{name:"SYSTEM",portrait:"system"}};

  const inRect=(x,y,x1,y1,x2,y2)=>x>=x1&&x<=x2&&y>=y1&&y<=y2;
  function isPath(x,y){return (y===4&&x>=2&&x<=17)||(y===5&&x>=2&&x<=17)||(x===3&&y>=3&&y<=12)||(x===13&&y>=3&&y<=11)||(x===16&&y>=4&&y<=10)||(y===10&&x>=8&&x<=16)||(y===11&&x>=3&&x<=13);}
  function tileType(x,y){
    if(y===0||y===H-1||x===0||x===W-1)return"tree";
    if(inRect(x,y,6,1,9,3))return"water";
    if(inRect(x,y,1,1,5,3)){if(y===1)return"roof school-roof";if(x===3&&y===3)return"door school-door";return"building school-building";}
    if(inRect(x,y,1,6,4,8)){if(y===6)return"roof workshop-roof";if(x===2&&y===8)return"door workshop-door";return"building workshop-building";}
    if(inRect(x,y,11,1,15,3)){if(y===1)return"roof library-roof";if(x===13&&y===3)return"door library-door";return"building library-building";}
    if(inRect(x,y,15,7,18,9)){if(y===7)return"roof parts-roof";if(x===16&&y===9)return"door parts-door";return"building parts-building";}
    if(inRect(x,y,10,10,12,11)){if(y===10)return"roof shop-roof";if(x===11&&y===11)return"door shop-door";return"building shop-building";}
    if(isPath(x,y))return"path";
    if((x+y)%9===0)return"flower";
    return"grass";
  }

  function ensureWorld(){
    const map=$("#field-map");
    let world=$("#field-world");
    if(!world){
      world=document.createElement("div");
      world.id="field-world";
      world.className="field-world";
      map.insertBefore(world,map.firstChild);
    }
    ["#field-follower","#field-npc","#field-enemy","#field-sign"].forEach(sel=>{
      const el=$(sel);
      if(el&&el.parentElement!==world)world.appendChild(el);
    });
    return world;
  }

  function addMapLabel(world,text,x,y,w,className=""){
    const el=document.createElement("div");
    el.className=`field-map-label ${className}`.trim();
    el.textContent=text;
    el.style.setProperty("--x",x);
    el.style.setProperty("--y",y);
    el.style.setProperty("--w",w);
    world.appendChild(el);
  }

  function addSchoolMarker(world){
    const el=document.createElement("div");
    el.className="school-marker";
    el.textContent="↑ 学校入口";
    el.style.setProperty("--x",2.15);
    el.style.setProperty("--y",4.05);
    world.appendChild(el);
  }

  function makeNpc(id,className,label){
    const el=document.createElement("div");
    el.id=id;
    el.className=`field-entity person npc-field story-npc ${className}`;
    el.innerHTML='<span class="pixel-head"></span><span class="pixel-body"></span><span class="entity-tag"></span>';
    el.setAttribute("aria-label",label);
    return el;
  }

  function buildMap(){
    const world=ensureWorld();
    [...world.querySelectorAll(".field-tile,.field-map-label,.school-marker,.story-npc:not(#field-npc),#field-shop")].forEach(el=>el.remove());
    const frag=document.createDocumentFragment();
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const t=document.createElement("div");
      t.className=`field-tile ${tileType(x,y)}`;
      t.dataset.x=x;t.dataset.y=y;
      frag.appendChild(t);
    }
    world.insertBefore(frag,world.firstChild);

    addMapLabel(world,"学校",1.25,1.42,4.5,"school-label");
    addMapLabel(world,"魔法工房",1.0,6.45,4.0);
    addMapLabel(world,"図書館",11.4,1.45,4.2);
    addMapLabel(world,"パーツ屋",15.1,7.45,3.8);
    addMapLabel(world,"魔導具店",10.0,10.15,3.0);
    addSchoolMarker(world);

    const classmate=$("#field-npc");
    classmate.classList.add("story-npc","npc-classmate");
    classmate.setAttribute("aria-label","クラスメイト");

    world.appendChild(makeNpc("field-librarian","npc-librarian","ピジブル"));
    world.appendChild(makeNpc("field-parts-owner","npc-parts","パーツ屋の店主"));
    world.appendChild(makeNpc("field-traveler","npc-traveler","旅人"));

    const shopEl=document.createElement("div");
    shopEl.id="field-shop";
    shopEl.className="field-entity field-shop";
    shopEl.setAttribute("aria-label","魔導具店");
    shopEl.innerHTML='<span class="shop-icon">◆</span>';
    world.appendChild(shopEl);
  }

  function place(sel,pos){
    const el=$(sel);if(!el)return;
    el.style.setProperty("--x",pos.x);
    el.style.setProperty("--y",pos.y);
    if(pos.facing)el.dataset.facing=pos.facing;
  }

  function updateCamera(){
    const map=$("#field-map"),world=$("#field-world");
    if(!map||!world)return;
    const rect=map.getBoundingClientRect();
    if(rect.width<1||rect.height<1)return;
    const tile=parseFloat(getComputedStyle(map).getPropertyValue("--tile-size"))||40;
    const tx=rect.width/2-(model.player.x+.5)*tile;
    const ty=rect.height/2-(model.player.y+.5)*tile;
    world.style.transform=`translate3d(${tx}px,${ty}px,0)`;
  }

  function renderQuestMarks(){
    const target=window.SpellStory?.questTarget?.();
    const marks={classmate:"#field-npc",librarian:"#field-librarian",parts:"#field-parts-owner"};
    Object.entries(marks).forEach(([k,sel])=>{
      const el=$(sel),tag=el?.querySelector(".entity-tag");
      if(!el||!tag)return;
      tag.textContent=target===k?"!":"";
      el.classList.toggle("quest-target",target===k);
    });
  }

  function render(){
    place("#field-player",model.player);
    place("#field-follower",model.follower);
    place("#field-npc",npcs.classmate);
    place("#field-librarian",npcs.librarian);
    place("#field-parts-owner",npcs.parts);
    place("#field-traveler",npcs.traveler);
    place("#field-enemy",enemy);
    place("#field-sign",sign);
    place("#field-shop",shop);
    $("#field-enemy")?.classList.toggle("defeated",fieldState.enemyDefeated);
    renderQuestMarks();
    updateObjective();
    window.SpellMenu?.renderFieldMenu?.();
    updateCamera();
  }

  function updateObjective(){
    const storyObjective=window.SpellStory?.objective?.();
    let text;
    if(storyObjective)text=storyObjective;
    else if(fieldState.enemyDefeated)text="実戦成功。町を探索しよう";
    else if(G.magicReady())text="東の草むらにいる魔物へ向かおう";
    else text="西側の魔法工房で Fire と Heal を登録しよう";
    $("#field-objective").textContent=text;
  }

  function showDialog(payload,speakerKey="system"){
    const data=typeof payload==="string"?{text:payload,speaker:speakerKey}:payload;
    const speaker=speakers[data.speaker]||speakers.system;
    fieldState.dialogOpen=true;
    $("#field-dialog-name").textContent=data.name||speaker.name;
    $("#field-dialog-text").textContent=data.text||"";
    dialog.dataset.portrait=data.portrait||speaker.portrait;
    dialog.classList.remove("hidden");
  }
  function closeDialog(){fieldState.dialogOpen=false;dialog.classList.add("hidden")}
  function same(a,b){return a.x===b.x&&a.y===b.y}
  function front(){return model.front(model.player)}
  function lumiereText(){
    if(!window.SpellStory?.isComplete?.())return"まずは町の人に話を聞こう。頭上に！が出ている相手が次の手掛かりみたい。";
    return fieldState.enemyDefeated?"今の戦い、悪くなかった。自分で書いた魔法が動くと、ちょっと気分いいね。":G.magicReady()?"Fire と Heal は登録できた。あとは東側で実戦テスト。":"次は魔法工房。戦闘中にコードを書くわけじゃないから、使う魔法は先に準備しておこう。";
  }
  function directionToward(from,to){
    const dx=to.x-from.x,dy=to.y-from.y;
    if(dx===0&&dy===0)return from.facing||"down";
    if(Math.abs(dx)>Math.abs(dy))return dx>0?"right":"left";
    return dy>0?"down":"up";
  }
  function opposite(direction){return{up:"down",down:"up",left:"right",right:"left"}[direction]||"down"}
  function faceLumiere(){
    const direction=directionToward(model.player,model.follower);
    model.player.facing=direction;
    model.follower.facing=opposite(direction);
    render();
  }
  function talkToLumiere(){
    if(fieldState.dialogOpen){closeDialog();return}
    if(window.SpellStory?.isOverlayOpen?.())return;
    faceLumiere();
    showDialog({speaker:"lumiere",text:lumiereText()});
  }

  function interact(){
    if(window.SpellStory?.isOverlayOpen?.())return;
    if(fieldState.dialogOpen){closeDialog();return}
    const f=front();
    if(same(f,model.follower)){showDialog({speaker:"lumiere",text:lumiereText()});return}
    if(same(f,npcs.classmate)){window.SpellStory?.handleNpc?.("classmate");return}
    if(same(f,npcs.librarian)){window.SpellStory?.handleNpc?.("librarian");return}
    if(same(f,npcs.parts)){window.SpellStory?.handleNpc?.("parts");return}
    if(same(f,npcs.traveler)){showDialog({speaker:"traveler",text:"この町は一本道じゃないよ。学校、図書館、工房、店を歩いて回るといい。"});return}
    if(same(f,door)){
      if(window.SpellStory?.isComplete?.())G.openWorkshop();
      else showDialog({speaker:"lumiere",text:"工房は後でもいい。今はクラスメイトの暗号の方を片付けよう。"});
      return;
    }
    if(same(f,shop)){window.SpellItems?.openShop?.();return}
    if(same(f,sign)){showDialog({speaker:"sign",text:"← 学校・魔法工房　　↑ 図書館　　→ パーツ屋・魔導具店"});return}
  }

  function tryMove(direction){
    if(fieldState.dialogOpen||window.SpellStory?.isOverlayOpen?.()||window.SpellMenu?.isOpen?.()||!G.screens.field.classList.contains("active"))return;
    const d=window.SpellFieldModel.DIRS[direction],next={x:model.player.x+d.x,y:model.player.y+d.y};
    if(!fieldState.enemyDefeated&&same(next,enemy)){
      model.player.facing=direction;render();
      if(!window.SpellStory?.isComplete?.())showDialog({speaker:"lumiere",text:"魔物は後。まず町の依頼を片付けよう。"});
      else if(G.magicReady())G.startFieldBattle();
      else showDialog({speaker:"lumiere",text:"待って。まだ実戦用の魔法が揃ってない。工房へ戻ろう。"});
      return;
    }
    const result=model.tryMove(direction);
    if(result.moved){fieldState.steps++;render()}else render();
  }

  function startNewGame(){
    G.showScreen("field");
    model.restore({player:{x:4,y:5,facing:"right"},follower:{x:3,y:5,facing:"right"}});
    fieldState.enemyDefeated=false;fieldState.dialogOpen=false;fieldState.steps=0;
    closeDialog();render();
    if(window.SpellStory?.startChapter1)window.SpellStory.startChapter1();
    requestAnimationFrame(updateCamera);
  }
  function returnFromWorkshop(){G.showScreen("field");render();requestAnimationFrame(updateCamera)}
  function onBattleWon(){fieldState.enemyDefeated=true;G.showScreen("field");render();requestAnimationFrame(updateCamera);setTimeout(()=>showDialog({speaker:"system",text:"グリッチスライムを倒した。"}),80)}

  function saveGame(){
    const data={version:8,magic:G.serializeMagic(),party:G.serializeParty(),items:G.serializeItems(),story:window.SpellStory?.serialize?.()||null,field:{...model.snapshot(),enemyDefeated:fieldState.enemyDefeated,steps:fieldState.steps}};
    localStorage.setItem("spell-operator-v03",JSON.stringify(data));
    if(G.screens.field.classList.contains("active"))showDialog({speaker:"system",text:"セーブしました。"});
    return true;
  }
  function loadGame(){
    try{
      const raw=localStorage.getItem("spell-operator-v03");
      if(!raw){showDialog({speaker:"system",text:"セーブデータがありません。"});return}
      const data=JSON.parse(raw);
      G.restoreMagic(data.magic||{});G.restoreItems(data.items||{});G.restoreParty(data.party||{});
      window.SpellStory?.restore?.(data.story);
      model.restore(data.field||{});
      fieldState.enemyDefeated=Boolean(data.field?.enemyDefeated);
      fieldState.steps=Number(data.field?.steps||0);
      G.showScreen("field");
      render();
      requestAnimationFrame(updateCamera);
      showDialog({speaker:"system",text:"ロードしました。"});
    }catch(e){console.error(e);showDialog({speaker:"system",text:"ロードに失敗しました。"})}
  }

  function isSpaceKey(e){return e.code==="Space"||e.key===" "||e.key==="Spacebar"}
  function isEnterKey(e){return e.key==="Enter"||e.code==="Enter"||e.code==="NumpadEnter"}
  function keydown(e){
    if(!G.screens.field.classList.contains("active")||window.SpellStory?.isOverlayOpen?.())return;
    const map={ArrowUp:"up",w:"up",W:"up",ArrowDown:"down",s:"down",S:"down",ArrowLeft:"left",a:"left",A:"left",ArrowRight:"right",d:"right",D:"right"};
    if(map[e.key]){e.preventDefault();tryMove(map[e.key]);return}
    if(isSpaceKey(e)){e.preventDefault();talkToLumiere();return}
    if(isEnterKey(e)){e.preventDefault();interact()}
  }

  buildMap();
  render();
  document.addEventListener("keydown",keydown);
  window.addEventListener("resize",()=>requestAnimationFrame(updateCamera));
  document.querySelectorAll("[data-dir]").forEach(b=>b.addEventListener("click",()=>tryMove(b.dataset.dir)));
  $("#field-action").addEventListener("click",interact);
  $("#field-save").addEventListener("click",saveGame);
  $("#field-load").addEventListener("click",loadGame);
  window.SpellField={startNewGame,returnFromWorkshop,onBattleWon,showDialog,updateObjective,renderQuestMarks,saveGame,loadGame};
})();