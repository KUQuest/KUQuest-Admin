const themeStorageKey = "kuquest-admin-theme";
const themeDefinitions = {
  grey: { label: "Grey-white", scheme: "light" },
  green: { label: "Light green", scheme: "light" },
  dark: { label: "Dark", scheme: "dark" },
};

function isTheme(value) {
  return Object.prototype.hasOwnProperty.call(themeDefinitions, value);
}

function storedTheme() {
  try {
    const value = localStorage.getItem(themeStorageKey);
    return isTheme(value) ? value : "grey";
  } catch {
    return "grey";
  }
}

function currentTheme() {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : "grey";
}

function persistTheme(theme) {
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Continue with the in-memory theme if storage is unavailable.
  }
}

function syncThemeControls() {
  const theme = currentTheme();
  const definition = themeDefinitions[theme];
  document.querySelectorAll("[data-theme-current]").forEach((label) => {
    if (label.textContent !== definition.label) label.textContent = definition.label;
  });
  document.querySelectorAll("[data-theme-option]").forEach((option) => {
    option.setAttribute("aria-pressed", String(option.dataset.themeOption === theme));
  });
}

function applyTheme(theme, shouldPersist = false) {
  const nextTheme = isTheme(theme) ? theme : "grey";
  if (nextTheme === "grey") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = nextTheme;
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", themeDefinitions[nextTheme].scheme);
  if (shouldPersist) persistTheme(nextTheme);
  syncThemeControls();
}

function closeThemeControls() {
  document.querySelectorAll("[data-theme-control]").forEach((control) => {
    const trigger = control.querySelector("[data-theme-trigger]");
    const menu = control.querySelector("[data-theme-menu]");
    if (!trigger || !menu) return;
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  });
}

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const option = target?.closest("[data-theme-option]");
  if (option) {
    applyTheme(option.dataset.themeOption, true);
    closeThemeControls();
    document.querySelector("[data-theme-trigger]")?.focus();
    return;
  }
  const trigger = target?.closest("[data-theme-trigger]");
  if (trigger) {
    const control = trigger.closest("[data-theme-control]");
    const menu = control?.querySelector("[data-theme-menu]");
    if (!menu) return;
    const open = menu.hidden;
    closeThemeControls();
    menu.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    return;
  }
  if (!target?.closest("[data-theme-control]")) closeThemeControls();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const openMenu = [...document.querySelectorAll("[data-theme-menu]")].find((menu) => !menu.hidden);
  if (!openMenu) return;
  closeThemeControls();
  openMenu.closest("[data-theme-control]")?.querySelector("[data-theme-trigger]")?.focus();
});

applyTheme(storedTheme());
const themeObserver = new MutationObserver(syncThemeControls);
themeObserver.observe(document.body, { childList: true, subtree: true });
