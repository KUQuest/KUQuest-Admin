# Admin App Router parity gate

Status: verified on 2026-09-16.

Scope: Issue 81, the Admin App Router migration under parent Issue 68.

## Evidence

- `bun run check` passes. Oxlint reports existing warnings, but no lint error. Typecheck, unit tests, and the production build pass.
- `bun run test:e2e` passes 94 local tests: 84 canonical Admin route tests, 8 API-mode security tests, and 2 Wallet error-fixture tests.
- `bun run test:e2e:live` is the required live gate. It fails fast when a live Admin credential variable is missing. With the supplied Admin credentials, the Quest, Activity Log, Payout, and Wallet suites each pass.
- `bun run test:e2e:security` checks a missing Session, an invalid Session, a disabled Admin, public static assets, and protection of a private route.
- The canonical route suites cover Quest, Dispute Case, Report Case, Conduct Report, Payout, Member, Wallet, and Activity Log routes, including navigation, drawers, language, theme, responsive behavior, search, filters, pagination, empty states, loading states, and error states where the current test data supports them.
- Admin API requests continue to use the existing `adminApi` boundary. The parity work does not change an Admin API path, request command, response envelope, status code, or authorization rule.
- The retired client-rendered Admin runtime and its comparison suites have been removed. Canonical App Router routes are now the only Admin UI implementation.

## Live verification inputs

The live API suites require these environment variables:

- `QUEST_E2E_ADMIN_EMAIL`
- `QUEST_E2E_ADMIN_PASSWORD`
- `LIVE_ADMIN_EMAIL`
- `LIVE_ADMIN_PASSWORD`

The live suites require an enabled Admin identity in the API Server. The required values were supplied at runtime for verification and are not stored in the workspace.

## Historical parity notes

The following historical parity notes are retained for product context. They are not legacy runtime requirements.

| Area | Owner | Follow-up decision |
| --- | --- | --- |
| Quest Export log, Quest detail translations, combined Quest filters, and the Quest-to-Dispute Case board link | Admin App maintainer + Quest Domain Owner | Defer. Create a product follow-up before adding controls or changing the Quest board contract. |
| Admin Log out control, detail global search, and Dispute Case translations | Admin App maintainer | Defer. Create a UI parity follow-up with explicit route and responsive requirements. |
| Temporary ban expiry and note, Report Case evidence file, and saved Report Case demo data | Admin App maintainer + Admin Operations Domain Owner | Defer. Confirm the required Admin operation and persistence contract first. |
| Dispute Case drawer refresh and final Quest status after resolution | Admin App maintainer + Quest Domain Owner | Defer. Decide whether mock mode must simulate Admin commands or whether API-mode coverage is sufficient. |
| Quest hide persistence, Activity Log search in mock mode, and larger mock Quest data | Admin App test maintainer | Defer. Keep command assertions at the Admin API boundary until mock command and pagination fixtures are defined. |
| Live disabled-Admin Activity Log coverage | Admin App test maintainer + Admin API Security Owner | Defer. Add a known disabled Admin identity in the live environment before enabling this check. |
| Legacy-runtime-only checks | Admin App maintainer | Retired with the legacy implementation. |
