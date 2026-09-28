# Admin UI migration note

The Admin App now uses Tailwind utilities and the shared shadcn-style primitives as the default for new and migrated surfaces.

## Migrated surfaces

- The Admin shell uses the shared `Button`, `Sidebar`, `Card`, `Input`, `Tabs`, and `Table` primitives.
- Board page headers use `AdminPageHeader`.
- Board filters use `Input` and Radix Tabs.
- Canonical boards use shared `Table`, `EmptyState`, `Pagination`, and page-size controls. Board counts, table overflow, and pagination spacing use shared Tailwind recipes instead of the legacy `.count`, `.table-wrap`, `.data`, and `.table-pagination` selectors.
- Pagination and page-size controls use the shared `Button` primitive.
- Record actions, modal actions, drawer actions, and route error states use the shared `Button` primitive.
- Native record drawers keep one shared header, scrollable content region, and sticky action footer.
- Canonical record surfaces use the shared Tailwind recipes in `src/components/admin/admin-record-styles.ts` for sections, headings, facts, party grids, side facts, and counts. This covers moderation records, Quest, Payout, Wallet, Wallet Statement, Activity Log detail, and Member detail.

## Intentional CSS exceptions

The CSS files imported by the Admin layout are still required for these cases:

- semantic theme variables and workflow status colours;
- native `<dialog>` positioning, transitions, focus behaviour, and the drawer scrim;
- dense record tables, sticky keys, sorting states, and responsive table overflow;
- feature-specific domain layouts for Quest, Dispute Case, Report Case, Conduct Report, Wallet, Payout, and Member detail data;
- legacy fixture and model helpers that are still required by Mock data and unit-test boundaries;
- the Overview command centre compatibility view;
- native form controls and shared focus-visible and touch-target rules.

The retired client-rendered Admin page, Overview clone, legacy record stylesheet, and legacy runtime folder have been removed. Mock fixture storage now uses `src/features/admin/data/admin-demo-data-adapter.ts`. New UI must use the shared primitives and Tailwind utilities first.

## CSS audit

The CSS inventory was checked against `src/` and `tests/`. The audit removed retired selectors from `styles.css` and `admin-extensions.css`, including the old Admin navigation link, table link, filter-tab, shell-kicker, and payout action rules. The canonical detail fact and section selectors were then replaced with Tailwind recipes; the remaining route CSS covers dense tables, timelines, native dialogs, status tokens, and feature-specific data presentation. Status and theme classes that are assembled at runtime remain because the canonical status badge model uses them. Do not remove these rules without checking the canonical route and its responsive states.

The cleanup reduced the imported Admin CSS from 7,851 to 5,138 lines. The remaining CSS is used by the App Router shell, active feature surfaces, native dialogs, responsive tables, themes, and runtime status tokens. No retired renderer stylesheet or legacy record selector remains in `src/app`.

## Verification

Run these checks from the repository root:

```sh
bun run typecheck
bun run lint
bun run build
bun test tests/unit/*.test.ts
```

For visual checks, review the Overview, Quest, Dispute Case, Report Case, Conduct Report, Payout, Wallet, Member, and Activity Log routes in English and Thai. Check Grey-white, Green, and Dark themes. Check one desktop width and one phone width. Each drawer must scroll its content independently and keep its action footer visible.
