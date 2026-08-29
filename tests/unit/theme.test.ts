import { describe, expect, it } from "bun:test";
import { runInNewContext } from "node:vm";

type TestElement = {
  dataset: Record<string, string>;
  hidden: boolean;
  textContent: string;
  focused: boolean;
  closest: (selector: string) => TestElement | null;
  querySelector: (selector: string) => TestElement | null;
  setAttribute: (name: string, value: string) => void;
  getAttribute: (name: string) => string | null;
  focus: () => void;
};

type ThemeTestContext = {
  document: {
    documentElement: { dataset: Record<string, string> };
    body: TestElement;
    querySelector: (selector: string) => TestElement | null;
    querySelectorAll: (selector: string) => TestElement[];
    addEventListener: (type: string, handler: (event: { key?: string; target?: TestElement }) => void) => void;
    handlers: Record<string, (event: { key?: string; target?: TestElement }) => void>;
  };
  localStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    values: Record<string, string>;
  };
};

const themeSource = await Bun.file("public/legacy/theme.js").text();

class ElementStub {
  dataset: Record<string, string> = {};
  hidden = false;
  textContent = "";
  focused = false;
  attributes: Record<string, string> = {};
  parents: Record<string, ElementStub | null> = {};
  children: Record<string, ElementStub | null> = {};

  closest(selector: string) {
    return this.parents[selector] || (this.attributes[`matches:${selector}`] ? this : null);
  }

  querySelector(selector: string) {
    return this.children[selector] || null;
  }

  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }

  getAttribute(name: string) {
    return this.attributes[name] || null;
  }

  focus() {
    this.focused = true;
  }
}

function loadTheme(savedTheme?: string) {
  const documentElement = { dataset: {} as Record<string, string> };
  const body = new ElementStub();
  const meta = new ElementStub();
  const control = new ElementStub();
  const menu = new ElementStub();
  const trigger = new ElementStub();
  const current = new ElementStub();
  const options = ["grey", "green", "dark"].map((theme) => {
    const option = new ElementStub();
    option.dataset.themeOption = theme;
    return option;
  });
  const handlers: ThemeTestContext["document"]["handlers"] = {};
  const lists: Record<string, TestElement[]> = {
    "[data-theme-current]": [current],
    "[data-theme-option]": options,
    "[data-theme-control]": [control],
    "[data-theme-menu]": [menu],
  };
  control.children["[data-theme-trigger]"] = trigger;
  control.children["[data-theme-menu]"] = menu;
  trigger.parents["[data-theme-control]"] = control;
  options.forEach((option) => {
    option.parents["[data-theme-option]"] = option;
  });
  const localStorageValues: Record<string, string> = {};
  if (savedTheme) localStorageValues["kuquest-admin-theme"] = savedTheme;
  const context = {
    document: {
      documentElement,
      body,
      handlers,
      querySelector(selector: string) {
        if (selector === 'meta[name="color-scheme"]') return meta;
        if (selector === "[data-theme-trigger]") return trigger;
        return null;
      },
      querySelectorAll(selector: string) {
        return lists[selector] || [];
      },
      addEventListener(type: string, handler: (event: { key?: string; target?: TestElement }) => void) {
        handlers[type] = handler;
      },
    },
    localStorage: {
      values: localStorageValues,
      getItem(key: string) {
        return localStorageValues[key] || null;
      },
      setItem(key: string, value: string) {
        localStorageValues[key] = value;
      },
    },
    Element: ElementStub,
    MutationObserver: class {
      observe() {}
    },
  } as Record<string, unknown>;

  runInNewContext(themeSource, context);
  return {
    context: context as unknown as ThemeTestContext,
    documentElement,
    meta,
    menu,
    options,
    trigger,
    current,
  };
}

describe("theme selection", () => {
  it("applies the saved theme and updates the selector label", () => {
    const theme = loadTheme("green");

    expect(theme.documentElement.dataset.theme).toBe("green");
    expect(theme.meta.getAttribute("content")).toBe("light");
    expect(theme.current.textContent).toBe("Light green");
    expect(theme.options[1].getAttribute("aria-pressed")).toBe("true");
  });

  it("persists a selected theme and closes the disclosure", () => {
    const theme = loadTheme();
    theme.context.document.handlers.click({ target: theme.options[2] });

    expect(theme.documentElement.dataset.theme).toBe("dark");
    expect(theme.context.localStorage.values["kuquest-admin-theme"]).toBe("dark");
    expect(theme.meta.getAttribute("content")).toBe("dark");
    expect(theme.menu.hidden).toBe(true);
    expect(theme.trigger.focused).toBe(true);
  });
});
