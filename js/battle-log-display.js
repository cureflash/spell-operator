(() => {
  "use strict";

  const battleScreen = document.getElementById("screen-battle");
  const battleLog = document.getElementById("battle-log");
  const menuWrap = battleScreen?.querySelector(".battle-menu-wrap");
  if (!battleScreen || !battleLog) return;

  const style = document.createElement("style");
  style.id = "spell-battle-log-display-style";
  style.textContent = `
    html body #screen-battle .battle-log {
      position: relative !important;
      color: transparent !important;
      text-shadow: none !important;
    }
    html body #screen-battle .battle-log::after {
      content: attr(data-battle-display);
      position: absolute;
      inset: 16px 18px;
      display: block;
      color: #fff;
      white-space: pre-line;
      font-family: ui-monospace, "Noto Sans JP", monospace;
      font-size: 15px;
      line-height: 1.7;
      text-shadow: 1px 1px 0 #000;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);

  function normalize(line) {
    return String(line || "").trim()
      .replace(/^ソフィーはどうする？$/, "ソフィーは どうする？")
      .replace(/^ルミエルはどうする？$/, "ルミエルは どうする？");
  }

  function keep(line) {
    if (!line) return false;
    if (/^(ソフィー|ルミエル)：(?:たたかう|ぼうぎょ)$/.test(line)) return false;
    if (/^ソフィーの行動を決めた。$/.test(line)) return false;
    return true;
  }

  function fallbackPrompt() {
    if (!battleScreen.classList.contains("active")) return "";
    const visible = menuWrap
      ? [...menuWrap.querySelectorAll(".command-grid")].find(grid => !grid.classList.contains("hidden"))
      : null;
    if (!visible) return "";
    if (visible.id === "sophie-menu") return "ソフィーは どうする？";
    if (visible.id === "lumiere-menu") return "ルミエルは どうする？";
    if (visible.id === "magic-menu") return "どの まほうを つかう？";
    if (visible.id === "heal-target-menu") return "だれに つかう？";
    return "";
  }

  function refresh() {
    const lines = String(battleLog.textContent || "")
      .split(/\r?\n/)
      .map(normalize)
      .filter(keep)
      .slice(-4);

    const display = lines.join("\n") || fallbackPrompt();
    battleLog.setAttribute("data-battle-display", display);
  }

  new MutationObserver(refresh).observe(battleLog, {
    childList: true,
    subtree: true,
    characterData: true
  });

  if (menuWrap) {
    new MutationObserver(refresh).observe(menuWrap, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "hidden", "disabled"]
    });
  }

  new MutationObserver(refresh).observe(battleScreen, {
    attributes: true,
    attributeFilter: ["class"]
  });

  refresh();
  window.SpellBattleLogDisplay = { refresh };
})();
