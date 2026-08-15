(() => {
  "use strict";
  const G=window.SpellGame03,$=G.$,state=G.state;
  let message="";

  const memberName=key=>G.partySpecies[key]?.name||key;
  const statLabel={attack:"攻撃",defense:"防御",spAttack:"特攻",spDefense:"特防",speed:"素早さ",hp:"HP"};

  function ensureScreens(){
    const main=document.querySelector("main.shell");
    if(!main)return;
    if(!$("#screen-backpack")){
      const section=document.createElement("section");
      section.id="screen-backpack";section.className="screen";
      section.innerHTML=`
        <div class="inventory-screen-wrap">
          <div class="inventory-toolbar">
            <div><p class="kicker">BACKPACK</p><h2>リュック</h2></div>
            <div class="inventory-money" id="backpack-money">0 G</div>
            <button id="backpack-back" class="secondary">フィールドへ戻る</button>
          </div>
          <div id="equipment-panel" class="equipment-panel"></div>
          <div id="inventory-list" class="inventory-list"></div>
          <p id="inventory-message" class="inventory-message"></p>
        </div>`;
      const hub=$("#screen-hub");main.insertBefore(section,hub||null);G.screens.backpack=section;
    }
    if(!$("#screen-shop")){
      const section=document.createElement("section");
      section.id="screen-shop";section.className="screen";
      section.innerHTML=`
        <div class="shop-screen-wrap">
          <div class="inventory-toolbar">
            <div><p class="kicker">MAGIC ITEM SHOP</p><h2>魔導具店</h2></div>
            <div class="inventory-money" id="shop-money">0 G</div>
            <button id="shop-back" class="secondary">店を出る</button>
          </div>
          <p class="shop-greeting">店主「回復薬と魔導書を扱っているよ。魔導書は装備すると能力が上がる。」</p>
          <div id="shop-list" class="shop-list"></div>
          <p id="shop-message" class="inventory-message"></p>
        </div>`;
      const hub=$("#screen-hub");main.insertBefore(section,hub||null);G.screens.shop=section;
    }
  }

  function equipmentText(memberKey){
    const itemKey=state.equipment[memberKey],item=G.itemDefinitions[itemKey];
    if(!item)return "装備なし";
    return `${item.name}（${statLabel[item.stat]||item.stat} +${item.bonus}）`;
  }

  function inventoryRow(key,item,count){
    const meta=item.type==="equipment"?`${statLabel[item.stat]||item.stat} +${item.bonus}`:item.healHp?`HP +${item.healHp}`:`MP +${item.healMp}`;
    let actions="";
    if(item.type==="consumable"){
      if(item.healMp)actions=`<button data-use-item="${key}" data-target="lumiere">ルミエルに使う</button>`;
      else actions=`<button data-use-item="${key}" data-target="sophie">ソフィーに使う</button><button data-use-item="${key}" data-target="lumiere">ルミエルに使う</button>`;
    }else{
      actions=`<button data-equip-item="${key}" data-target="sophie">ソフィーに装備</button><button data-equip-item="${key}" data-target="lumiere">ルミエルに装備</button>`;
    }
    return `<article class="inventory-item">
      <div class="inventory-item-main"><div><strong>${item.name}</strong><span class="item-meta">${meta}</span></div><span class="item-count">×${count}</span></div>
      <p>${item.description}</p><div class="inventory-actions">${actions}</div>
    </article>`;
  }

  function renderBackpack(){
    $("#backpack-money").textContent=`${state.money} G`;
    const equip=$("#equipment-panel");
    equip.innerHTML=["sophie","lumiere"].map(key=>`<div class="equipment-card"><div><strong>${memberName(key)}</strong><span>${equipmentText(key)}</span></div>${state.equipment[key]?`<button data-unequip-member="${key}">外す</button>`:""}</div>`).join("");
    const keys=Object.keys(G.itemDefinitions).filter(key=>G.inventoryCount(key)>0);
    $("#inventory-list").innerHTML=keys.length?keys.map(key=>inventoryRow(key,G.itemDefinitions[key],G.inventoryCount(key))).join(""):`<div class="inventory-empty">リュックは空です。</div>`;
    $("#inventory-message").textContent=message;
    window.SpellMenu?.renderStatus?.();window.SpellMenu?.renderFieldMenu?.();
  }

  function shopCard(key,item){
    const owned=G.inventoryCount(key)+(state.equipment.sophie===key?1:0)+(state.equipment.lumiere===key?1:0);
    return `<article class="shop-item"><div class="shop-item-head"><strong>${item.name}</strong><span>${item.price} G</span></div><p>${item.description}</p><div class="shop-item-foot"><span>所持 ${owned}</span><button data-buy-item="${key}" ${state.money<item.price?"disabled":""}>買う</button></div></article>`;
  }

  function renderShop(){
    $("#shop-money").textContent=`${state.money} G`;
    $("#shop-list").innerHTML=Object.entries(G.itemDefinitions).map(([key,item])=>shopCard(key,item)).join("");
    $("#shop-message").textContent=message;
    window.SpellMenu?.renderFieldMenu?.();
  }

  function openBackpack(){message="";renderBackpack();G.showScreen("backpack")}
  function openShop(){message="";renderShop();G.showScreen("shop")}
  function returnField(){message="";G.showScreen("field")}

  function buy(key){
    const item=G.itemDefinitions[key];
    if(!item)return;
    if(!G.buyItem(key)){message="お金が足りません。";renderShop();return;}
    message=`${item.name}を買った。`;
    renderShop();
  }

  function use(key,target){
    const item=G.itemDefinitions[key],result=G.useItem(target,key);
    if(!result.ok){message=item?.healMp&&target!=="lumiere"?"これはルミエル専用です。":"今は使う必要がありません。";renderBackpack();return;}
    message=`${memberName(target)}に${item.name}を使った。${result.amount}回復した。`;
    renderBackpack();
  }

  function equip(key,target){
    const item=G.itemDefinitions[key];
    if(!G.equipItem(target,key)){message="装備できません。";renderBackpack();return;}
    message=`${memberName(target)}は${item.name}を装備した。`;
    renderBackpack();
  }

  function unequip(target){
    const old=state.equipment[target],item=G.itemDefinitions[old];
    if(!G.unequipItem(target)){message="装備していません。";renderBackpack();return;}
    message=`${memberName(target)}は${item.name}を外した。`;
    renderBackpack();
  }

  ensureScreens();
  $("#backpack-back")?.addEventListener("click",returnField);
  $("#shop-back")?.addEventListener("click",returnField);
  $("#inventory-list")?.addEventListener("click",e=>{
    const useBtn=e.target.closest("[data-use-item]");if(useBtn){use(useBtn.dataset.useItem,useBtn.dataset.target);return;}
    const equipBtn=e.target.closest("[data-equip-item]");if(equipBtn){equip(equipBtn.dataset.equipItem,equipBtn.dataset.target);}
  });
  $("#equipment-panel")?.addEventListener("click",e=>{const b=e.target.closest("[data-unequip-member]");if(b)unequip(b.dataset.unequipMember);});
  $("#shop-list")?.addEventListener("click",e=>{const b=e.target.closest("[data-buy-item]");if(b)buy(b.dataset.buyItem);});

  window.SpellItems={openBackpack,openShop,renderBackpack,renderShop};
})();