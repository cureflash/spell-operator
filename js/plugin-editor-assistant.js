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
  let errorDialogueToken = 0;

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
    return {
      raw,
      dialogue: match ? match[1].trim() : ""
    };
  }

  function lastPythonResult() {
    return window.SpellPython?.lastResult || null;
  }

  function codeErrorFrom(result) {
    if (!result) return "";
    if (result.compileError) return String(result.compileError);
    const failed = Array.isArray(result.tests) ? result.tests.find(test => test?.error) : null;
    return failed?.error ? String(failed.error) : "";
  }

  function basicDialogue(parts, status, hasCodeError) {
    if (parts.dialogue) return parts.dialogue;
    if (/JUDGING/i.test(status)) return "解答を判定するね。ちょっと待ってて。";
    if (/RUNNING/i.test(status)) return "実行しているよ。少し待ってね。";
    if (/JUDGE FAILED/i.test(status)) return "まだ違うみたい。入力値と出力値を確認してみて。";
    if (/TEST FAILED|FAILED/i.test(status)) return "これだとダメそうね。出力を確認してみて。";
    if (/JUDGE PASS/i.test(status)) return "正解！ 3回ともちゃんと動いてるよ。";
    if (/TEST PASS|PASS/i.test(status)) return "うん、ちゃんと出力できてるね。解答を判定してみて。";
    if (/RUNTIME ERROR/i.test(status)) return "実行環境側で問題が起きたみたい。もう一度実行してみて。";
    if (/PYTHON ERROR|JUDGE ERROR|ERROR/i.test(status) && !hasCodeError) return "実行環境側で問題が起きたみたい。もう一度実行してみて。";
    if (parts.raw.includes("コードが空")) return "まだコードが書かれていないみたい。";
    if (parts.raw.includes("コードをクリア")) return "コードをクリアしたよ。";
    return "コードができたら、テスト実行してみてね。";
  }

  function resolveCodeErrorDialogue(errorText, statusSnapshot) {
    const token = ++errorDialogueToken;
    const service = window.SpellLumierePythonErrors;
    if (!service?.resolve) {
      setDialogue("コードにエラーがあるみたい。もう一度確認してみて。");
      return;
    }
    service.resolve(errorText).then(result => {
      if (token !== errorDialogueToken) return;
      const current = String(runState.textContent || "").trim();
      if (current !== statusSnapshot) return;
      setDialogue(result?.dialogue || "コードにエラーがあるみたい。もう一度確認してみて。");
    }).catch(() => {
      if (token === errorDialogueToken) setDialogue("コードにエラーがあるみたい。もう一度確認してみて。");
    });
  }

  function sync() {
    const dialogueText = document.getElementById("plugin-editor-dialogue-text");
    if (!dialogueText) return;

    const parts = splitSource(source.textContent);
    let status = String(runState.textContent || "").trim();
    const result = lastPythonResult();
    const codeError = codeErrorFrom(result);

    if (/PYTHON ERROR/i.test(status) && !codeError && window.SpellPython?.lastError) {
      runState.textContent = "RUNTIME ERROR";
      runState.className = "status bad";
      status = "RUNTIME ERROR";
    }

    // Output contents are owned by plugin-execution-controller.js.
    // Do not mirror SpellPython.lastResult here; doing so overwrites judge I/O display.

    if (codeError && /PYTHON ERROR|JUDGE ERROR|ERROR/i.test(status)) {
      resolveCodeErrorDialogue(codeError, status);
      return;
    }

    errorDialogueToken++;
    setDialogue(basicDialogue(parts, status, Boolean(codeError)));
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
      title.textContent = "出力";
      const note = document.createElement("span");
      note.textContent = "TEST / JUDGE";
      head.append(title, note);

      outputText = document.createElement("pre");
      outputText.id = "plugin-execution-output";
      outputText.className = "plugin-execution-output";
      outputText.textContent = "（出力なし）";
      outputText.dataset.resultKind = "neutral";

      panel.append(head, outputText);
      runPane.insertBefore(panel, back);
    } else {
      outputText = document.getElementById("plugin-execution-output");
      const head = outputText.closest(".plugin-execution-output-panel")?.querySelector(".plugin-execution-output-head");
      if (head?.children?.[0]) head.children[0].textContent = "出力";
      if (head?.children?.[1]) head.children[1].textContent = "TEST / JUDGE";
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
