import type { InfiniteData } from "@tanstack/react-query";

type PageWithItems<Item> = {
  items: Item[];
};

/** Replaces one Admin record in every loaded cursor page without changing page metadata. */
export function replaceInfiniteItem<
  Item extends { id: string },
  Page extends PageWithItems<Item>,
>(
  current: InfiniteData<Page, string | null> | undefined,
  updated: Item,
): InfiniteData<Page, string | null> | undefined {
  if (!current) return current;

  let changed = false;
  const pages = current.pages.map((page) => {
    let pageChanged = false;
    const items = page.items.map((item) => {
      if (item.id !== updated.id) return item;
      pageChanged = true;
      return updated;
    });
    if (!pageChanged) return page;
    changed = true;
    return { ...page, items };
  });

  return changed ? { ...current, pages } : current;
}
