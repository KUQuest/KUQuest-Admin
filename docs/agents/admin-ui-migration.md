# Admin UI migration note

The Admin App now uses Tailwind utilities and the shared shadcn-style primitives as the default for new and migrated surfaces.

## Migrated surfaces

- The Admin shell uses the shared `Button`, `Sidebar`, `Card`, `Input`, `Tabs`, and `Table` primitives.
- Board page headers use `AdminPageHeader`.
- Board filters use `Input` and Radix Tabs.
- Pagination and page-size controls use the shared `Button` primitive.
- Record actions, modal actions, drawer actions, and route error states use the shared `Button` primitive.
- Native record drawers keep one shared header, scrollable content region, and sticky action footer.

## Intentional CSS exceptions

The CSS files imported by the Admin layout are still required for these cases:

- semantic theme variables and workflow status colours;
- native `<dialog>` positioning, transitions, focus behaviour, and the drawer scrim;
- dense record tables, sticky keys, sorting states, and responsive table overflow;
- feature-specific domain layouts for Quest, Dispute Case, Report Case, Conduct Report, Wallet, Payout, and Member detail data;
- legacy compatibility routes under `src/features/admin/legacy/**`;
- the Overview command centre compatibility view;
- native form controls and shared focus-visible and touch-target rules.

These selectors are not a second component system. They are compatibility rules for domain data and native controls. New UI must use the shared primitives and Tailwind utilities first.

## Verification

Run these checks from the repository root:

```sh
bun run typecheck
bun run lint
bun run build
bun test tests/unit/*.test.ts
```

For visual checks, review the Overview, Quest, Dispute Case, Report Case, Conduct Report, Payout, Wallet, Member, and Activity Log routes in English and Thai. Check Grey-white, Green, and Dark themes. Check one desktop width and one phone width. Each drawer must scroll its content independently and keep its action footer visible.
