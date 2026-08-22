(() => {
  "use strict";

  const DEFAULT_EXPRESSION = "neutral";
  const portraits = {
    sophie: {
      neutral: "assets/characters/portraits/sophie/neutral.jpg?v=3",
      smile: "assets/characters/portraits/sophie/smile.jpg?v=1",
      battle: "assets/characters/portraits/sophie/battle.jpg?v=1"
    },
    lumiere: {
      neutral: "assets/characters/portraits/lumiere/neutral.jpg?v=2",
      smile: "assets/characters/portraits/lumiere/smile.jpg?v=1",
      battle: "assets/characters/portraits/lumiere/battle.jpg?v=1"
    }
  };

  let preparedExpression = null;
  let skipNextFieldMutation = false;
  let skipResetTimer = null;

  const normalizeKey = value => String(value ?? "").trim().toLowerCase();
  const normalizeExpression = value => normalizeKey(value) || DEFAULT_EXPRESSION;

  function resolve(character, expression = DEFAULT_EXPRESSION) {
    const characterKey = normalizeKey(character);
    const set = portraits[characterKey];
    if (!set) return null;
    const expressionKey = normalizeExpression(expression);
    return set[expressionKey] || set[DEFAULT_EXPRESSION] || null;
  }

  function register(character, expression, src) {
    const characterKey = normalizeKey(character);
    const expressionKey = normalizeExpression(expression);
    const source = String(src ?? "").trim();
    if (!characterKey || !source) return false;
    if (!portraits[characterKey]) portraits[characterKey] = {};
    portraits[characterKey][expressionKey] = source;
    return true;
  }

  function apply(element, character, expression = DEFAULT_EXPRESSION) {
    if (!element) return null;
    const src = resolve(character, expression);

    if (!src) {
      element.classList.remove("has-character-portrait");
      element.style.removeProperty("background-image");
      element.style.removeProperty("background-size");
      element.style.removeProperty("background-position");
      element.style.removeProperty("background-repeat");
      return null;
    }

    element.classList.add("has-character-portrait");
    element.style.backgroundImage = `url("${src}")`;
    element.style.backgroundSize = "cover";
    element.style.backgroundPosition = "center";
    element.style.backgroundRepeat = "no-repeat";
    return src;
  }

  function prepare(expression = DEFAULT_EXPRESSION) {
    preparedExpression = normalizeExpression(expression);
  }

  function consumePreparedExpression() {
    const expression = preparedExpression || DEFAULT_EXPRESSION;
    preparedExpression = null;
    return expression;
  }

  function applyFieldPortrait(expressionOverride = null) {
    const dialog = document.getElementById("field-dialog");
    const portrait = document.getElementById("field-dialog-portrait");
    if (!dialog || !portrait) return null;
    const character = dialog.dataset.portrait || "";
    const expression = expressionOverride == null
      ? consumePreparedExpression()
      : normalizeExpression(expressionOverride);
    dialog.dataset.expression = expression;
    return apply(portrait, character, expression);
  }

  function installFieldDialogHook() {
    const dialog = document.getElementById("field-dialog");
    if (dialog) {
      const observer = new MutationObserver(() => {
        if (skipNextFieldMutation) {
          skipNextFieldMutation = false;
          return;
        }
        applyFieldPortrait();
      });
      observer.observe(dialog, { attributes: true, attributeFilter: ["data-portrait"] });
      applyFieldPortrait(DEFAULT_EXPRESSION);
    }

    if (window.SpellField?.showDialog && !window.SpellField.showDialog.__portraitAware) {
      const originalShowDialog = window.SpellField.showDialog.bind(window.SpellField);
      const wrapped = (payload, speakerKey) => {
        const expression = payload && typeof payload === "object"
          ? normalizeExpression(payload.expression)
          : DEFAULT_EXPRESSION;
        skipNextFieldMutation = true;
        if (skipResetTimer !== null) clearTimeout(skipResetTimer);
        const result = originalShowDialog(payload, speakerKey);
        applyFieldPortrait(expression);
        skipResetTimer = setTimeout(() => {
          skipNextFieldMutation = false;
          skipResetTimer = null;
        }, 0);
        return result;
      };
      wrapped.__portraitAware = true;
      window.SpellField.showDialog = wrapped;
    }
  }

  function applyFriendPortrait() {
    const portrait = document.getElementById("friend-conversation-portrait");
    if (!portrait) return null;
    const character = portrait.dataset.character || "";
    const expression = normalizeExpression(portrait.dataset.expression);
    return apply(portrait, character, expression);
  }

  function setFriendExpression(expression = DEFAULT_EXPRESSION) {
    const portrait = document.getElementById("friend-conversation-portrait");
    if (!portrait) return false;
    portrait.dataset.expression = normalizeExpression(expression);
    applyFriendPortrait();
    return true;
  }

  function installFriendConversationHook() {
    const portrait = document.getElementById("friend-conversation-portrait");
    if (!portrait) return;
    const observer = new MutationObserver(applyFriendPortrait);
    observer.observe(portrait, {
      attributes: true,
      attributeFilter: ["data-character", "data-expression"]
    });
    applyFriendPortrait();
  }

  window.SpellPortraits = {
    DEFAULT_EXPRESSION,
    portraits,
    resolve,
    register,
    apply,
    prepare,
    setFriendExpression,
    refresh() {
      applyFieldPortrait(document.getElementById("field-dialog")?.dataset.expression || DEFAULT_EXPRESSION);
      applyFriendPortrait();
    }
  };

  installFieldDialogHook();
  installFriendConversationHook();
})();
