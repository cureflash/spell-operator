(() => {
  "use strict";

  const map = document.getElementById("field-map");
  const world = document.getElementById("field-world");
  if (!map || !world) return;

  const persistentIds = ["field-player", "field-follower", "field-enemy", "field-sign"];

  function syncEntityOwnership() {
    for (const id of persistentIds) {
      const entity = document.getElementById(id);
      if (!entity) continue;
      entity.classList.remove("room-grid-position", "party-lockstep");
      if (entity.parentElement !== world) world.appendChild(entity);
    }
  }

  syncEntityOwnership();
  const observer = new MutationObserver(syncEntityOwnership);
  observer.observe(map, { childList: true, subtree: true });
  window.addEventListener("resize", syncEntityOwnership);

  window.SpellFieldScene = {
    sync: syncEntityOwnership,
    isCompactRoom: () => world.dataset.map === "house1" || world.dataset.map === "house2"
  };
})();
