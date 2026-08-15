(() => {
  "use strict";

  const player = document.getElementById("field-player");
  if (!player) return;

  const keyToDirection = {
    ArrowUp: "up", w: "up", W: "up",
    ArrowDown: "down", s: "down", S: "down",
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right"
  };

  let previousX = Number(player.style.getPropertyValue("--x") || 0);
  let previousY = Number(player.style.getPropertyValue("--y") || 0);
  let walkPhase = 0;
  let idleTimer = null;

  player.dataset.facing = player.classList.contains("facing-left") ? "left" : "up";
  player.dataset.frame = "1";

  function face(direction) {
    if (!direction) return;
    player.dataset.facing = direction;
  }

  function animateStep() {
    walkPhase ^= 1;
    player.dataset.frame = walkPhase ? "0" : "2";
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      player.dataset.frame = "1";
    }, 125);
  }

  function readPosition() {
    return {
      x: Number(player.style.getPropertyValue("--x") || 0),
      y: Number(player.style.getPropertyValue("--y") || 0)
    };
  }

  const observer = new MutationObserver(() => {
    const current = readPosition();
    const dx = current.x - previousX;
    const dy = current.y - previousY;

    if (dx || dy) {
      if (Math.abs(dx) >= Math.abs(dy)) face(dx < 0 ? "left" : "right");
      else face(dy < 0 ? "up" : "down");
      animateStep();
      previousX = current.x;
      previousY = current.y;
    }
  });

  observer.observe(player, { attributes: true, attributeFilter: ["style"] });

  document.addEventListener("keydown", event => {
    const direction = keyToDirection[event.key];
    if (direction) face(direction);
  }, true);

  document.querySelectorAll("[data-dir]").forEach(button => {
    button.addEventListener("pointerdown", () => face(button.dataset.dir), true);
    button.addEventListener("click", () => face(button.dataset.dir), true);
  });
})();
