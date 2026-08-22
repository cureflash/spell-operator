(() => {
  "use strict";

  const STEP_MS = 105;
  let lockUntil = 0;
  let queued = null;
  let timer = 0;
  let bypass = false;

  const directionFromKey = event => ({
    ArrowUp: "up", w: "up", W: "up",
    ArrowDown: "down", s: "down", S: "down",
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right"
  })[event.key] || null;

  const fieldActive = () => Boolean(document.getElementById("screen-field")?.classList.contains("active"));
  const dialogOpen = () => Boolean(document.getElementById("field-dialog") && !document.getElementById("field-dialog").classList.contains("hidden"));
  const blockedByUi = () => Boolean(
    window.SpellMapTransition?.isActive?.() ||
    window.SpellStory?.isOverlayOpen?.() ||
    window.SpellMenu?.isOpen?.() ||
    window.SpellPlugin?.isTransitioning?.() ||
    dialogOpen()
  );

  function scheduleFlush() {
    clearTimeout(timer);
    timer = setTimeout(flush, Math.max(0, lockUntil - performance.now()) + 1);
  }

  function dispatch(item) {
    bypass = true;
    try {
      if (item.kind === "key") {
        const data = {
          up: { key: "ArrowUp", code: "ArrowUp" },
          down: { key: "ArrowDown", code: "ArrowDown" },
          left: { key: "ArrowLeft", code: "ArrowLeft" },
          right: { key: "ArrowRight", code: "ArrowRight" }
        }[item.direction];
        if (data) document.dispatchEvent(new KeyboardEvent("keydown", { ...data, bubbles: true, cancelable: true }));
      } else {
        document.querySelector(`[data-dir="${item.direction}"]`)?.click();
      }
    } finally {
      bypass = false;
    }
  }

  function flush() {
    timer = 0;
    if (!queued) return;
    if (!fieldActive()) {
      queued = null;
      return;
    }
    if (blockedByUi()) {
      timer = setTimeout(flush, 25);
      return;
    }
    const item = queued;
    queued = null;
    lockUntil = performance.now() + STEP_MS;
    dispatch(item);
    scheduleFlush();
  }

  function acceptOrQueue(item, event) {
    if (bypass || !fieldActive()) return;
    if (blockedByUi()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const now = performance.now();
    if (now >= lockUntil) {
      lockUntil = now + STEP_MS;
      scheduleFlush();
      return;
    }
    queued = item;
    event.preventDefault();
    event.stopImmediatePropagation();
    scheduleFlush();
  }

  document.addEventListener("keydown", event => {
    const direction = directionFromKey(event);
    if (direction) acceptOrQueue({ kind: "key", direction }, event);
  }, true);

  document.addEventListener("click", event => {
    const button = event.target.closest?.("[data-dir]");
    if (button) acceptOrQueue({ kind: "click", direction: button.dataset.dir }, event);
  }, true);

  window.SpellFieldInput = {
    isStepLocked: () => performance.now() < lockUntil,
    clearStepQueue: () => {
      queued = null;
      lockUntil = 0;
      clearTimeout(timer);
      timer = 0;
    }
  };
})();
