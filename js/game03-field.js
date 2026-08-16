(() => {
  "use strict";
  const G=window.SpellGame03,$=G.$,{FollowFieldModel,key}=window.SpellFieldModel;

  if(!G.itemDefinitions.unicodeChart){
    G.itemDefinitions.unicodeChart={
      name:"Unicode対応表",
      type:"key",
      price:0,
      description:"文字とUnicodeコードポイントの対応表。0–9: U+0030–U+0039 / A–Z: U+0041–U+005A / a–z: U+0061–U+007A。暗号解読の手掛かりになる。"
    };
  }

  const TOWN={width:20,height:14};
  const SCHOOL={width:16,height:12};
  const LIBRARY={width:16,height:12};
  const HOUSE1={width:11,height:9};
  const HOUSE2={width:12,height:9};

  const town={
    schoolDoor:{x:3,y:3},libraryDoor:{x:13,y:3},homeDoor:{x:2,y:8},shop:{x:11,y:11},enemy:{x:17,y:5},sign:{x:9,y:5},
    npcs:{parts:{x:16,y:10},traveler:{x:8,y:8}}
  };
  const school={exit:{x:7,y:11},npcs:{classmate:{x:9,y:4}}};
  const library={exit:{x:7,y:11},npcs:{librarian:{x:8,y:3}},unicode:{x:11,y:6}};
  const house1={exit:{x:5,y:8},stairs:{x:9,y:2},mother:{x:7,y:6,facing:"down"}};
  const house2={stairs:{x:10,y:7},pc:{x:9,y:2}};

  const dialogStyle=document.createElement("link");dialogStyle.rel="stylesheet";dialogStyle.href="css/dialog-portrait.css?v=2";document.head.appendChild(dialogStyle);
  const dialog=$("#field-dialog");
  dialog.innerHTML=`<div class="dialog-speaker"><div id="field-dialog-portrait" class="dialog-portrait" aria-hidden="true"></div><div id="field-dialog-name" class="dialog-name">SYSTEM</div></div><div class="dialog-message"><div id="field-dialog-text"></div><span class="dialog-next">▼</span></div>`;

  const model=new FollowFieldModel({width:TOWN.width,height:TOWN.height,blocked:[],player:{x:4,y:5,facing:"right"},follower:{x:3,y:5,facing:"right"}});
  const fieldState={mapId:"town",enemyDefeated:false,dialogOpen:false,steps:0};
  const speakers={
    sophie:{name:"ソフィー",portrait:"sophie"},
    lumiere:{name:"ルミエル",portrait:"lumiere"},
    classmate:{name:"クラスメイト",portrait:"traveler"},
    pijiburu:{name:"ピジブル",portrait:"traveler"},
    parts:{name:"パーツ屋の店主",portrait:"traveler"},
    traveler:{name:"旅人",portrait:"traveler"},
    mother:{name:"お母さん",portrait:"traveler"},
    sign:{name:"看板",portrait:"sign"},
    system:{name:"SYSTEM",portrait:"system"}
  };

  const addRect=(set,x1,y1,x2,y2)=>{for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)set.add(key(x,y));};
  const addBorder=(set,w,h)=>{for(let x=0;x<w;x++){set.add(key(x,0));set.add(key(x,h-1));}for(let y=1;y<h-1;y++){set.add(key(0,y));set.add(key(w-1,y));}};
  const inRect=(x,y,x1,y1,x2,y2)=>x>=x1&&x<=x2&&y>=y1&&y<=y2;

  function townBlocked(){const b=new Set();addBorder(b,TOWN.width,TOWN.height);addRect(b,1,1,5,3);addRect(b,11,1,15,3);addRect(b,15,7,18,9);addRect(b,10,10,12,11);addRect(b,1,6,4,8);addRect(b,6,1,9,3);Object.values(town.npcs).forEach(p=>b.add(key(p.x,p.y)));b.add(key(town.shop.x,town.shop.y));return b;}
  function schoolBlocked(){const b=new Set();addBorder(b,SCHOOL.width,SCHOOL.height);b.delete(key(school.exit.x,school.exit.y));addRect(b,2,3,4,3);addRect(b,6,3,8,3);addRect(b,10,3,12,3);addRect(b,2,6,4,6);addRect(b,6,6,8,6);addRect(b,10,6,12,6);b.add(key(school.npcs.classmate.x,school.npcs.classmate.y));return b;}
  function libraryBlocked(){const b=new Set();addBorder(b,LIBRARY.width,LIBRARY.height);b.delete(key(library.exit.x,library.exit.y));addRect(b,2,2,5,3);addRect(b,10,2,13,3);addRect(b,2,7,5,8);addRect(b,10,7,13,8);b.add(key(library.npcs.librarian.x,library.npcs.librarian.y));if(G.inventoryCount("unicodeChart")===0)b.add(key(library.unicode.x,library.unicode.y));return b;}
  function house1Blocked(){
    const b=new Set();addBorder(b,HOUSE1.width,HOUSE1.height);b.delete(key(house1.exit.x,house1.exit.y));
    addRect(b,1,1,4,2);
    addRect(b,2,4,4,5);
    addRect(b,6,3,8,3);
    addRect(b,8,1,9,1);
    b.add(key(house1.mother.x,house1.mother.y));
    return b;
  }
  function house2Blocked(){
    const b=new Set();addBorder(b,HOUSE2.width,HOUSE2.height);
    addRect(b,1,1,3,3);
    addRect(b,4,1,6,3);
    addRect(b,8,1,10,2);
    addRect(b,1,5,2,5);
    addRect(b,9,4,10,5);
    return b;
  }

  function mapSpec(id){
    if(id==="school")return{...SCHOOL,blocked:schoolBlocked(),area:"学校"};
    if(id==="library")return{...LIBRARY,blocked:libraryBlocked(),area:"ピジブルの図書館"};
    if(id==="house1")return{...HOUSE1,blocked:house1Blocked(),area:"ソフィーの家 1F"};
    if(id==="house2")return{...HOUSE2,blocked:house2Blocked(),area:"ソフィーとルミエルの部屋"};
    return{...TOWN,blocked:townBlocked(),area:"はじまりの町"};
  }

  function ensureWorld(){const map=$("#field-map");let world=$("#field-world");if(!world){world=document.createElement("div");world.id="field-world";world.className="field-world";map.insertBefore(world,map.firstChild);}const follower=$("#field-follower");if(follower&&follower.parentElement!==world)world.appendChild(follower);return world;}
  function clearWorld(world){[...world.querySelectorAll(".field-tile,.field-map-label,.school-marker,.story-npc,#field-shop,#field-unicode-item,.map-exit-marker,.library-marker,.house-marker")].forEach(el=>{if(el.id!=="field-npc")el.remove();});const classmate=$("#field-npc");if(classmate){classmate.classList.add("hidden");classmate.querySelector(".entity-tag")?.replaceChildren();}}
  function addMapLabel(world,text,x,y,w,className=""){const el=document.createElement("div");el.className=`field-map-label ${className}`.trim();el.textContent=text;el.style.setProperty("--x",x);el.style.setProperty("--y",y);el.style.setProperty("--w",w);world.appendChild(el);}
  function addMarker(world,text,x,y,className="map-exit-marker"){const el=document.createElement("div");el.className=className;el.textContent=text;el.style.setProperty("--x",x);el.style.setProperty("--y",y);world.appendChild(el);}
  function makeNpc(id,className,label){const el=document.createElement("div");el.id=id;el.className=`field-entity person npc-field story-npc ${className}`;el.innerHTML='<span class="pixel-head"></span><span class="pixel-body"></span><span class="entity-tag"></span>';el.setAttribute("aria-label",label);return el;}
  function makeUnicodeItem(){const el=document.createElement("div");el.id="field-unicode-item";el.className="field-entity field-key-item unicode-chart-item";el.setAttribute("aria-label","Unicode対応表");el.innerHTML='<span class="unicode-sheet">U+</span><span class="entity-tag">!</span>';return el;}

  function isTownPath(x,y){return (y===4&&x>=2&&x<=17)||(y===5&&x>=2&&x<=17)||(x===3&&y>=3&&y<=12)||(x===13&&y>=3&&y<=11)||(x===16&&y>=4&&y<=10)||(y===10&&x>=8&&x<=16)||(y===11&&x>=3&&x<=13);}
  function townTile(x,y){if(y===0||y===TOWN.height-1||x===0||x===TOWN.width-1)return"tree";if(inRect(x,y,6,1,9,3))return"water";if(inRect(x,y,1,1,5,3)){if(y===1)return"roof school-roof";if(x===3&&y===3)return"door school-door";return"building school-building";}if(inRect(x,y,1,6,4,8)){if(y===6)return"roof workshop-roof";if(x===2&&y===8)return"door workshop-door";return"building workshop-building";}if(inRect(x,y,11,1,15,3)){if(y===1)return"roof library-roof";if(x===13&&y===3)return"door library-door";return"building library-building";}if(inRect(x,y,15,7,18,9)){if(y===7)return"roof parts-roof";if(x===16&&y===9)return"door parts-door";return"building parts-building";}if(inRect(x,y,10,10,12,11)){if(y===10)return"roof shop-roof";if(x===11&&y===11)return"door shop-door";return"building shop-building";}if(isTownPath(x,y))return"path";if((x+y)%9===0)return"flower";return"grass";}
  function schoolTile(x,y){if(x===school.exit.x&&y===school.exit.y)return"interior-door";if(y===0||x===0||x===SCHOOL.width-1||y===SCHOOL.height-1)return"interior-wall school-wall";if(y===1&&x>=3&&x<=12)return"school-board";if((y===3||y===6)&&((x>=2&&x<=4)||(x>=6&&x<=8)||(x>=10&&x<=12)))return"school-desk";return"interior-floor school-floor";}
  function libraryTile(x,y){if(x===library.exit.x&&y===library.exit.y)return"interior-door";if(y===0||x===0||x===LIBRARY.width-1||y===LIBRARY.height-1)return"interior-wall library-wall";if((y===2||y===3||y===7||y===8)&&((x>=2&&x<=5)||(x>=10&&x<=13)))return"bookshelf";if(y===5&&x>=6&&x<=9)return"library-table";return"interior-floor library-floor";}
  function houseTile(){return"house-floor";}
  function tileForMap(id,x,y){if(id==="school")return schoolTile(x,y);if(id==="library")return libraryTile(x,y);if(id==="house1"||id==="house2")return houseTile(x,y);return townTile(x,y);}

  function buildMap(){
    const world=ensureWorld(),spec=mapSpec(fieldState.mapId);clearWorld(world);
    world.dataset.map=fieldState.mapId;
    world.style.gridTemplateColumns=`repeat(${spec.width},var(--tile-size))`;world.style.gridTemplateRows=`repeat(${spec.height},var(--tile-size))`;world.style.width=`calc(${spec.width} * var(--tile-size))`;world.style.height=`calc(${spec.height} * var(--tile-size))`;
    const frag=document.createDocumentFragment();for(let y=0;y<spec.height;y++)for(let x=0;x<spec.width;x++){const t=document.createElement("div");t.className=`field-tile ${tileForMap(fieldState.mapId,x,y)}`;t.dataset.x=x;t.dataset.y=y;frag.appendChild(t);}world.insertBefore(frag,world.firstChild);
    const area=document.querySelector(".field-area");if(area)area.textContent=spec.area;
    const classmate=$("#field-npc");
    if(fieldState.mapId==="town"){
      addMapLabel(world,"学校",1.25,1.42,4.5,"school-label");addMapLabel(world,"ソフィーの家",1.0,6.45,4.0);addMapLabel(world,"ピジブルの図書館",11.0,1.45,4.8);addMapLabel(world,"パーツ屋",15.1,7.45,3.8);addMapLabel(world,"魔導具店",10.0,10.15,3.0);addMarker(world,"↑ 学校",2.45,4.05,"school-marker");addMarker(world,"↑ 図書館",12.0,4.05,"library-marker");addMarker(world,"↑ 家",1.25,9.05,"house-marker");world.appendChild(makeNpc("field-parts-owner","npc-parts","パーツ屋の店主"));world.appendChild(makeNpc("field-traveler","npc-traveler","旅人"));const shopEl=document.createElement("div");shopEl.id="field-shop";shopEl.className="field-entity field-shop";shopEl.setAttribute("aria-label","魔導具店");shopEl.innerHTML='<span class="shop-icon">◆</span>';world.appendChild(shopEl);
    }else if(fieldState.mapId==="school"){
      if(classmate){classmate.classList.remove("hidden");classmate.classList.add("story-npc","npc-classmate");classmate.setAttribute("aria-label","クラスメイト");world.appendChild(classmate);}addMapLabel(world,"教室",5.7,.55,4.5,"interior-label");addMarker(world,"▼ 町へ",6.2,10.25);
    }else if(fieldState.mapId==="library"){
      addMapLabel(world,"ピジブルの図書館",4.4,.55,7.0,"interior-label");world.appendChild(makeNpc("field-librarian","npc-librarian","ピジブル"));if(G.inventoryCount("unicodeChart")===0)world.appendChild(makeUnicodeItem());addMarker(world,"▼ 町へ",6.2,10.25);
    }else if(fieldState.mapId==="house1"){
      world.appendChild(makeNpc("field-mother","npc-mother","お母さん"));
    }
  }

  function place(sel,pos){const el=$(sel);if(!el||!pos)return;el.style.setProperty("--x",pos.x);el.style.setProperty("--y",pos.y);if(pos.facing)el.dataset.facing=pos.facing;}
  function placeMapEntities(){if(fieldState.mapId==="town"){place("#field-parts-owner",town.npcs.parts);place("#field-traveler",town.npcs.traveler);place("#field-enemy",town.enemy);place("#field-sign",town.sign);place("#field-shop",town.shop);$("#field-enemy")?.classList.toggle("hidden",false);$("#field-sign")?.classList.toggle("hidden",false);}else{$("#field-enemy")?.classList.add("hidden");$("#field-sign")?.classList.add("hidden");}if(fieldState.mapId==="school")place("#field-npc",school.npcs.classmate);if(fieldState.mapId==="library"){place("#field-librarian",library.npcs.librarian);if(G.inventoryCount("unicodeChart")===0)place("#field-unicode-item",library.unicode);}if(fieldState.mapId==="house1")place("#field-mother",house1.mother);}
  function updateCamera(){const map=$("#field-map"),world=$("#field-world");if(!map||!world)return;const rect=map.getBoundingClientRect();if(rect.width<1||rect.height<1)return;const tile=parseFloat(getComputedStyle(map).getPropertyValue("--tile-size"))||40;const worldW=model.width*tile,worldH=model.height*tile;let tx=rect.width/2-(model.player.x+.5)*tile;let ty=rect.height/2-(model.player.y+.5)*tile;if(worldW<=rect.width)tx=(rect.width-worldW)/2;else tx=Math.min(0,Math.max(rect.width-worldW,tx));if(worldH<=rect.height)ty=(rect.height-worldH)/2;else ty=Math.min(0,Math.max(rect.height-worldH,ty));world.style.transform=`translate3d(${tx}px,${ty}px,0)`;}
  function renderQuestMarks(){const target=window.SpellStory?.questTarget?.(),marks={classmate:"#field-npc",librarian:"#field-librarian",parts:"#field-parts-owner"};Object.entries(marks).forEach(([k,sel])=>{const el=$(sel),tag=el?.querySelector(".entity-tag");if(!el||!tag)return;tag.textContent=target===k?"!":"";el.classList.toggle("quest-target",target===k);});const unicode=$("#field-unicode-item .entity-tag");if(unicode)unicode.textContent=G.inventoryCount("unicodeChart")===0?"!":"";}
  function render(){place("#field-player",model.player);place("#field-follower",model.follower);placeMapEntities();$("#field-enemy")?.classList.toggle("defeated",fieldState.enemyDefeated);renderQuestMarks();updateObjective();window.SpellMenu?.renderFieldMenu?.();updateCamera();}
  function updateObjective(){const storyObjective=window.SpellStory?.objective?.();let text;if(storyObjective)text=storyObjective;else if(fieldState.enemyDefeated)text="実戦成功。町を探索しよう";else if(G.magicReady())text="東の草むらにいる魔物へ向かおう";else text="2階のパソコンで Fire と Repair の魔導書に挑戦しよう";$("#field-objective").textContent=text;}
  function showDialog(payload,speakerKey="system"){const data=typeof payload==="string"?{text:payload,speaker:speakerKey}:payload,speaker=speakers[data.speaker]||speakers.system;fieldState.dialogOpen=true;$("#field-dialog-name").textContent=data.name||speaker.name;$("#field-dialog-text").textContent=data.text||"";dialog.dataset.portrait=data.portrait||speaker.portrait;dialog.classList.remove("hidden");}
  function closeDialog(){fieldState.dialogOpen=false;dialog.classList.add("hidden");}
  function same(a,b){return Boolean(a&&b&&a.x===b.x&&a.y===b.y);}
  function front(){return model.front(model.player);}
  function lumiereText(){if(fieldState.mapId==="house2")return"このくらいの広さの方が落ち着くね。パソコンは机のところ。";if(fieldState.mapId==="house1")return"お母さんがいると、ちゃんと帰ってきた感じがするね。";if(!window.SpellStory?.isComplete?.())return"今の目的は画面上部に出てるよ。建物の入口に向かえば別マップへ入れる。";return fieldState.enemyDefeated?"今の戦い、悪くなかった。":G.magicReady()?"Fire と Repair は修得済み。東側で実戦テストしよう。":"家の2階にあるパソコンで魔導書の問題を解こう。";}
  function directionToward(from,to){const dx=to.x-from.x,dy=to.y-from.y;if(dx===0&&dy===0)return from.facing||"down";if(Math.abs(dx)>Math.abs(dy))return dx>0?"right":"left";return dy>0?"down":"up";}
  function opposite(direction){return{up:"down",down:"up",left:"right",right:"left"}[direction]||"down";}
  function faceLumiere(){const direction=directionToward(model.player,model.follower);model.player.facing=direction;model.follower.facing=opposite(direction);render();}
  function talkToLumiere(){if(fieldState.dialogOpen){closeDialog();return}if(window.SpellStory?.isOverlayOpen?.())return;faceLumiere();showDialog({speaker:"lumiere",text:lumiereText()});}

  function normalizeHouseSnapshot(id,snapshot){if(!snapshot)return null;const spec=mapSpec(id),safe={...snapshot};const p=safe.player,f=safe.follower;const valid=o=>o&&Number.isFinite(o.x)&&Number.isFinite(o.y)&&o.x>=0&&o.y>=0&&o.x<spec.width&&o.y<spec.height;return valid(p)&&valid(f)?safe:null;}
  function activateMap(id,{snapshot=null,from=null,silent=false}={}){
    fieldState.mapId=id;const spec=mapSpec(id);model.width=spec.width;model.height=spec.height;model.blocked=new Set(spec.blocked);buildMap();const restored=(id==="house1"||id==="house2")?normalizeHouseSnapshot(id,snapshot):snapshot;
    if(restored){model.restore(restored);}else if(id==="school"){model.restore({player:{x:7,y:10,facing:"up"},follower:{x:7,y:11,facing:"up"}});}else if(id==="library"){model.restore({player:{x:7,y:10,facing:"up"},follower:{x:7,y:11,facing:"up"}});}else if(id==="house1"&&from==="house2"){model.restore({player:{x:9,y:3,facing:"up"},follower:{x:9,y:4,facing:"up"}});}else if(id==="house1"){model.restore({player:{x:5,y:7,facing:"up"},follower:{x:5,y:8,facing:"up"}});}else if(id==="house2"){model.restore({player:{x:10,y:6,facing:"up"},follower:{x:10,y:7,facing:"up"}});}else if(from==="school"){model.restore({player:{x:3,y:4,facing:"down"},follower:{x:3,y:3,facing:"down"}});}else if(from==="library"){model.restore({player:{x:13,y:4,facing:"down"},follower:{x:13,y:3,facing:"down"}});}else if(from==="house1"){model.restore({player:{x:2,y:9,facing:"down"},follower:{x:2,y:8,facing:"down"}});}else{model.restore({player:{x:4,y:5,facing:"right"},follower:{x:3,y:5,facing:"right"}});}closeDialog();render();requestAnimationFrame(updateCamera);
  }
  function transitionIfNeeded(next){if(fieldState.mapId==="town"&&same(next,town.schoolDoor)){activateMap("school",{from:"town"});return true;}if(fieldState.mapId==="town"&&same(next,town.libraryDoor)){activateMap("library",{from:"town"});return true;}if(fieldState.mapId==="town"&&same(next,town.homeDoor)){activateMap("house1",{from:"town"});return true;}if(fieldState.mapId==="school"&&same(next,school.exit)){activateMap("town",{from:"school"});return true;}if(fieldState.mapId==="library"&&same(next,library.exit)){activateMap("town",{from:"library"});return true;}if(fieldState.mapId==="house1"&&same(next,house1.exit)){activateMap("town",{from:"house1"});return true;}if(fieldState.mapId==="house1"&&same(next,house1.stairs)){activateMap("house2",{from:"house1"});return true;}if(fieldState.mapId==="house2"&&same(next,house2.stairs)){activateMap("house1",{from:"house2"});return true;}return false;}
  function takeUnicodeChart(){if(fieldState.mapId!=="library"||G.inventoryCount("unicodeChart")>0)return false;G.addItem("unicodeChart",1);model.blocked.delete(key(library.unicode.x,library.unicode.y));$("#field-unicode-item")?.remove();window.SpellItems?.renderBackpack?.();window.SpellStory?.onUnicodeChartPicked?.();render();showDialog({speaker:"system",text:"『Unicode対応表』を手に入れた！\n0–9 / A–Z / a–z のUnicodeコードポイントが載っている。"});return true;}
  function interact(){if(window.SpellStory?.isOverlayOpen?.())return;if(fieldState.dialogOpen){closeDialog();return}const f=front();if(same(f,model.follower)){showDialog({speaker:"lumiere",text:lumiereText()});return}if(fieldState.mapId==="school"&&same(f,school.npcs.classmate)){window.SpellStory?.handleNpc?.("classmate");return}if(fieldState.mapId==="library"&&same(f,library.npcs.librarian)){window.SpellStory?.handleNpc?.("librarian");return}if(fieldState.mapId==="library"&&same(f,library.unicode)&&G.inventoryCount("unicodeChart")===0){takeUnicodeChart();return}if(fieldState.mapId==="house1"&&same(f,house1.mother)){showDialog({speaker:"mother",text:"おかえり、ソフィー。ルミエルちゃんもいらっしゃい。\n2階を使うなら、散らかしっぱなしにしないのよ。"});return}if(fieldState.mapId==="house2"&&same(f,house2.pc)){G.openComputer?.();return}if(fieldState.mapId==="town"&&same(f,town.npcs.parts)){window.SpellStory?.handleNpc?.("parts");return}if(fieldState.mapId==="town"&&same(f,town.npcs.traveler)){showDialog({speaker:"traveler",text:"学校とピジブルの図書館は北側。ソフィーの家は西側だよ。"});return}if(fieldState.mapId==="town"&&same(f,town.shop)){window.SpellItems?.openShop?.();return}if(fieldState.mapId==="town"&&same(f,town.sign)){showDialog({speaker:"sign",text:"← 学校・ソフィーの家　　↑ ピジブルの図書館　　→ パーツ屋・魔導具店"});return}if(fieldState.mapId==="town"&&same(f,town.schoolDoor)){activateMap("school",{from:"town"});return}if(fieldState.mapId==="town"&&same(f,town.libraryDoor)){activateMap("library",{from:"town"});return}if(fieldState.mapId==="town"&&same(f,town.homeDoor)){activateMap("house1",{from:"town"});return}if(fieldState.mapId==="school"&&same(f,school.exit)){activateMap("town",{from:"school"});return}if(fieldState.mapId==="library"&&same(f,library.exit)){activateMap("town",{from:"library"});return}if(fieldState.mapId==="house1"&&same(f,house1.exit)){activateMap("town",{from:"house1"});return}if(fieldState.mapId==="house1"&&same(f,house1.stairs)){activateMap("house2",{from:"house1"});return}if(fieldState.mapId==="house2"&&same(f,house2.stairs)){activateMap("house1",{from:"house2"});return}}
  function tryMove(direction){if(fieldState.dialogOpen||window.SpellStory?.isOverlayOpen?.()||window.SpellMenu?.isOpen?.()||!G.screens.field.classList.contains("active"))return;const d=window.SpellFieldModel.DIRS[direction],next={x:model.player.x+d.x,y:model.player.y+d.y};model.player.facing=direction;if(transitionIfNeeded(next))return;if(fieldState.mapId==="town"&&!fieldState.enemyDefeated&&same(next,town.enemy)){render();if(!window.SpellStory?.isComplete?.())showDialog({speaker:"lumiere",text:"魔物は後。まず町の依頼を片付けよう。"});else if(G.magicReady())G.startFieldBattle();else showDialog({speaker:"lumiere",text:"Fire と Repair をまだ修得していない。家の2階でパソコンを開こう。"});return}const result=model.tryMove(direction);if(result.moved){fieldState.steps++;render()}else render();}

  function startNewGame(){G.showScreen("field");fieldState.enemyDefeated=false;fieldState.dialogOpen=false;fieldState.steps=0;activateMap("town",{silent:true});window.SpellStory?.startChapter1?.();requestAnimationFrame(updateCamera);}
  function returnFromWorkshop(){G.showScreen("field");render();requestAnimationFrame(updateCamera);}
  function onBattleWon(){fieldState.enemyDefeated=true;G.showScreen("field");render();requestAnimationFrame(updateCamera);setTimeout(()=>showDialog({speaker:"system",text:"グリッチスライムを倒した。"}),80);}
  function saveGame(){const data={version:12,magic:G.serializeMagic(),party:G.serializeParty(),items:G.serializeItems(),story:window.SpellStory?.serialize?.()||null,field:{...model.snapshot(),mapId:fieldState.mapId,enemyDefeated:fieldState.enemyDefeated,steps:fieldState.steps}};localStorage.setItem("spell-operator-v03",JSON.stringify(data));if(G.screens.field.classList.contains("active"))showDialog({speaker:"system",text:"セーブしました。"});return true;}
  function loadGame(){try{const raw=localStorage.getItem("spell-operator-v03");if(!raw){showDialog({speaker:"system",text:"セーブデータがありません。"});return}const data=JSON.parse(raw);G.restoreMagic(data.magic||{});G.restoreItems(data.items||{});G.restoreParty(data.party||{});window.SpellStory?.restore?.(data.story);fieldState.enemyDefeated=Boolean(data.field?.enemyDefeated);fieldState.steps=Number(data.field?.steps||0);G.showScreen("field");activateMap(data.field?.mapId||"town",{snapshot:data.field,silent:true});showDialog({speaker:"system",text:"ロードしました。"});}catch(e){console.error(e);showDialog({speaker:"system",text:"ロードに失敗しました。"});}}
  function isSpaceKey(e){return e.code==="Space"||e.key===" "||e.key==="Spacebar";}
  function isEnterKey(e){return e.key==="Enter"||e.code==="Enter"||e.code==="NumpadEnter";}
  function keydown(e){if(!G.screens.field.classList.contains("active")||window.SpellStory?.isOverlayOpen?.())return;const map={ArrowUp:"up",w:"up",W:"up",ArrowDown:"down",s:"down",S:"down",ArrowLeft:"left",a:"left",A:"left",ArrowRight:"right",d:"right",D:"right"};if(map[e.key]){e.preventDefault();tryMove(map[e.key]);return}if(isSpaceKey(e)){e.preventDefault();talkToLumiere();return}if(isEnterKey(e)){e.preventDefault();interact();}}

  activateMap("town",{silent:true});document.addEventListener("keydown",keydown);window.addEventListener("resize",()=>requestAnimationFrame(updateCamera));document.querySelectorAll("[data-dir]").forEach(b=>b.addEventListener("click",()=>tryMove(b.dataset.dir)));$("#field-action").addEventListener("click",interact);$("#field-save").addEventListener("click",saveGame);$("#field-load").addEventListener("click",loadGame);window.SpellField={startNewGame,returnFromWorkshop,onBattleWon,showDialog,updateObjective,renderQuestMarks,saveGame,loadGame,currentMap:()=>fieldState.mapId,activateMap};
})();
