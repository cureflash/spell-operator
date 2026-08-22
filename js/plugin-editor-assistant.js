(() => {
  "use strict";

  const G = window.SpellGame03;
  const debug = document.getElementById("screen-debug");
  const source = document.getElementById("console-output");
  const runState = document.getElementById("run-state");
  if (!G || !debug || !source || !runState) return;

  let outputText = null;
  let hintButton = null;
  let syncQueued = false;

  function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    queueMicrotask(() => {
      syncQueued = false;
      sync();
    });
  }

  function setDialogue(text) {
    const textEl = document.getElementById("plugin-editor-dialogue-text");
    const nameEl = document.getElementById("plugin-editor-dialogue-name");
    const nextEl = document.getElementById("plugin-editor-dialogue-next");
    if (!textEl || !nameEl || !nextEl) return;
    nameEl.textContent = "ルミエル";
    textEl.textContent = String(text ?? "");
    nextEl.hidden = false;
  }

  function splitSource(value) {
    const raw = String(value ?? "");
    const match = raw.match(/ルミエル「([\s\S]*?)」/);
    const dialogue = match ? match[1].trim() : "";
    const technical = match ? raw.replace(match[0], "").trim() : raw.trim();
    return { raw, dialogue, technical };
  }

  function resultKind(status) {
    if (/PYTHON ERROR|ERROR/i.test(status)) return "error";
    if (/TEST FAILED|FAILED/i.test(status)) return "failed";
    if (/TEST PASS|PASS/i.test(status)) return "passed";
    if (/RUNNING/i.test(status)) return "running";
    return "neutral";
  }

  function fallbackDialogue(raw, status) {
    if (/RUNNING/i.test(status) || raw.includes("準備してテストしています")) {
      return "実行しているよ。少し待ってね。";
    }
    if (/TEST FAILED|FAILED/i.test(status) || raw.includes("不合格") || raw.includes("不正解")) {
      return "これだとダメそうね。出力結果を確認してみて。";
    }
    if (/TEST PASS|PASS/i.test(status) || raw.includes("ALL TESTS PASSED")) {
      return "うまくいったね。これなら大丈夫そう。";
    }
    if (/PYTHON ERROR|ERROR/i.test(status) || /(?:^|\n)[A-Za-z_][A-Za-z0-9_]*Error:/.test(raw) || raw.includes("Python:")) {
      return "Pythonの実行中に問題が起きたみたい。実行結果を確認してみて。";
    }
    if (raw.includes("コードが空")) return "まだコードが書かれていないみたい。";
    if (raw.includes("コードをクリア")) return "コードをクリアしたよ。";
    if (raw.includes("Pythonコードを書いてテスト実行")) return "コードができたら、テスト実行してみてね。";
    return "コードができたら、テスト実行してみてね。";
  }

  function displayOutput(parts, status) {
    if (!outputText) return;

    let text = parts.technical;
    if (parts.raw.includes("Pythonコードを書いてテスト実行")) text = "まだ実行していません。";
    if (parts.raw.includes("コードをクリア")) text = "まだ実行していません。";

    // Lumiere-only messages such as copy/hint feedback must not erase the last technical result.
    if (!text && parts.dialogue) return;

    outputText.textContent = text || "まだ実行していません。";
    outputText.dataset.resultKind = resultKind(status);
  }

  function sync() {
    const dialogueText = document.getElementById("plugin-editor-dialogue-text");
    if (!dialogueText || !outputText) return;

    const parts = splitSource(source.textContent);
    const status = String(runState.textContent || "").trim();
    displayOutput(parts, status);
    setDialogue(parts.dialogue || fallbackDialogue(parts.raw, status));
  }

  async function requestHint() {
    if (!hintButton) return;
    const service = window.SpellPluginHints;
    if (!service?.request) {
      setDialogue("ヒント機能を読み込めなかったみたい。");
      return;
    }

    hintButton.disabled = true;
    try {
      const result = await service.request(G.state?.selectedSpellKey, {
        source: document.getElementById("code-editor")?.value || ""
      });
      setDialogue(result?.ok ? result.text : (result?.reason || "今はヒントを使えないみたい。"));
    } catch (error) {
      console.error("Plug-in hint request failed.", error);
      setDialogue("ヒントを確認している途中で問題が起きたみたい。");
    } finally {
      hintButton.disabled = false;
    }
  }

  function installUi() {
    const runPane = debug.querySelector(".plugin-run-pane");
    const actions = debug.querySelector(".plugin-run-actions");
    const back = document.getElementById("back-workshop");
    if (!runPane || !actions || !back) return false;

    if (!document.getElementById("plugin-hint-button")) {
      hintButton = document.createElement("button");
      hintButton.id = "plugin-hint-button";
      hintButton.type = "button";
      hintButton.className = "secondary compact plugin-hint-button";
      hintButton.textContent = "ヒントを聞く";
      hintButton.addEventListener("click", requestHint);
      actions.appendChild(hintButton);
    } else {
      hintButton = document.getElementById("plugin-hint-button");
    }

    if (!document.getElementById("plugin-execution-output")) {
      const panel = document.createElement("section");
      panel.className = "plugin-execution-output-panel";

      const head = document.createElement("div");
      head.className = "plugin-execution-output-head";
      const title = document.createElement("span");
      title.textContent = "実行結果 / 出力";
      const note = document.createElement("span");
      note.textContent = "OUTPUT";
      head.append(title, note);

      outputText = document.createElement("pre");
      outputText.id = "plugin-execution-output";
      outputText.className = "plugin-execution-output";
      outputText.textContent = "まだ実行していません。";
      outputText.dataset.resultKind = "neutral";

      panel.append(head, outputText);
      runPane.insertBefore(panel, back);
    } else {
      outputText = document.getElementById("plugin-execution-output");
    }

    return true;
  }

  function installWhenReady() {
    if (installUi()) {
      queueSync();
      return;
    }
    requestAnimationFrame(installWhenReady);
  }

  new MutationObserver(queueSync).observe(source, {
    childList: true,
    subtree: true,
    characterData: true
  });
  new MutationObserver(queueSync).observe(runState, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class"]
  });
  new MutationObserver(() => {
    if (!debug.classList.contains("active")) return;
    requestAnimationFrame(() => {
      installUi();
      queueSync();
    });
  }).observe(debug, { attributes: true, attributeFilter: ["class"] });

  installWhenReady();

  window.SpellPluginEditorAssistant = {
    sync: queueSync,
    requestHint,
    setDialogue
  };
})();
