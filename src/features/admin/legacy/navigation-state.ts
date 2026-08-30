export function setActiveNavigation(root: ParentNode, view: string): void {
  root.querySelectorAll<HTMLElement>("[data-view]").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}
