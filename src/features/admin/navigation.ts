type NavigableAnchorEvent = {
  preventDefault: () => void;
  currentTarget: HTMLAnchorElement;
};

export function hardNavigate(event: NavigableAnchorEvent): void {
  event.preventDefault();
  window.location.assign(event.currentTarget.href);
}
