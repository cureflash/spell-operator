(() => {
  "use strict";

  const G = window.SpellGame03;
  if (!G) throw new Error("Plug-in workspace dependencies are not loaded.");

  const hub = document.getElementById("screen-hub");
  const debug = document.getElementById("screen-debug");
  if (!hub || !debug) return;

  const TUTORIAL_URL = "data/plugin-tutorial-dialogues.json";
  let tutorialPromise = null;
  let introShown = false;
  let selectedLibraryKey = null;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

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
          return { plugin_intro: [] };
        });
    }
    return tutorialPromise;
  }

  async function playTutorial() {
    const table = await loadTutorial();
    const lines = Array.isArray(table?.plugin_intro) ? table.plugin_intro.filter(Boolean) : [];
    setHubDialogue(lines.length ? lines.map(line => `ルミエル「${line}」`).join("\n\n") : "ルミエル「説明データを読み込めなかったみたい。」");
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
      setHubDialogue("ルミエル「今は開ける魔導書がないみたい。」");
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
      renderCodeLibrary();
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
    const editorButton = el("button", "plugin-menu-button primary", "エディタ");
    editorButton.id = "plugin-open-editor";
    editorButton.type = "button";
    const tutorialButton = el("button", "plugin-menu-button secondary", "チュートリアル");
    tutorialButton.id = "plugin-open-tutorial";
    tutorialButton.type = "button";
    const customButton = el("button", "plugin-menu-button secondary", "カスタム");
    customButton.id = "plugin-open-custom";
    customButton.type = "button";
    customButton.disabled = true;
    customButton.title = "未実装";
    menuList.append(editorButton, tutorialButton, customButton, returnField);
    menuPane.append(menuList);

    upper.append(lumierePane, columnResizer, menuPane);

    const rowResizer = makeResizer("horizontal", "上部とルミエルのセリフ欄の高さを変更");
    const dialoguePane = el("section", "panel plugin-dialogue-pane");
    const dialogueHead = el("div", "plugin-dialogue-head");
    dialogueHead.append(el("span", "plugin-speaker", "ルミエル"), el("span", "plugin-output-tag", "DIALOGUE"));
    const dialogue = el("pre", "plugin-dialogue-text", "メニューを選んでね。");
    dialogue.id = "plugin-hub-dialogue";
    dialoguePane.append(dialogueHead, dialogue);

    shell.append(upper, rowResizer, dialoguePane);
    hub.replaceChildren(shell);

    editorButton.addEventListener("click", openEditorFromMenu);
    tutorialButton.addEventListener("click", playTutorial);

    bindResizer(columnResizer, {
      container: upper,
      owner: shell,
      axis: "x",
      variable: "--plugin-hub-left",
      min: 0.24,
      max: 0.52
    });
    bindResizer(rowResizer, {
      container: shell,
      owner: shell,
      axis: "y",
      variable: "--plugin-hub-upper",
      min: 0.48,
      max: 0.80
    });
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

    const columnResizer = makeResizer("vertical", "エディタと魔導書の幅を変更");

    const rightPane = el("aside", "plugin-right-pane");
    const grimoirePane = el("section", "panel plugin-code-library-pane");
    const grimoireHead = el("div", "plugin-panel-head");
    grimoireHead.append(el("div", "", ""));
    grimoireHead.firstChild.append(el("p", "eyebrow", "GRIMOIRE"), el("h3", "", "魔導書"));
    const libraryStatus = el("span", "plugin-library-status", "過去のコード");
    grimoireHead.append(libraryStatus);

    const libraryBody = el("div", "plugin-library-body");
    const list = el("div", "plugin-code-library-list");
    list.id = "plugin-code-library";
    const preview = el("pre", "plugin-code-preview", "保存されたコードを選んでください。");
    preview.id = "plugin-code-preview";
    const copy = el("button", "secondary compact plugin-copy-code", "コピー");
    copy.id = "plugin-copy-code";
    copy.type = "button";
    copy.disabled = true;
    libraryBody.append(list, preview, copy);
    grimoirePane.append(grimoireHead, libraryBody);

    const rightResizer = makeResizer("horizontal", "魔導書と実行欄の高さを変更");

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
    const dialoguePane = el("section", "panel plugin-dialogue-pane plugin-editor-dialogue");
    const dialogueHead = el("div", "plugin-dialogue-head");
    const speaker = el("span", "plugin-speaker", "ルミエル / 実行結果");
    const tag = el("span", "plugin-output-tag", "OUTPUT");
    tag.id = "plugin-output-kind";
    dialogueHead.append(speaker, tag);
    output.classList.add("plugin-dialogue-text", "plugin-runtime-output");
    dialoguePane.append(dialogueHead, output);

    shell.append(upper, rowResizer, dialoguePane);
    debug.replaceChildren(shell);

    copy.addEventListener("click", copySelectedCode);
    new MutationObserver(() => {
      classifyRuntimeOutput();
      renderCodeLibrary();
    }).observe(output, { childList: true, subtree: true, characterData: true });

    bindResizer(columnResizer, {
      container: upper,
      owner: shell,
      axis: "x",
      variable: "--plugin-editor-left",
      min: 0.42,
      max: 0.78
    });
    bindResizer(rightResizer, {
      container: rightPane,
      owner: rightPane,
      axis: "y",
      variable: "--plugin-grimoire-height",
      min: 0.42,
      max: 0.74
    });
    bindResizer(rowResizer, {
      container: shell,
      owner: shell,
      axis: "y",
      variable: "--plugin-editor-upper",
      min: 0.54,
      max: 0.84
    });

    renderCodeLibrary();
    classifyRuntimeOutput();
  }

  function savedCodeEntries() {
    return Object.entries(G.state?.registeredSpells || {})
      .filter(([, spell]) => typeof spell?.source === "string" && spell.source.trim())
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
      const name = el("span", "plugin-code-entry-name", entry.name);
      const meta = el("span", "plugin-code-entry-meta", Number.isFinite(entry.mpCost) ? `MP ${entry.mpCost}` : "保存済み");
      button.append(name, meta);
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
    classifyRuntimeOutput();
  }

  function classifyRuntimeOutput() {
    const output = document.getElementById("console-output");
    const tag = document.getElementById("plugin-output-kind");
    if (!output || !tag) return;
    const text = output.textContent || "";
    const isLumiere = text.includes("ルミエル「");
    output.dataset.outputKind = isLumiere ? "lumiere" : "program";
    tag.textContent = isLumiere ? "LUMIERE" : "OUTPUT";
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

  function syncActiveScreen() {
    const active = hub.classList.contains("active") || debug.classList.contains("active");
    document.body.classList.toggle("plugin-workspace-active", active);
    updateWorkspaceHeight(hub);
    updateWorkspaceHeight(debug);

    if (hub.classList.contains("active") && !introShown) {
      introShown = true;
      playTutorial();
    }
    if (debug.classList.contains("active")) {
      renderCodeLibrary();
      classifyRuntimeOutput();
    }
  }

  buildHub();
  buildEditor();

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
    sync: syncActiveScreen
  };
})();