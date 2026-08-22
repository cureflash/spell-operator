(() => {
  "use strict";

  const G = window.SpellGame03;
  if (!G) throw new Error("Plug-in workspace dependencies are not loaded.");

  const hub = document.getElementById("screen-hub");
  const debug = document.getElementById("screen-debug");
  if (!hub || !debug) return;

  const TUTORIAL_URL = "data/plugin-tutorial-dialogues.json";
  const MENU_HINTS = {
    editor: "エディタでは、私に書き込むPythonのプログラムを編集できるよ。",
    tutorial: "プラグイン画面とエディタの使い方を、もう一度説明するよ。",
    custom: "カスタムはまだ準備中だよ。今は選ぶことだけできるの。",
    back: "プラグインを終了して、フィールドに戻るよ。"
  };

  let tutorialPromise = null;
  let selectedLibraryKey = null;
  let hubMenuIndex = 0;
  let hubMenuItems = [];
  let hubWasActive = false;
  let debugWasActive = false;
  let grimoireOpen = false;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  function makeConversationBox(textId, initialText) {
    const box = el("section", "field-dialog plugin-field-dialog");
    box.dataset.portrait = "lumiere";

    const speaker = el("div", "dialog-speaker");
    const portrait = el("div", "dialog-portrait has-character-portrait");
    portrait.setAttribute("aria-hidden", "true");
    portrait.style.backgroundImage = 'url("assets/characters/portraits/lumiere/neutral.jpg?v=2")';
    portrait.style.backgroundSize = "cover";
    portrait.style.backgroundPosition = "center";
    portrait.style.backgroundRepeat = "no-repeat";
    const name = el("div", "dialog-name", "ルミエル");
    speaker.append(portrait, name);

    const message = el("div", "dialog-message");
    const text = el("div", "plugin-conversation-text", initialText);
    text.id = textId;
    const next = el("span", "dialog-next", "▼");
    message.append(text, next);

    box.append(speaker, message);
    return { box, text, name, next };
  }

  function setHubDialogue(text) {
    const output = document.getElementById("plugin-hub-dialogue");
    if (output) output.textContent = String(text ?? "");
  }

  function setDebugOutput(text, kind = "lumiere") {
    const output = document.getElementById("console-output");
    if (!output) return;
    output.dataset.outputKind = kind;
    output.textContent = String(text ?? "");
  }

  function loadTutorial() {
    if (!tutorialPromise) {
      tutorialPromise = fetch(TUTORIAL_URL, { cache: "no-store" })
        .then(response => {
          if (!response.ok) throw new Error(`Failed to load ${TUTORIAL_URL}: ${response.status}`);
          return response.json();
        })
        .catch(error => {
          console.warn("Plug-in tutorial dialogue could not be loaded.", error);
          return { menu_hints: MENU_HINTS, plugin_intro: [] };
        });
    }
    return tutorialPromise;
  }

  async function playTutorial() {
    const table = await loadTutorial();
    const lines = Array.isArray(table?.plugin_intro) ? table.plugin_intro.filter(Boolean) : [];
    setHubDialogue(lines.length ? lines.join("\n\n") : "説明データを読み込めなかったみたい。");
  }

  function currentHubMenuKey() {
    return hubMenuItems[hubMenuIndex]?.dataset.pluginMenuKey || "editor";
  }

  function showMenuHint(key) {
    const normalized = key || "editor";
    setHubDialogue(MENU_HINTS[normalized] || MENU_HINTS.editor);
    loadTutorial().then(table => {
      if (currentHubMenuKey() !== normalized) return;
      const hint = table?.menu_hints?.[normalized];
      if (typeof hint === "string" && hint.trim()) setHubDialogue(hint.trim());
    });
  }

  function selectHubMenu(index, { focus = true, announce = true } = {}) {
    if (!hubMenuItems.length) return;
    const count = hubMenuItems.length;
    hubMenuIndex = ((index % count) + count) % count;
    hubMenuItems.forEach((button, i) => {
      const selected = i === hubMenuIndex;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.tabIndex = selected ? 0 : -1;
    });
    const selected = hubMenuItems[hubMenuIndex];
    if (focus) {
      try { selected.focus({ preventScroll: true }); } catch (_) { selected.focus(); }
    }
    if (announce) showMenuHint(selected.dataset.pluginMenuKey);
  }

  function activateHubMenu() {
    const selected = hubMenuItems[hubMenuIndex];
    if (!selected || selected.getAttribute("aria-disabled") === "true") return;
    selected.click();
  }

  function firstUnlockedSpellbook() {
    const keys = Object.keys(G.spellDefinitions || {});
    const selected = G.state?.selectedSpellKey;
    if (selected && G.isSpellbookUnlocked?.(selected)) return selected;
    return keys.find(key => G.isSpellbookUnlocked?.(key)) || null;
  }

  function openEditorFromMenu() {
    const key = firstUnlockedSpellbook();
    if (!key) {
      setHubDialogue("今は開ける魔導書がないみたい。");
      return;
    }
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.hidden = true;
    trigger.dataset.pythonSpellbook = key;
    hub.appendChild(trigger);
    trigger.click();
    trigger.remove();
    queueMicrotask(() => {
      setGrimoireOpen(false);
      syncActiveScreen();
    });
  }

  function makeResizer(className, label) {
    const node = el("div", `plugin-resizer ${className}`);
    node.tabIndex = 0;
    node.setAttribute("role", "separator");
    node.setAttribute("aria-label", label);
    return node;
  }

  function buildHub() {
    const returnField = document.getElementById("return-field");
    if (!returnField) return;

    returnField.textContent = "戻る";
    returnField.className = "plugin-menu-button secondary";
    returnField.removeAttribute("style");
    returnField.dataset.pluginMenuKey = "back";

    const shell = el("div", "plugin-hub-shell plugin-workspace");
    shell.id = "plugin-hub-shell";
    const upper = el("div", "plugin-hub-upper");

    const lumierePane = el("section", "panel plugin-lumiere-pane");
    const portrait = new Image();
    portrait.src = "assets/characters/portraits/lumiere/neutral.jpg";
    portrait.alt = "ルミエル";
    portrait.className = "plugin-lumiere-portrait";
    const lumiereCaption = el("div", "plugin-lumiere-caption");
    lumiereCaption.append(el("p", "eyebrow", "LUMIERE.EXE"), el("h2", "", "ルミエル"));
    lumierePane.append(portrait, lumiereCaption);

    const columnResizer = makeResizer("vertical", "ルミエル表示とメニューの幅を変更");
    const menuPane = el("section", "panel plugin-menu-pane");
    menuPane.append(el("p", "eyebrow", "PLUGIN MENU"), el("h2", "", "メニュー"));
    const menuList = el("div", "plugin-menu-list");

    const editorButton = el("button", "plugin-menu-button secondary", "エディタ");
    editorButton.id = "plugin-open-editor";
    editorButton.type = "button";
    editorButton.dataset.pluginMenuKey = "editor";

    const tutorialButton = el("button", "plugin-menu-button secondary", "チュートリアル");
    tutorialButton.id = "plugin-open-tutorial";
    tutorialButton.type = "button";
    tutorialButton.dataset.pluginMenuKey = "tutorial";

    const customButton = el("button", "plugin-menu-button secondary is-disabled", "カスタム");
    customButton.id = "plugin-open-custom";
    customButton.type = "button";
    customButton.dataset.pluginMenuKey = "custom";
    customButton.setAttribute("aria-disabled", "true");
    customButton.title = "未実装";

    menuList.append(editorButton, tutorialButton, customButton, returnField);
    menuPane.append(menuList);
    hubMenuItems = [editorButton, tutorialButton, customButton, returnField];
    upper.append(lumierePane, columnResizer, menuPane);

    const rowResizer = makeResizer("horizontal", "上部とルミエルのセリフ欄の高さを変更");
    const dialogue = makeConversationBox("plugin-hub-dialogue", MENU_HINTS.editor);
    shell.append(upper, rowResizer, dialogue.box);
    hub.replaceChildren(shell);

    editorButton.addEventListener("click", openEditorFromMenu);
    tutorialButton.addEventListener("click", playTutorial);
    hubMenuItems.forEach((button, index) => {
      button.addEventListener("focus", () => selectHubMenu(index, { focus: false, announce: true }));
      button.addEventListener("pointerenter", () => selectHubMenu(index, { focus: false, announce: true }));
      button.addEventListener("pointerdown", () => selectHubMenu(index, { focus: false, announce: true }));
    });

    bindResizer(columnResizer, { container: upper, owner: shell, axis: "x", variable: "--plugin-hub-left", min: 0.24, max: 0.52 });
    bindResizer(rowResizer, { container: shell, owner: shell, axis: "y", variable: "--plugin-hub-upper", min: 0.48, max: 0.80 });
    selectHubMenu(0, { focus: false, announce: true });
  }

  function buildEditor() {
    const title = document.getElementById("debug-title");
    const badge = document.getElementById("spell-badge");
    const reset = document.getElementById("reset-code");
    const editor = document.getElementById("code-editor");
    const hint = document.querySelector("#screen-debug .hint-box");
    const run = document.getElementById("run-code");
    const register = document.getElementById("register-spell");
    const back = document.getElementById("back-workshop");
    const runState = document.getElementById("run-state");
    const output = document.getElementById("console-output");
    const metrics = document.querySelector("#screen-debug .metrics");
    if (!title || !badge || !reset || !editor || !hint || !run || !back || !runState || !output || !metrics) return;

    reset.textContent = "コードをクリア";
    back.textContent = "メニューへ戻る";

    const shell = el("div", "plugin-editor-shell plugin-workspace");
    shell.id = "plugin-editor-shell";
    const upper = el("div", "plugin-editor-upper");

    const editorPane = el("section", "panel editor-panel plugin-code-pane");
    const editorHead = el("div", "plugin-editor-head");
    const titleWrap = el("div", "plugin-editor-title");
    titleWrap.append(el("p", "eyebrow", "PYTHON EDITOR"), title);
    const editorActions = el("div", "plugin-editor-actions");
    editorActions.append(badge, reset);
    editorHead.append(titleWrap, editorActions);
    editorPane.append(editorHead, hint, editor);

    const columnResizer = makeResizer("vertical", "エディタと実行欄の幅を変更");
    const rightPane = el("aside", "plugin-right-pane grimoire-collapsed");
    rightPane.id = "plugin-right-pane";

    const grimoirePane = el("section", "panel plugin-code-library-pane");
    const grimoireToggle = el("button", "plugin-panel-head plugin-grimoire-toggle");
    grimoireToggle.id = "plugin-grimoire-toggle";
    grimoireToggle.type = "button";
    grimoireToggle.setAttribute("aria-expanded", "false");
    const grimoireTitle = el("div");
    grimoireTitle.append(el("p", "eyebrow", "GRIMOIRE"), el("h3", "", "魔導書"));
    const libraryStatus = el("span", "plugin-library-status", "▶ 開く");
    grimoireToggle.append(grimoireTitle, libraryStatus);

    const libraryBody = el("div", "plugin-library-body");
    libraryBody.id = "plugin-library-body";
    libraryBody.hidden = true;
    const list = el("div", "plugin-code-library-list");
    list.id = "plugin-code-library";
    const preview = el("pre", "plugin-code-preview", "保存されたコードを選んでください。");
    preview.id = "plugin-code-preview";
    const copy = el("button", "secondary compact plugin-copy-code", "コピー");
    copy.id = "plugin-copy-code";
    copy.type = "button";
    copy.disabled = true;
    libraryBody.append(list, preview, copy);
    grimoirePane.append(grimoireToggle, libraryBody);

    const rightResizer = makeResizer("horizontal", "魔導書と実行欄の高さを変更");
    rightResizer.id = "plugin-grimoire-resizer";

    const runPane = el("section", "panel plugin-run-pane");
    const runHead = el("div", "plugin-panel-head");
    runHead.append(el("h3", "", "実行"), runState);
    const runActions = el("div", "plugin-run-actions");
    run.classList.add("plugin-run-button");
    runActions.append(run);
    if (register) runActions.append(register);
    runPane.append(runHead, runActions, metrics, back);
    rightPane.append(grimoirePane, rightResizer, runPane);
    upper.append(editorPane, columnResizer, rightPane);

    const rowResizer = makeResizer("horizontal", "エディタ領域とルミエルのセリフ欄の高さを変更");
    const dialogue = makeConversationBox("plugin-editor-dialogue-text", "Pythonコードを書いてテスト実行してみてね。");
    dialogue.box.classList.add("plugin-editor-dialogue");
    dialogue.name.id = "plugin-editor-dialogue-name";
    dialogue.next.id = "plugin-editor-dialogue-next";
    output.classList.add("plugin-runtime-source");

    shell.append(upper, rowResizer, dialogue.box, output);
    debug.replaceChildren(shell);

    grimoireToggle.addEventListener("click", () => setGrimoireOpen(!grimoireOpen));
    copy.addEventListener("click", copySelectedCode);
    new MutationObserver(() => {
      syncRuntimeDialogue();
      if (grimoireOpen) renderCodeLibrary();
    }).observe(output, { childList: true, subtree: true, characterData: true });

    bindResizer(columnResizer, { container: upper, owner: shell, axis: "x", variable: "--plugin-editor-left", min: 0.42, max: 0.78 });
    bindResizer(rightResizer, { container: rightPane, owner: rightPane, axis: "y", variable: "--plugin-grimoire-height", min: 0.22, max: 0.68 });
    bindResizer(rowResizer, { container: shell, owner: shell, axis: "y", variable: "--plugin-editor-upper", min: 0.54, max: 0.84 });

    setGrimoireOpen(false);
    renderCodeLibrary();
    syncRuntimeDialogue();
  }

  function setGrimoireOpen(open) {
    grimoireOpen = Boolean(open);
    const rightPane = document.getElementById("plugin-right-pane");
    const body = document.getElementById("plugin-library-body");
    const toggle = document.getElementById("plugin-grimoire-toggle");
    const status = toggle?.querySelector(".plugin-library-status");
    if (rightPane) {
      rightPane.classList.toggle("grimoire-open", grimoireOpen);
      rightPane.classList.toggle("grimoire-collapsed", !grimoireOpen);
    }
    if (body) body.hidden = !grimoireOpen;
    if (toggle) toggle.setAttribute("aria-expanded", grimoireOpen ? "true" : "false");
    if (status) status.textContent = grimoireOpen ? "▼ 閉じる" : "▶ 開く";
    if (grimoireOpen) renderCodeLibrary();
    return grimoireOpen;
  }

  function savedCodeEntries() {
    return Object.entries(G.state?.registeredSpells || {})
      .filter(([key, spell]) => G.isSpellLearned?.(key) && typeof spell?.source === "string" && spell.source.trim())
      .map(([key, spell]) => ({
        key,
        name: spell.name || G.spellDefinitions?.[key]?.name || key,
        source: spell.source,
        mpCost: spell.mpCost
      }));
  }

  function renderCodeLibrary() {
    const list = document.getElementById("plugin-code-library");
    const preview = document.getElementById("plugin-code-preview");
    const copy = document.getElementById("plugin-copy-code");
    if (!list || !preview || !copy) return;

    const entries = savedCodeEntries();
    if (!entries.some(entry => entry.key === selectedLibraryKey)) selectedLibraryKey = entries[0]?.key || null;
    list.replaceChildren();

    if (!entries.length) {
      list.append(el("p", "plugin-library-empty", "保存されたコードはまだありません。"));
      preview.textContent = "魔法を修得すると、ここから過去のコードを参照できます。";
      copy.disabled = true;
      return;
    }

    for (const entry of entries) {
      const button = el("button", `plugin-code-entry${entry.key === selectedLibraryKey ? " selected" : ""}`);
      button.type = "button";
      button.dataset.savedCodeKey = entry.key;
      button.append(
        el("span", "plugin-code-entry-name", entry.name),
        el("span", "plugin-code-entry-meta", Number.isFinite(entry.mpCost) ? `MP ${entry.mpCost}` : "保存済み")
      );
      button.addEventListener("click", () => {
        selectedLibraryKey = entry.key;
        renderCodeLibrary();
      });
      list.append(button);
    }

    const selected = entries.find(entry => entry.key === selectedLibraryKey);
    preview.textContent = selected?.source || "";
    copy.disabled = !selected;
  }

  async function copySelectedCode() {
    const entry = savedCodeEntries().find(item => item.key === selectedLibraryKey);
    if (!entry) return;
    try {
      await navigator.clipboard.writeText(entry.source);
    } catch (_) {
      const area = document.createElement("textarea");
      area.value = entry.source;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setDebugOutput("ルミエル「コードをコピーしたよ。エディタに貼り付けて使ってね。」", "lumiere");
    syncRuntimeDialogue();
  }

  function syncRuntimeDialogue() {
    const output = document.getElementById("console-output");
    const textEl = document.getElementById("plugin-editor-dialogue-text");
    const nameEl = document.getElementById("plugin-editor-dialogue-name");
    const nextEl = document.getElementById("plugin-editor-dialogue-next");
    if (!output || !textEl || !nameEl || !nextEl) return;

    const source = String(output.textContent || "");
    const lumiereMatch = source.match(/ルミエル「([\s\S]*?)」/);
    if (lumiereMatch) {
      nameEl.textContent = "ルミエル";
      textEl.textContent = lumiereMatch[1].trim();
      nextEl.hidden = false;
      output.dataset.outputKind = "lumiere";
      return;
    }

    nameEl.textContent = "実行結果";
    textEl.textContent = source || "実行結果はここに表示されます。";
    nextEl.hidden = true;
    output.dataset.outputKind = "program";
  }

  function bindResizer(handle, { container, owner, axis, variable, min, max }) {
    if (!handle || !container || !owner) return;
    const move = event => {
      if (handle.dataset.dragging !== "1") return;
      const rect = container.getBoundingClientRect();
      const size = axis === "x" ? rect.width : rect.height;
      if (size <= 0) return;
      const point = axis === "x" ? event.clientX - rect.left : event.clientY - rect.top;
      const ratio = Math.max(min, Math.min(max, point / size));
      owner.style.setProperty(variable, `${(ratio * 100).toFixed(2)}%`);
    };
    const end = event => {
      if (handle.dataset.dragging !== "1") return;
      handle.dataset.dragging = "0";
      try { handle.releasePointerCapture(event.pointerId); } catch (_) {}
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    handle.addEventListener("pointerdown", event => {
      event.preventDefault();
      handle.dataset.dragging = "1";
      try { handle.setPointerCapture(event.pointerId); } catch (_) {}
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
    });
  }

  function updateWorkspaceHeight(screen) {
    if (!screen?.classList.contains("active")) return;
    const top = screen.getBoundingClientRect().top;
    const height = Math.max(260, window.innerHeight - top - 12);
    screen.style.setProperty("--plugin-screen-height", `${height}px`);
  }

  function editable(target) {
    return Boolean(target?.closest?.("input, textarea, [contenteditable='true']"));
  }

  const isZ = event => event.code === "KeyZ" || event.key === "z" || event.key === "Z";
  const isX = event => event.code === "KeyX" || event.key === "x" || event.key === "X";

  function handleWorkspaceKeydown(event) {
    if (editable(event.target)) return;

    if (hub.classList.contains("active")) {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopImmediatePropagation();
        selectHubMenu(hubMenuIndex - 1);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopImmediatePropagation();
        selectHubMenu(hubMenuIndex + 1);
        return;
      }
      if (isX(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        document.getElementById("return-field")?.click();
        return;
      }
      if (isZ(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        activateHubMenu();
      }
      return;
    }

    if (!debug.classList.contains("active")) return;

    if (isX(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const key = G.state?.selectedSpellKey;
      const editor = document.getElementById("code-editor");
      if (key && editor) G.state.drafts[key] = editor.value;
      document.getElementById("back-workshop")?.click();
      return;
    }

    if (isZ(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const focused = document.activeElement;
      if (focused instanceof HTMLButtonElement && !focused.disabled) focused.click();
    }
  }

  function syncActiveScreen() {
    const hubActive = hub.classList.contains("active");
    const debugActive = debug.classList.contains("active");
    document.body.classList.toggle("plugin-workspace-active", hubActive || debugActive);
    updateWorkspaceHeight(hub);
    updateWorkspaceHeight(debug);

    if (hubActive && !hubWasActive) {
      selectHubMenu(hubMenuIndex, { focus: false, announce: true });
      requestAnimationFrame(() => selectHubMenu(hubMenuIndex, { focus: true, announce: false }));
    }
    if (debugActive && !debugWasActive) setGrimoireOpen(false);

    hubWasActive = hubActive;
    debugWasActive = debugActive;

    if (debugActive) {
      if (grimoireOpen) renderCodeLibrary();
      syncRuntimeDialogue();
    }
  }

  buildHub();
  buildEditor();

  document.addEventListener("keydown", handleWorkspaceKeydown, true);
  const screenObserver = new MutationObserver(syncActiveScreen);
  screenObserver.observe(hub, { attributes: true, attributeFilter: ["class"] });
  screenObserver.observe(debug, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("resize", syncActiveScreen);
  syncActiveScreen();
  loadTutorial();

  window.SpellPluginTutorial = {
    load: loadTutorial,
    play: playTutorial
  };
  window.SpellPluginWorkspace = {
    renderCodeLibrary,
    openEditor: openEditorFromMenu,
    setGrimoireOpen,
    isGrimoireOpen: () => grimoireOpen,
    sync: syncActiveScreen
  };
})();
