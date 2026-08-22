(() => {
  "use strict";

  const names = {
    town: "フルール村"
  };

  const legacyNames = {
    "はじまりの町": names.town
  };

  function applyFieldAreaName() {
    const area = document.querySelector(".field-area");
    if (!area) return;
    const replacement = legacyNames[area.textContent] || (window.SpellField?.currentMap?.() === "town" ? names.town : null);
    if (replacement && area.textContent !== replacement) area.textContent = replacement;
  }

  const area = document.querySelector(".field-area");
  if (area) {
    const observer = new MutationObserver(applyFieldAreaName);
    observer.observe(area, { childList: true, characterData: true, subtree: true });
  }

  window.SpellPlaces = {
    names: { ...names },
    nameFor: id => names[id] || null,
    refresh: applyFieldAreaName
  };

  applyFieldAreaName();
})();
