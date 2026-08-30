import type { LegacyModalOptions } from "./runtime";

type OverlayElements = {
  drawer: HTMLElement;
  scrim: HTMLElement;
  shell: HTMLElement;
};

export type OverlayRuntime = {
  closeActiveLayer: () => void;
  closeDrawer: () => void;
  showDrawerLayer: () => void;
  showModalLayer: (layer: HTMLElement, options?: LegacyModalOptions) => () => void;
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function createOverlayRuntime({ drawer, scrim, shell }: OverlayElements): OverlayRuntime {
  let drawerTrigger: Element | null = null;
  let drawerKeydown: ((event: KeyboardEvent) => void) | null = null;
  let activeCustomLayerClose: (() => void) | null = null;

  const visibleFocusable = (root: HTMLElement): HTMLElement[] =>
    [...root.querySelectorAll<HTMLElement>(focusableSelector)].filter(
      (element) => element.getClientRects().length && !element.closest("[hidden]"),
    );

  const trapFocus = (event: KeyboardEvent, layer: HTMLElement): void => {
    if (event.key !== "Tab") return;
    const focusable = visibleFocusable(layer);
    if (!focusable.length) {
      event.preventDefault();
      layer.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const closeActiveLayer = (): void => {
    activeCustomLayerClose?.();
  };

  const showDrawerLayer = (): void => {
    drawerTrigger = document.activeElement;
    shell.inert = true;
    drawer.inert = false;
    scrim.hidden = false;
    drawer.setAttribute("aria-hidden", "false");
    drawerKeydown = (event) => trapFocus(event, drawer);
    drawer.addEventListener("keydown", drawerKeydown);
    requestAnimationFrame(() => {
      drawer.classList.add("open");
      const title = drawer.querySelector<HTMLElement>("h2")?.textContent?.trim();
      drawer.setAttribute("aria-label", title ? `Record details: ${title}` : "Record details");
      drawer.querySelector<HTMLElement>("#close")?.focus();
    });
  };

  const closeDrawer = (): void => {
    if (drawerKeydown) {
      drawer.removeEventListener("keydown", drawerKeydown);
      drawerKeydown = null;
    }
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    drawer.inert = true;
    shell.inert = false;
    const restore = drawerTrigger;
    drawerTrigger = null;
    setTimeout(() => {
      scrim.hidden = true;
      if (restore instanceof HTMLElement && restore.isConnected) restore.focus();
    }, 220);
  };

  const showModalLayer = (layer: HTMLElement, options: LegacyModalOptions = {}): (() => void) => {
    closeActiveLayer();
    const trigger = document.activeElement;
    const removeOnClose = options.removeOnClose !== false;
    if (!layer.isConnected) document.body.append(layer);
    const siblings = [...document.body.children]
      .filter((element) => element !== layer)
      .map((element) => ({ element: element as HTMLElement, inert: (element as HTMLElement).inert }));
    siblings.forEach(({ element }) => (element.inert = true));
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      trapFocus(event, layer);
    };
    const close = () => {
      layer.removeEventListener("keydown", onKeydown);
      siblings.forEach(({ element, inert }) => (element.inert = inert));
      if (removeOnClose) layer.remove();
      options.onClose?.();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
      if (activeCustomLayerClose === close) activeCustomLayerClose = null;
    };
    activeCustomLayerClose = close;
    layer.addEventListener("keydown", onKeydown);
    requestAnimationFrame(() => {
      const preferred = typeof options.initialFocus === "string"
        ? layer.querySelector<HTMLElement>(options.initialFocus)
        : options.initialFocus;
      (preferred || visibleFocusable(layer)[0] || layer).focus();
    });
    return close;
  };

  return { closeActiveLayer, closeDrawer, showDrawerLayer, showModalLayer };
}
