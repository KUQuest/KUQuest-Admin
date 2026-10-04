# Retained Admin workflow inventory — API-only refactor

## Purpose and provenance

This is an evidence inventory for [Publish retained Admin workflow inventory and remaining specification gaps](https://github.com/KUQuest/KUQuest-Admin/issues/139), within [Frontend API-only — Clean Code refactor decision map](https://github.com/KUQuest/KUQuest-Admin/issues/126). It does not approve UX, implement the refactor, or establish backend capability gaps.

- Frontend source and policy baseline: [develop snapshot](https://github.com/KUQuest/KUQuest-Admin/tree/aa5f7a3dec764ce5e5bb0fbe8cd25a0b37cdbe50). Source paths refer to this commit, not moving develop, except `docs/api-facts.md`, which belongs to the separate evidence commit below. Local checkout was detached at the source commit; the existing untracked API facts document was left unchanged.
- Backend evidence: [Backend API facts — immutable snapshot](https://github.com/KUQuest/KUQuest-Admin/blob/b5fbd37edfe59ae2a448eadb8ea4ed3a9fd129d3/docs/api-facts.md), published by [Publish verified backend API evidence for refactor decisions](https://github.com/KUQuest/KUQuest-Admin/issues/127#issuecomment-5972678263). Its historical 32 curl requests used local HTTP backend on 2026-10-04 ICT; no business mutations were made. OpenAPI hash and redaction limits remain there.
- CONFIRMED means historical actual API evidence for the named sampled operation only. SPEC-ONLY means a documented API contract without runtime proof. UNKNOWN means evidence is missing. Frontend types, fixtures, code inspection, and accepted Rulebooks do not confirm API runtime.
- Policy: `CONTEXT.md`, `docs/agents/routing.md`, accepted Admin, Finance, Quest Rulebooks and their relevant sub-contracts/ADRs at the source snapshot. Legacy Implementation does not define policy.
- No application/backend changes, live probes, Browser checks, builds, lint, or tests were run for this planning ticket. Scenario names below are future requirements, not passing results. Publication checks validate the asset and tracker relationships only.

## Canonical decision index

Each decision lives only in its resolution. This inventory records the affected workflow and links the owning decision; it does not replace it.

- [Decide frontend module boundaries and Clean Code acceptance standards](https://github.com/KUQuest/KUQuest-Admin/issues/128#issuecomment-5972851232): feature-owned validation and API-to-screen paths; responsibility-based seams and real shared consumers.
- [Decide API-only transport and Admin session ownership](https://github.com/KUQuest/KUQuest-Admin/issues/129#issuecomment-5977221875): transport, authentication transitions and Session authority.
- [Decide the shared error contract and recovery policies](https://github.com/KUQuest/KUQuest-Admin/issues/130#issuecomment-5977269628): classification and recovery.
- [Decide server-state and UI-state ownership](https://github.com/KUQuest/KUQuest-Admin/issues/131#issuecomment-5977429700): query scope, freshness, command synchronization and drafts.
- [Decide legacy route and local-data cutover policy](https://github.com/KUQuest/KUQuest-Admin/issues/132#issuecomment-5976953420): retired links/local business data and retained preferences.
- [Decide API-only capability gaps and approved UX changes](https://github.com/KUQuest/KUQuest-Admin/issues/133#issuecomment-5977007760): explicit per-workflow approval, section contract errors, evidence limitations.
- [Decide shared UI, styling and localisation boundaries](https://github.com/KUQuest/KUQuest-Admin/issues/134#issuecomment-5977495548): shared presentation, feature composition, typed Thai/English catalogs and themes.
- [Decide verification gates and incremental cutover sequencing](https://github.com/KUQuest/KUQuest-Admin/issues/135#issuecomment-5977541586): isolated HTTP fixtures, live milestones, one release and closure.
- [Decide Member detail evidence gaps and missing-data UX](https://github.com/KUQuest/KUQuest-Admin/issues/137#issuecomment-5977076502) and [Decide Member Payout details and Wallet read-state display](https://github.com/KUQuest/KUQuest-Admin/issues/138#issuecomment-5977165723): retained Member sections and finance states.

## Route coverage

Canonical retained screens: `/login`, `/overview`, `/quest`, `/quest/[id]`, `/dispute`, `/dispute/[id]`, `/report`, `/report/[id]`, `/conduct-report`, `/conduct-report/[id]`, `/payout`, `/payout/[id]`, `/member`, `/member/[id]`, `/member/[id]?tab=wallet-statement`, `/wallet`, `/finance`, `/top-ups`, `/activity`. `/` enters `/overview`. Global Search, navigation counts, language/theme, Session recovery and logout are shell workflows. Intercepted detail pages under `src/app/(admin)/@modal` share each feature's detail owner; they are not separate domain workflows. Empty/default modal slots and route loading/error/not-found files are composition boundaries, not new capabilities.

## Shared application workflows

### Login and Admin Session

**Source:** `src/app/login/page.tsx`, `src/features/admin/login/admin-login-page.tsx`, `src/lib/auth/admin-session.ts`, `admin-session-policy.ts`, `admin-auth-mode.ts`, `src/features/admin/admin-auth.ts`, `src/features/admin/api/admin-api-core.ts`, `src/app/(admin)/layout.tsx`, `src/components/admin/admin-shell.tsx`.

**Current behavior:** Login trims/lowercases email, requires `@ku.th` and at least eight password characters, stores a local Session flag, then navigates to Overview. Mock mode sets a mock cookie instead of authenticating. API login does not verify get-session before navigation. Server Session reads classify 401/404 or invalid/missing identity as missing; layout redirects missing, shows ForbiddenPage, or throws unavailable errors. Shell rechecks on entry/pageshow/popstate and redirects all caught failures to login. Logout logs errors then redirects in `finally`, whether the Backend logged out or not.

**Reads/commands and evidence:** raw auth `POST /api/admin/auth/sign-in/email`, `GET /api/admin/auth/get-session`, `POST /api/admin/auth/sign-out`. Historical sign-in, bad-password 401, present/null Session and successful sign-out are CONFIRMED only within sampled local requests. OpenAPI password min/max and omission behavior are SPEC-ONLY/UNKNOWN. Disabled Admin, real Member permission, Browser Set-Cookie/Origin/production cookie behavior remain UNKNOWN. `@ku.th` is defined for Member sign-in in `CONTEXT.md`, not as an accepted Admin constraint; the current UI restriction needs a precise decision.

**Ownership/seams and consumers:** Shared Session owns checked identity and auth-state classification; login owns form/presentation. Actual consumers are Admin server layout, shell logout/recovery and feature request boundaries. `src/lib/auth` currently imports feature-owned API types/routing; that violates the approved dependency direction and must change at cutover. Shared HTTP response-envelope mechanics remain separate from raw auth validation.

**Approved delta:** Apply [Decide API-only transport and Admin session ownership](https://github.com/KUQuest/KUQuest-Admin/issues/129#issuecomment-5977221875) and [Decide the shared error contract and recovery policies](https://github.com/KUQuest/KUQuest-Admin/issues/130#issuecomment-5977269628), rather than preserve local Session authority, catch-to-login or false logout success. The email/password frontend gate is not approved by those decisions.

**Verification scenarios:** `AUTH-null-vs-invalid`, `AUTH-404-is-unavailable`, `AUTH-forbidden-vs-resource-403`, `AUTH-login-verifies-Session`, `AUTH-uncertain-logout-present-null-unavailable`, `AUTH-late-prior-Session-response`, `AUTH-cross-Admin-and-server-request-isolation`. Use isolated HTTP fixtures for failures/races; safe enabled/disabled test identities and target-deployment Browser login/logout establish real behavior. Never publish test identity values.

**Blockers:** Admin login validation/copy contract is an implementation decision. Deployment forwarding and forbidden/Origin behavior are release checks. Do not change Backend authentication policy as part of this effort.

### Transport, query cache and navigation

**Source:** `src/lib/api/client.ts`, `src/app/api/[...path]/route.ts`, `src/proxy.ts`, `src/lib/auth/admin-routing.ts`, `src/features/admin/api/admin-api.ts`, `admin-api-transport.ts`, `admin-provider.ts`, `src/components/admin/admin-query-provider.tsx`, `src/features/admin/admin-navigation-query.ts`, `admin-navigation.ts`, `admin-routes.ts`, `navigation-config.ts`, `src/features/admin/data/admin-query-events.ts`.

**Current behavior:** Browser HTTP uses same-origin paths; server HTTP uses configured backend URL. Forwarding allows Admin v1/auth paths, exports GET/POST, passes most request headers, streams responses and preserves multiple Set-Cookie headers. Generic response types are asserted, and transport keeps a separate Overview in-flight/cache. QueryClient defaults disable focus refetch; query keys use mode rather than Session scope. Shell counts read Overview or seeded local collections and refresh on local business/storage events. Proxy gates cookie presence, normalizes old plural/root query links, and rewrites Member Wallet Statement URLs into a tab; its protected prefixes omit Finance/Top-ups, while the shared server layout still checks those screens.

**Ownership/seams:** Application composition owns route/layout/provider wiring. Shared transport owns HTTP; shared Session owns authority; feature hooks own API queries/commands. Navigation counts consume the Overview public read interface; they must not reconstruct counts from partly loaded feature lists. Remove shared imports of feature internals (`admin-routing.ts` imports Member model; shared update events import case model and Payout mock state). Feature-public invalidation/read interfaces must serve real shell/Overview/related-feature consumers. Do not make a universal command handler.

**Approved delta:** [Decide legacy route and local-data cutover policy](https://github.com/KUQuest/KUQuest-Admin/issues/132#issuecomment-5976953420), [Decide server-state and UI-state ownership](https://github.com/KUQuest/KUQuest-Admin/issues/131#issuecomment-5977429700) and transport resolution own these changes. The canonical Member Wallet Statement tab remains; retire its redirect-only `/member/[id]/wallet-statement` alias under the approved old-link cutover.

**Verification scenarios:** `NAV-direct-refresh-and-intercepted-detail`, `NAV-back-forward-close-restores-board`, `NAV-retired-links-do-not-normalize`, `NAV-finance-and-topups-protected`, `HTTP-multiple-Set-Cookie-and-real-Origin`, `QUERY-prefetch-scope-params-fetch-time`, `QUERY-filter-cursor-reset`, `QUERY-success-refresh-failed-no-resubmit`, `COUNTS-authoritative-not-partial`. Fixtures cover invalid contracts and races; live target-deployment Browser checks cover forwarding and safe API-backed navigation. Code is not proof these pass.

### Shared presentation, language and themes

**Source:** `src/components/ui/*`, `src/components/admin/admin-drawer.tsx`, `admin-modal-portal.tsx`, `admin-action-feedback.tsx`, `admin-feedback.tsx`, `admin-shell-context.tsx`, `admin-language-control.tsx`, `admin-theme-control.tsx`, `src/features/admin/language/admin-language.ts`, `admin-language-catalog.ts`, `src/features/admin/theme/theme-model.ts`, `src/app/{layout.tsx,styles.css,theme.css,tailwind.css,admin-extensions.css,user-page.css,login.css}`.

**Current behavior:** Shared controls/panels/drawers provide presentation and keyboard/focus mechanics; shell context performs whole-string translation with case-insensitive, split-string, prefix and regex fallback. Global CSS bridges legacy classes and Tailwind/data-slot controls. Command receipt can default to mock Admin/current frontend time rather than authoritative result facts.

**Seams and real consumers:** Shell owns navigation/composition; features own content, consequences and command feedback. Shared dialog mechanics serve Payout, Wallet, Quest and moderation decisions. Theme/language are legitimate preferences, not business cache. Approved ownership is [Decide shared UI, styling and localisation boundaries](https://github.com/KUQuest/KUQuest-Admin/issues/134#issuecomment-5977495548). Do not delete valid data-slot, focus, reduced-motion or theme behavior as legacy. Do not treat a frontend-generated receipt timestamp/Admin identity as Backend audit proof.

**Verification scenarios:** `UI-dialog-focus-Escape-pending-return`, `UI-draft-discard-confirmation`, `I18N-English-Thai-dynamic-params`, `I18N-Member-content-unchanged`, `I18N-switch-preserves-query-and-draft`, `THEME-grey-green-dark-and-responsive`. HTTP fixtures supply contract states; actual surface checks verify layout/focus/themes. The current translation catalog is not acceptance authority for new contextual messages.



## Finance and Payout workflows

### Finance — `/finance`

**Source/owner:** `src/app/(admin)/finance/page.tsx`; `src/features/admin/finance/finance-service.ts`, `finance-page.tsx`, `finance-query.ts`; current operations in `src/features/admin/api/admin-api-core.ts` and `admin-api-payout.ts`. Finance owns Money Policy query/presentation and operational form; shared HTTP does not own policy fields.

**Current reads/commands:** Server reads `GET /api/v1/admin/finance/policies/current` and `/finance/policies` concurrently. One can succeed while the other fails; errors combine into policyError. Client query refetches on mount with staleTime 0 and no automatic retry/focus refetch. Cards show fee bps, satang converted to baht and revisions. Provider Event form takes event ID and top-up/payout kind, then calls `POST /api/v1/admin/top-ups/events/{eventId}/retry` or `/payouts/events/{eventId}/retry`; success displays event/status/attempt count and invalidates Top-up/Payout prefixes. This feature does not add idempotency or an authoritative outcome read. Mock branch shows tools unavailable, not actual policy data.

**Contracts/evidence:** Accepted `money-policy-contract.md`, Finance Rulebook and ADRs 0005/0006/0007/0009/0010/0012 govern versioned Money Policy, units and financial authority. Source-declared provider fee/tax fields are not by themselves an accepted endpoint contract. Current/revision response details and Provider Event retry contracts/runtime are UNKNOWN in published evidence; no such live request or business mutation was made. Accepted money rules are policy, not API confirmation.

**Seams/consumers:** Separate checked current-policy/revision input mapping from section composition; keep each read's validity independent. Provider Event operation is a command, not a policy read. Finance Overview is consumed by Overview and Wallet, not this page; its public validated read is a real cross-feature seam. Event retry affects both Finance/Top-up and Payout resource queries through named feature interfaces.

**Current versus approved UX:** No Finance-specific card/command delta was approved. Apply the canonical section/error/command feedback rules; do not silently remove retry, assume support, or infer a policy formula. Exact provider fee/tax field authority and operational-command contracts are new decision tickets.

**Scenarios:** `FIN-policy-current-and-revisions`, `FIN-current-fails-revisions-valid`, `FIN-revisions-fail-current-valid`, `FIN-invalid-bps-satang-rounding`, `FIN-event-retry-uncertain-and-readback`, `FIN-command-success-refresh-failed`. HTTP fixtures cover deterministic independent failure/invalid/uncertain states. Live read proof needs an authorized Admin and target transport; retry needs an explicitly safe event and approved outcome proof. No live proof was run.

**Blockers/cutover:** Missing exact displayed field/command contracts are implementation prerequisites. Runtime proof of accepted contracts is a release check. Remove FinanceDataSource/mock selection and mode environment dependency, not the retained screen. Reuse legitimate runner/query/UI tools; no dependency retirement is established here.

### Top-ups — `/top-ups` and Member Top-ups tab

**Source/owner:** `src/app/(admin)/top-ups/page.tsx`; Finance `finance-service.ts`, `finance-query.ts`, `top-ups-page.tsx`, `top-ups-board-model.ts`, `top-ups-board-store.ts`, `top-up-detail-drawer.tsx`; Member `member-query.ts`, `member-detail.tsx`. Shared drawer has two actual consumers: global board and Member-scoped tab (Member link suppressed in the latter).

**Current reads/commands:** Global first page calls `GET /api/v1/admin/top-ups?limit=25`; infinite query follows nextCursor. Board flattens pages and applies local status tabs/search/sort/page-size; counts are loaded rows, not verified totals. Search includes ID, Member, Student ID, provider reference and status. Drawer uses the list DTO—no separate detail operation. It shows credited/payment/fee/tax amounts, method/reference and timeline. Timeline always starts PENDING at createdAt, uses paidAt for PAID, leaves EXPIRED/FAILED transition dates unknown rather than equating expiresAt with a transition. Reconcile calls `POST /api/v1/admin/top-ups/{id}/reconcile`, displays notice and invalidates Top-up queries. Provider Event retry is the Finance form above. Member tab sends `userId={memberId}`, limit 25 and cursor, with loading/error/empty/load-more/detail states.

**Contracts/evidence:** Accepted `topup-and-conversion-contract.md`, Finance Rulebook and money ADRs define provider-confirmed credit to Spending Balance and provider fee/tax added to credited amount. They do not establish every Admin list field/status-history/timeline contract. The UI enum PENDING/PAID/EXPIRED/FAILED is source evidence; exact Admin endpoint status/amount/detail/Member-scope/cursor semantics remain UNKNOWN. No Top-up request is in historical API probe inventory. Do not derive a payment formula solely from frontend field names.

**Seams/consumers:** Finance owns global Top-up response validation/query/command; Member consumes a named Member-scoped public read and shared drawer presentation. Pure timeline/amount presentation cannot become provider-payment authority. Query scopes must distinguish global versus Member filters and each cursor; no cross-member result reuse.

**Current versus approved UX:** No specific timeline/detail/count delta is approved. Existing preference and section/error/state policies apply. Exact list-as-detail sufficiency, amount relationship and missing transition/expiry presentation are sharp questions. UNKNOWN does not permit disabled reconcile or removal. Board coverage and operational commands have separate child decisions.

**Scenarios:** `TOPUP-first-next-final-page`, `TOPUP-member-scope`, `TOPUP-loaded-vs-total`, `TOPUP-each-status-missing-transition-time`, `TOPUP-credit-payment-fee-tax-contract`, `TOPUP-invalid-money-or-reference`, `TOPUP-later-page-failed`, `TOPUP-reconcile-uncertain-no-repeat`. Keep `tests/unit/top-ups-board-model.test.ts` only for contract-aligned behavior; `tests/e2e/admin-security-api-fixture.ts` is isolated HTTP proof, not backend confirmation. Live reads require known safe records; reconcile/retry require approved safe records/events.

**Blockers/cutover:** Missing exact detail/amount/history/operational contracts are implementation prerequisites; accepted contract runtime, Member scope and cursor end are release checks. Retire Finance/Member mock paths, not Member Top-ups. No manufactured transition date, total or local credit is allowed.

### Wallet — `/wallet`, detail drawer and status/projection operations

**Source/owner:** `src/app/(admin)/wallet/page.tsx`; `src/features/admin/wallet/wallet-service.ts`, `wallet-query.ts`, `wallet-actions.ts`, `wallet-model.ts`, `wallet-page.tsx`, `wallet-status-command-dialog.tsx`, `wallet-board-store.ts`; current API operations in `admin-api-member-wallet.ts`. Wallet owns list/detail/history/Ledger/status/projection interfaces; Member owns Member-specific composition.

**Current reads/commands:** Server concurrently reads `/api/v1/admin/wallets?limit=50` and `/finance/overview`, returns first rows, and creates a remainingRows traversal with no screen consumer found. Browser query independently rereads/traverses all pages. Board status tabs/search/sort/page-size use loaded rows; Finance summary has independent error state. Drawer authenticated server action reads Wallet detail, status history and `/finance/ledger/transactions?walletId={id}&limit=5`. It labels these latest five committed/sealed transactions. Model filters sealed postings, sorts newest and derives historical resulting balances backwards from current projection without establishing balanced/committed eligibility or coverage/alignment. Verify Ledger reads `/wallets/{id}/verification`; Rebuild projection posts `/wallets/{id}/rebuild-projection`; status posts `/wallets/{id}/status` with Idempotency-Key, toStatus and reason. UI offers Active/Frozen/Suspended transitions, no Closed action, non-blank reason and a mock-only failure fixture selector.

**Contracts/evidence:** `wallet-compartment-contract.md`, `double-entry-ledger-contract.md`, `admin-wallet-freeze-contract.md`, ADRs 0005/0006/0010/0012 establish four integer-satang compartments, Current Wallet Balance sum, Ledger authority, retained obligations and holds. Freeze/Suspend reason/idempotency and Closed terminal behavior are accepted policy. All named Wallet/Finance/Ledger/verification/rebuild/status endpoint runtime and exact response contracts are UNKNOWN in published API evidence. Source totalBalanceSatang is not automatically proven consistent with four compartments. Verify/rebuild are current controls without a complete accepted operational input/result contract in this evidence set.

**Seams/consumers:** Board summary and Wallet list are independent checked reads; drawer detail/history/bounded Ledger read have independent validity. Public Wallet/Ledger reads and format/eligibility semantics serve Member detail/Statement; global summary read also serves Overview. Status and projection commands remain distinct. Search/Activity target the global Wallet board; drawer links to canonical Member Statement. Do not keep two financial authorities or universal status command handlers.

**Current versus approved UX:** Member Wallet read states already live in [Decide Member Payout details and Wallet read-state display](https://github.com/KUQuest/KUQuest-Admin/issues/138#issuecomment-5977165723); no global drawer-specific projection/history delta is approved by that resolution. Global resulting-balance/bounded-history presentation and exact operational controls are new questions. Keep independent summary/row/detail errors under shared policy; do not show invalid money as zero or derive trustworthy history from incomplete input.

**Scenarios:** `WALLET-four-compartments-total`, `WALLET-summary-fails-list-valid`, `WALLET-later-page-failure`, `WALLET-null-member-association`, `WALLET-sealed-unsealed-unbalanced`, `WALLET-projection-history-alignment`, `WALLET-no-ledger-vs-read-failed`, `WALLET-closed-no-new-command`, `WALLET-status-reason-idempotency-uncertain`, `WALLET-rebuild-uncertain-readback`. `wallet-api-fixture.ts` and model/service tests cover isolated behavior; `wallet-live.spec.ts` is a credential-gated scenario definition, not a run. Live status/rebuild requires explicit safe-record authorization.

**Blockers/cutover:** Missing operational/bounded-Ledger contracts are implementation questions. Accepted hold behavior and money invariants are not undecided policy; response schemas/cache changes are already-approved implementation work. Live exact contracts/cursor/projection/hold checks block release. Retire wallet-mock-data, mode branches, fixture selector and local business mutation; retire unused standalone Statement/remainingRows paths once their callers/tests are addressed, not valid shared transformations.

### Canonical Member Wallet Statement — `/member/[id]?tab=wallet-statement`

**Source/owner:** Member `member-service.ts`, `member-model.ts`, `member-wallet-model.ts`, `member-detail.tsx`; Wallet `wallet-ledger-pages.ts`. Reads Member detail, Member finance, Member Reports, then traverses Wallet-scoped Ledger pages. UI filters event type/ICT dates and starts at 25 visible rows, adding 25 from loaded history. Account Information derives Latest Wallet Transaction Date from loaded sealed rows.

**Current mismatch:** `finance?.wallet ?? detail.wallet` falls back even after successful null; missing/invalid balances become zero; sealed-only filtering and incomplete history can produce derived date/balances; absence/failure/filter-empty are conflated. These are already-settled implementation mismatches under the Member finance resolution, not new decisions.

**Evidence/authority:** Valid Member/finance/Ledger scope/coverage/null/source runtime is UNKNOWN. Four-compartment/eligible committed-sealed ordering and distinct absent/empty/failed/unverified/invalid/mismatch states are already approved. Keep all exact language/state detail in the Member finance resolution, including independent balance/date/Statement validity.

**Scenarios:** `MEMW-wallet-absent`, `MEMW-ledger-verified-empty`, `MEMW-filter-empty`, `MEMW-finance-fails-independent-member-snapshot`, `MEMW-success-null-no-silent-fallback`, `MEMW-wallet-identity-conflict`, `MEMW-invalid-money`, `MEMW-partial-or-repeated-cursor`, `MEMW-projection-mismatch`, `MEMW-latest-eligible-ICT-date`. Complete safe API-to-screen read proof remains a release requirement. No new unavailable command or endpoint is invented.

**Cutover:** Preserve canonical tab. `/member/[id]/wallet-statement` page only redirects; proxy also normalizes it. It is an old compatibility alias covered by the approved route-cutover decision, not a second retained screen. Retire that alias/redirect expectations; update controlled links. `wallet-statement-page.tsx` and standalone service loader have no production caller found and are not a second canonical owner.

### Payout queue — `/payout`

**Source/owner:** `src/app/(admin)/payout/page.tsx`; Payout `payout-service.ts`, `payout-model.ts`, `payout-query.ts`, `payout-board-page.tsx`, `payout-board-store.ts` (exports via `payout-page.tsx`). Server traverses one `/api/v1/admin/payouts?status=...&limit=50&sort=newest&cursor=...` stream per six statuses and merges all records. Any partition failure rejects the read. Default Needs review tab is PENDING_ADMIN_APPROVAL; other tabs/search/sort/page-size/counts are local over merged rows. Board displays amount, Member, masked destination/status/date and opens intercepted detail or full page. Commands are in detail, not board.

**Contracts/evidence:** Accepted Payout/Admin Approval contracts, ADRs 0005/0008/0010/0022 govern manual approval-before-provider, reserve/rejection, canonical six statuses and masked destinations. Historical global first page and one detail are CONFIRMED narrowly; no complete status partition/cursor/total/empty coverage was proved. OpenAPI list limit and approval headers are SPEC-ONLY as recorded in API facts. Six-query completeness is UNKNOWN, not implied by a loop.

**Seams/consumers:** Payout query owns list coverage/validation. Sidebar and Overview count read from Overview, not loaded Payout rows; their public invalidation/read interfaces are genuine consumers. Search/Activity link by UUID with safe Display IDs. Member Payout summary/history has independent source requirements and cannot substitute a global page.

**Current versus approved UX/scenarios:** Manual pending-first and masking are policy; local control/count and partial-partition presentation are not new approvals. Board coverage ticket owns remaining question. Requirements: `PAYOUTQ-six-status-cursor-coverage`, `PAYOUTQ-one-partition-fails`, `PAYOUTQ-final-nonempty-and-empty`, `PAYOUTQ-missing-display-ID-no-UUID-text`, `PAYOUTQ-masked-destination`, `PAYOUTQ-invalid-status-or-money`, `PAYOUTQ-loaded-not-total`. Live read milestones must exercise accepted partitions/cursors safely, with actual navigation/Session isolation. No current run is claimed.

**Cutover:** Remove PayoutDataSource, mock rows/state/local overrides/events. Real consumers include Overview adapter, dashboard seeds and shared query events; update them together. Keep isolated contract fixtures, not mock runtime.

### Payout detail/full page/intercepted drawer — `/payout/[id]`

**Source/owner:** full and intercepted Payout route files; `payout-service.ts`, `payout-page.tsx`, `payout-model.ts`, `payout-query.ts`, `payout-command-dialog.tsx`, `payout-status-badge.tsx`. Shared PayoutDetailContent composes amounts/destination/history/context/outcome; drawer has compact timing/sticky command content.

**Current reads/commands:** Reads detail then status-history; history failure silently retains embedded detail.history. Traverses global six-status list again and filters by Student to derive previousPayouts. Detail 404 becomes not-found. Pending offers Approve/Reject; reasonCode and at least eight free-text characters are required by current dialog. Posts `/payouts/{id}/approve` or `/cancel` with generated Idempotency-Key/If-Match=version and reasonCode/optional reason. SUBMITTED_TO_PROVIDER/PROVIDER_PENDING/FAILED expose `/reconcile`; SUCCEEDED/CANCELLED no action. Command success ignores resource summary/version/audit result, refreshes router and closes API drawer; errors use Error.message. Mock branch mutates persisted status/history/version and emits custom event.

**Contracts/evidence:** Sampled detail/version/masked payload is CONFIRMED only for one record; no ETag was observed. Recorded approve/cancel headers and reasonCode are SPEC-ONLY; actual conflict, idempotency, Origin, business success and all mutations remain UNKNOWN. Status-history completeness, embedded fallback, previous-Payout scope, reason catalog/length and reconcile contracts are UNKNOWN source-only details. Preserve actual/maximum/principal money distinctions and null actual amounts rather than calculate them; backend fee/tax remains authority.

**Seams/consumers:** Detail/history/previous-Payout reads need independent contracts and failure states; approval/rejection are feature-owned commands with checked outcome and authoritative reads. Finance operational ticket owns reconcile/retry; Member resolution owns Member missing-data states; board ticket owns list/count scope. Full/drawer composition is not permission to introduce different policy.

**Current versus approved UX:** Manual gate, rejection reserve release, no timeout and destination masking are settled policy. History fallback/previous-history completeness and extra reason requirements are current source, not separately approved deltas. The Payout detail ticket decides these exact inputs/presentation; no backend change is authorized.

**Scenarios:** `PAYOUTD-detail-valid-history-fails`, `PAYOUTD-embedded-history-incomplete-or-invalid`, `PAYOUTD-previous-history-partial`, `PAYOUTD-each-status-null-actual-fees`, `PAYOUTD-reason-and-code-contract`, `PAYOUTD-stale-version`, `PAYOUTD-idempotent-replay-different-body`, `PAYOUTD-dispatch-uncertain-readback`, `PAYOUTD-success-refresh-failed`, `PAYOUTD-drawer-full-back-forward-focus`. Safe live approve/reject/reconcile needs explicitly authorized test records, outcome verification and no duplicate submission. Existing live-gated Payout spec is not proof it ran.

**Blockers/cutover:** Exact history/approval/operational contracts are implementation prerequisites. Runtime accepted contracts/status/outcomes/masking block release. Remove mock local state/events/receipts and raw backend-message presentation under existing decisions; retire incidental tests, not behavioral financial boundaries.



## Quest and moderation workflows

### Evidence and shared seams

Historical Quest list requests are CONFIRMED narrowly: limit 50 success/51 validation, tested q empty result, totalCount/countsByStatus, one cursor reaching a nonempty last page, and missing Quest UUID returning QUEST_NOT_FOUND. No successful Quest detail/finance, Dispute, Report, Conduct or business command is in immutable probe inventory. Source methods/types, `All_mis_api.md` UI audit, `missing_api.md` older-server observations and fixtures are not OpenAPI or current runtime proof; their exact endpoint/payload/decision contracts remain UNKNOWN unless the published facts explicitly establish a SPEC-ONLY fact.

Each feature owns board/detail/evidence/command schemas and mapping. Current central `AdminReportCase` is a catch-all shared type with unknown fields, not a verified common domain contract. Shared moderation workspace is actual reusable drawer presentation used by Report, Conduct and Dispute, not owner of their policy/commands; full pages compose separately. Real consumers include Member related cases, Quest-to-Dispute, case-to-Quest/Member links, Overview/sidebar counts, Search and Activity links. Expose named public projections/reads/invalidation only for those consumers.

Common implementation work already approved: replace unchecked payload casts/alias repair, static or mode-only query keys, infinite initial freshness, partial command-result merging, raw Error.message presentation, local business update events and production mock branches. These are not new architecture decisions. Exact unsupported input-contract assumptions and related UI consequences below are decision prerequisites; live proof of an explicit accepted contract remains a release check.

### Quest board/detail and Admin actions — `/quest`, `/quest/[id]`

**Source/owner:** `src/app/(admin)/quest/page.tsx`, `[id]/page.tsx`, intercepted `@modal/(.)quest/[id]/page.tsx`; `src/features/admin/quest/quest-service.ts`, `quest-model.ts`, `quest-query.ts`, `quest-board-page.tsx`, `quest-board-store.ts`, `quest-page.tsx`, `quest-command-dialog.tsx`, `quest-dispute.ts`; current API operations in `admin-api-quest.ts`.

**Current reads:** Board traverses list pages at limit 50/newest, maps records and applies local state/team/solo/search/sort/page controls; ignores backend totalCount/countsByStatus. Detail treats QST-prefixed route IDs specially by scanning list Display IDs for UUID before detail/finance reads. Detail 404 yields not-found; finance failure becomes null. Failed Quest performs a three-status Dispute list lookup; lookup error is distinct from no case. Full/drawer model includes summary, Condition/description, images/attachments, Candidates/Teams/Assignments, Proof Submission, edits/timeline, Hirer, schedule/location, Admin Actions, finance and Dispute/risk. Financial section shows funding total/net Reward/fee policy/transfer rows, not every reservation/ledger field present in its model.

**Current commands:** Hide/Restore/Terminate post corresponding Quest routes with Idempotency-Key, If-Match and reasonCode; UI collects reason text but adapter drops it. Dialog requires 8–500 text characters, including API Restore. Hide availability is active non-terminal; Restore appears when hiddenAt; Terminate appears for non-terminal including Draft. Command result is ignored and router refreshed. Failed Quest with no linked case offers Worker selection/open Dispute, posting workerId without idempotency header.

**Policy/contracts:** Accepted Quest/Admin Hide contracts and ADRs 0021/0024 define canonical seven-state lifecycle, hiddenAt independence, unchanged Assignments/escrow, non-empty Hide reason, no required Restore reason, idempotency/audit and notifications. No accepted Admin Terminate contract was found; this is missing policy/contract evidence, not confirmed unsupported. Sampled extra Quest count keys are zero-valued; they do not demonstrate extra record states. Legacy mapping of AWAITING_CONSENT/SUBMITTED/APPROVED/REWORK/DISPUTED into canonical states is not permission for compatibility in clean cutover. Dispute does not reopen a Failed Quest. Exact detail/finance/action request/result/reason-code contracts remain UNKNOWN.

**Seams/consumers:** Separate list/detail schema mapping, board UI state, command inputs/mutation and independently valid finance read. Quest-to-Dispute public lookup/open interface is a genuine seam; case features and Member/Search/Activity/Overview link back through canonical routes. Display ID lookup is current compatibility behavior; API key/visible Display ID rules remain settled. Do not prescribe new backend fields to fix a frontend view.

**Current versus approved UX:** No Quest command/section redesign is approved. Existing validation/independent section/error/state policy applies. New action ticket covers reason mismatch/Terminate authority; board ticket covers query/count scope. Preserve accepted policy rather than blindly preserve aliases or dropped reasons. Finance transfer-only composition is current screen boundary, not permission to add reservation/ledger panels as a new feature.

**Scenarios:** `QUESTQ-q-counts-cursor-and-empty`, `QUESTD-missing-vs-failed-vs-invalid`, `QUESTD-finance-fails-detail-valid`, `QUESTD-failed-dispute-none-one-many-lookup-failed`, `QUESTCMD-hide-preserves-state-assignment-escrow`, `QUESTCMD-restore-reason-contract`, `QUESTCMD-stale-idempotent-uncertain-readback`, `QUESTCMD-success-refresh-failed`, `QUESTID-UUID-key-DisplayID-text`, `QUESTNAV-drawer-direct-back-language-theme`. Live Hide/Restore/open needs authorized safe records. Terminate cannot be tested/implemented against an invented policy. Isolated fixtures prove frontend response handling, not runtime command capability.

**Cutover:** Retire quest-mock-data/state, persisted overrides/events/receipts, mode loaders/hooks, dashboard seeds and legacy route/status repair. `quest-route-api.spec.ts` is credential-gated, not proof of a run; mock-configured `quest-route.spec.ts` scenarios must use isolated HTTP fixtures through API-only validation. Keep useful domain boundary tests, not text/legacy aliases.

### Dispute Case board/detail/evidence/settlement — `/dispute`, `/dispute/[id]`

**Source/owner:** route and intercepted detail files; `src/features/admin/dispute/dispute-service.ts`, `dispute-model.ts`, `dispute-query.ts`, `dispute-board.tsx`, `dispute-board-store.ts`, `dispute-detail.tsx`, `dispute-decision-dialog.tsx`, `dispute-adapter.ts`; `admin-api-dispute.ts`; Quest's `quest-dispute.ts` is actual open/lookup consumer.

**Current reads:** Board issues one list per three statuses at limit 50/newest, encodes per-status cursors into a JSON cursor, merges/sorts rows and enriches each from Quest/detail finance. Local tabs/search/sort/page/counts use loaded data. Detail reads case then enrichment. Missing enrichment fields fall back to derived/missing parties/cap/context. Evidence calls `/api/v1/admin/disputes/{caseId}/evidence` with generated case/reference idempotency key and displays redacted JSON preview. Full page and drawer share model but compose differently; drawer uses common context presentation.

**Current commands:** Open from failed Quest posts `/disputes/open/{questId}` with workerId; no idempotency in client. Decide posts `/disputes/{id}/resolve` with Idempotency-Key/If-Match, outcome/reasonCode, and Worker/amount for resolution. Only pending Failed Quest is actionable. Current dialog forces full remaining sharedCapSatang and disables partial allocation; caps can come from several case/finance fields; model computes failedAt + seven-day hold date. Mutation merges partial command result into existing model, not an independently complete validated detail.

**Policy/contracts:** `admin-dispute-case-contract.md`, Quest reward/funding contracts, ADR 0024 establish Failed-only, multiple cases/one per filer, Admin behalf-of-Worker filing within five days, shared remaining held-funding cap, seven-day unconditional release, explicit positive Satang transfer Hirer-to-Worker, final audited idempotent decision, non-active Hirer Wallet not blocking and post-release insufficient-balance risk. It does not require consuming the whole cap. Exact case/party/cap/evidence/open/result/reason catalog/cursor inputs remain UNKNOWN in immutable API evidence. Historical missing API observations are not a current gap confirmation.

**Seams/consumers:** Case validation/composition, independent Quest/finance enrichment, evidence read/audit and settlement command are distinct responsibilities. Quest consumes public open/lookup; Member/Search/Activity/Overview consume links/projections/count effects. Case command cannot mutate Quest State locally or reconstruct authoritative funding from display values.

**Current versus approved UX:** Full-cap-only control is unapproved relative to allowed positive bounded amount. Opening form's zero-case assumption may conflict with multiple eligible filers. Two child questions separate opening eligibility/duplicate handling from settlement inputs/evidence. Generic recovery/cache mechanics and accepted money policy are not reopened.

**Scenarios:** `DISPQ-status-stream-cursors-and-one-stream-failure`, `DISPD-enrichment-fails-case-valid`, `DISP-open-five-day-per-filer-worker-eligibility`, `DISP-open-lookup-unavailable-not-none`, `DISP-resolve-positive-partial-cap`, `DISP-cap-changes-after-proof`, `DISP-dismiss-no-money`, `DISP-nonactive-wallet`, `DISP-posthold-insufficient-balance`, `DISP-quest-stays-failed`, `DISP-evidence-bounded-audited-invalid`, `DISP-stale-idempotent-uncertain-final`. Safe money-command proof requires explicitly authorized test Failed Quest/Worker and outcome reads; no such proof was performed.

**Cutover:** Remove persisted `dispute-adapter`, saveMockDisputeDecision, local Member penalties/receipts, dashboard seeds and legacy status repair. `dispute-adapter.test.ts` migration/persistence expectations retire; keep contract-aligned boundary tests and API-mode HTTP scenarios, not aliases to satisfy historical parity.

### Message Report Case board/detail/evidence/decision — `/report`, `/report/[id]`

**Source/owner:** route/intercepted files; `src/features/admin/report/report-service.ts`, `report-model.ts`, `report-query.ts`, `report-board.tsx`, `report-board-store.ts`, `report-detail.tsx`, `report-decision-dialog.tsx`, `report-adapter.ts`; `admin-api-report.ts`, catch-all `AdminReportCase` currently in `admin-api-types-dispute.ts`.

**Current reads:** List `/api/v1/admin/reports?kind=REPORT_CASE&limit=50&sort=newest&cursor=...`; mixed Conduct rows are filtered by mapper. Detail reads generic report endpoint; related Quest Display ID enrichment is best effort. Local board tabs/search/sort/page/counts use loaded rows. Model displays reporterEntries[0], reported Member/moderation/Quest context, Message linkage and decisions via loose aliases. Evidence Reference opens `/api/v1/admin/evidence/{evidenceRef}` with idempotency key, presents bounded Message/attachment context and truncation where supplied, and states access is logged. No general Chat browser/composer exists.

**Current commands:** `/reports/{id}/decide` with Idempotency-Key/If-Match and outcome/reason/reasonCode. Pending offers No violation/Confirm violation; Hidden offers Restore Message. Reason is non-blank/max 500; model derives reason codes from choice/free text with regex/fallback. Mutation checks only kind/id/status before remapping. Source label vocabulary includes additional Spam/Inappropriate/Threat/Other/fraud aliases beyond accepted Reporter reason. No uncertain-dispatch outcome read is enforced.

**Policy/contracts:** `admin-trust-safety-contract.md`, member penalty contract, ADRs 0014/0015 define bounded Evidence References/immutable access Admin Actions, Report lifecycle/Reporter Entries, Message visibility, strike/restore reversal, retention and canonical reason. Pending/Hidden are open; Dismissed/Restored closed. Hide affects visibility/strike while keeping case open; Restore from Hidden reverses strike/closes; Dismiss changes neither Message nor Member. Exact generic DTO/discriminator/reporter/decision/reason/evidence and Member received/submitted query scope are UNKNOWN, not established by frontend types.

**Seams/consumers:** Report owns Message Report-specific schemas/decision; shared context/dialog owns reusable presentation mechanics. Member detail consumes Reports received with memberId but currently fetches one page and no submitted query; its approved missing-data wording/coverage requirements remain in Member resolution. Conduct is a distinct kind/feature, not an internal branch of a generic workspace command. Overview/sidebar/Search/Activity have genuine status/link/invalidation consumers.

**Current versus approved UX:** No expanded reason vocabulary or primary-first-reporter semantics are approved. New Report contract ticket owns exact input/section/evidence/reporter decisions and external scope prerequisites, not backend redesign. Section errors must not discard invalid mixed records into a misleading valid empty list. Existing Member missing-data decisions are not reopened.

**Scenarios:** `REPORT-one-many-reporter-entries`, `REPORT-evidence-only-named-reference`, `REPORT-truncated-or-expired-attachment`, `REPORT-dismiss-no-strike`, `REPORT-hide-open-case-strike-visibility`, `REPORT-restore-hidden-only-strike-reversal`, `REPORT-invalid-context-independent-detail`, `REPORT-member-received-submitted-kind-cursors`, `REPORT-stale-idempotent-uncertain-readback`. Fixtures safely exercise frontend boundaries; safe live Message moderation/access needs disposable records, privacy-safe evidence and authorized Admin. No current run is claimed.

**Cutover:** Remove report-adapter/saveMockReportDecision, local demo penalties/events/receipts, seed/migration paths, Closed-status compatibility. Preserve usable shared evidence presentation, not loose payload repair. Rewrite mock-configured route/adapter tests as contract-aligned HTTP behavior or retire obsolete expectations; historic saved-demo-data notes are not target behavior.

### Conduct Report board/detail/decision — `/conduct-report`, `/conduct-report/[id]`

**Source/owner:** route/intercepted files; `src/features/admin/conduct-report/conduct-report-service.ts`, `conduct-report-model.ts`, `conduct-report-query.ts`, `conduct-report-board.tsx`, `conduct-report-board-store.ts`, `conduct-report-detail.tsx`, `conduct-report-decision-dialog.tsx`, `conduct-report-adapter.ts`; current generic Report API/type.

**Current reads:** List fans out three canonical statuses with kind=CONDUCT_REPORT, limit 50/newest and per-status JSON cursors; merges/sorts/filter-maps kinds and uses local control/counts. Generic detail best-effort enriches Quest display. Evidence derives questRecord, one Assignment, one Proof Submission and timestamps; detail renders Member moderation context, assignment/proof/Quest evidence and timeline. It makes no Conduct-specific Chat-history/evidence request. Common workspace policy note says context may be accessed but does not provide access.

**Current commands:** `/reports/{id}/decide` with Idempotency-Key/If-Match. Uphold sends outcome/reason; Dismiss sends outcome/reason/decisionReasonCode. UI choices No violation and Insufficient evidence both dismiss, with extra source decision codes; Confirm violation upholds. Dialog requires 8–500 characters, while accepted policy requires a reason without this catalog/minimum. Mutation checks only kind/id/status before remapping; no reliable uncertain-command readback.

**Policy/contracts:** `admin-conduct-report-contract.md` and member penalty contract define three reasons and role/mode/window limits: Hirer-to-Worker abandoned (Team Leader only for Candidate Group), Worker-to-Hirer out-of-scope, Worker-to-Worker no-show in FCFS Group. Admin reviews named Quest record and may access reported Quest Work/Candidate Inquiry history, each access logged as immutable Admin Action. May-access is not a mandate to add a new Chat UI. Uphold permanent strike/no restore with notification; dismiss no strike/notification; final audited idempotent decisions and one-year terminal retention. Exact structured context/DTO/discriminator/reason catalog/audited context-read contracts/runtime remain UNKNOWN.

**Seams/consumers:** Conduct owns Quest-behavior validation/composition/decision; bounded audited optional context is distinct from Report Message evidence or ordinary Chat membership. Shared mechanics cannot choose its policy by kind. Member recent Reports, Quest/Member links, Overview/nav/Search/Activity consume genuine projections/effects.

**Current versus approved UX:** No extra Insufficient evidence meaning/catalog, new general Chat viewer or feature removal is approved. Conduct context/decision ticket fixes the exact permitted retained boundary, missing/invalid evidence states and external audit-read prerequisites. It cannot alter accepted Domain Owner policy or derive filing/role legality from frontend aliases.

**Scenarios:** `CONDUCT-three-reasons-role-mode`, `CONDUCT-missing-invalid-assignment-proof-timestamps`, `CONDUCT-dismiss-codes-no-strike`, `CONDUCT-uphold-permanent-no-restore`, `CONDUCT-context-access-audit-if-retained`, `CONDUCT-status-stream-pagination`, `CONDUCT-stale-idempotent-uncertain-readback`, `CONDUCT-member-scope-and-notification`, `CONDUCT-drawer-full-language-theme`. Use isolated HTTP fixtures for failure/invalid/races; safe authorized records for upheld/dismissed effects. No live result is inferred.

**Cutover:** Remove conduct-report-adapter/saveMock decision, local penalty mutation, seeds/migration/mock mode/events/receipts and source alias repair. Existing seed/persistence adapter tests are not command proof; retain useful behavior scenarios through production API-only validation, not runtime substitutes.



## Overview, Member, Activity Log and Global Search workflows

## Evidence convention and provenance

Baseline: `aa5f7a3dec764ce5e5bb0fbe8cd25a0b37cdbe50`; this is read-only planning evidence. API classifications use the immutable [`Publish verified backend API evidence for refactor decisions`](https://github.com/KUQuest/KUQuest-Admin/blob/b5fbd37edfe59ae2a448eadb8ea4ed3a9fd129d3/docs/api-facts.md):

- **CONFIRMED** = the recorded curl/runtime observation, only within the sampled request and payload scope.
- **SPEC-ONLY** = an exact documented OpenAPI fact explicitly captured in `docs/api-facts.md` (for example the Admin Search 429 error schema, Payout command headers, or documented list limits where named). A frontend TypeScript declaration, source URL, unit mock, or fixture is **not** SPEC-ONLY.
- **UNKNOWN** = source-only or fixture-only capability, unobserved success payload/semantics, or evidence too narrow to establish the claim.

The facts confirm sampled `GET /api/v1/admin/overview` success with a valid Admin cookie, 401 without a valid Admin Session, the resource envelope for that sampled read, and 400 validation for an invalid Member identifier. They confirm only sampled global Payout list/detail reads. They do not contain successful valid Member, Member Finance, Member-filtered Report, Top-up, Ledger, Activity Log, Finance Overview, or Search reads. `activity-live.spec.ts` is credential-gated; `admin-security-api-fixture.ts` and `api.example.test` handlers are deterministic HTTP fixtures, not live backend proof.

Accepted UX/state decisions remain binding: [`Decide API-only capability gaps and approved UX changes`](https://github.com/KUQuest/KUQuest-Admin/issues/133#issuecomment-5977007760), [`Decide Member detail evidence gaps and missing-data UX`](https://github.com/KUQuest/KUQuest-Admin/issues/137#issuecomment-5977076502), [`Decide Member Payout details and Wallet read-state display`](https://github.com/KUQuest/KUQuest-Admin/issues/138#issuecomment-5977165723), [`Decide shared UI, styling and localisation boundaries`](https://github.com/KUQuest/KUQuest-Admin/issues/134#issuecomment-5977495548), and [`Decide verification gates and incremental cutover sequencing`](https://github.com/KUQuest/KUQuest-Admin/issues/135#issuecomment-5977541586). No approved Member missing-data state is reopened below.

---

## `/overview` — command centre, Finance summary, latest Activity

### Source, reads, behavior, ownership, and seams

- `src/app/(admin)/overview/page.tsx:3-13` renders `AdminOverview`; API mode calls `loadOverviewPageData(cookieHeader)`, while the current non-API branch renders local demo data.
- `src/features/admin/overview/overview-service.ts:64-97` reads:
  1. `GET /api/v1/admin/overview`;
  2. `GET /api/v1/admin/activity-log?limit=10&sort=newest` (failure is caught as an empty Activity projection);
  3. `GET /api/v1/admin/search?q=<resourceId>&kind=<mapped-kind>` for Activity target Display IDs;
  4. `GET /api/v1/admin/finance/overview`, independently settled from the main Overview read.
- `overview-model.ts` maps four queues: Payout Approvals, Dispute Cases, Report Cases, Conduct Reports. Each has count/source/state, optional oldest title/id/link, and waiting age. `AdminOverview` renders queue counts, Finance member Wallet/lifetime metrics, ten latest Activity entries, Quest-state counts, Member-status counts, and Wallet-status counts. There is no Overview-local filter or export and no queue command.
- The Activity timeline is a read-only preview whose heading links to `/activity`; individual rows are not detail buttons. Queue oldest links go to the owning feature detail only when an API `oldest.id` exists.
- `overview-query.ts` owns API/mock query refresh on focus/visibility and event invalidation. `admin-api-transport.ts` still owns Overview in-flight/cache state; that is an already-approved state-ownership implementation task, not a new architectural question.
- Real consumers: Admin navigation derives queue counters from Overview; the shell displays Overview/Activity links; global Search uses the same route builders; Activity target lookup uses Search. These are named migration seams, not permission for a universal feature module.

### Counts and missing-data behavior

- Optional API fields include report/conduct counts, `members.byStatus`, `wallets.byStatus`, and queue details. The model preserves nullable/Unavailable source markers and sets `hasSummaryOnlyData`/`hasUnavailableData`.
- `totalWorkLeft`/`memberSignals` become null when required counts are unknown, but `overview.tsx` formats null through `countLabel()` as `0`. This current presentation invents a zero and must be corrected under the accepted truthfulness policy.
- When `members.byStatus` is absent, Member status rows are null/unavailable. When `wallets.byStatus` is absent, FROZEN/SUSPENDED use sampled Overview fields while ACTIVE/CLOSED remain null; this is not complete distribution proof.
- Finance failure is section-local (`financeOverviewError`); main Overview failure throws through the route loader. Loading, unavailable, and loaded Finance states are separate.

### API evidence

| Read | Status | Boundary |
|---|---|---|
| `GET /api/v1/admin/overview` | **CONFIRMED** sampled read | 200 with valid Admin cookie, 401 without/after revocation, resource envelope. Optional field completeness and semantics are not confirmed. |
| `GET /api/v1/admin/finance/overview` | **UNKNOWN** | Source/types/fixtures only; no valid runtime fact in the immutable snapshot. |
| `GET /api/v1/admin/activity-log` | **UNKNOWN** | Source/types/fixtures/live-test definition only; no valid runtime fact in the snapshot. |
| `GET /api/v1/admin/search` | **UNKNOWN** success path; **SPEC-ONLY** only for the documented 429 error schema | No successful Search response is recorded; rate-limit threshold/Retry-After are UNKNOWN. |

### Current versus approved UX and verification

No Overview-specific UX delta was approved. The accepted capability/error rules require unavailable, failed, invalid, and empty states to remain distinct; local demo fallback is not an API-only capability. The null-to-zero count behavior is an implementation defect, not an approved delta.

Safe read scenarios: complete queue details; counts present/oldest absent; optional report/conduct/member/wallet fields absent; zero queues; Finance failure while Overview succeeds; Activity failure; invalid payload; missing/forbidden/unavailable Session; focus/visibility refresh; ten-entry ordering; oldest-link navigation; Thai/English/theme. With an accepted documented contract, missing live proof is a **release check** under [`Decide verification gates and incremental cutover sequencing`](https://github.com/KUQuest/KUQuest-Admin/issues/135#issuecomment-5977541586), not by itself an implementation blocker. A missing contract/semantic needed to specify the workflow is an unresolved contract blocker.

### Precise Overview question

**Which optional Overview fields (`queues.oldest`, report/conduct counts, Member/Wallet status distributions, Finance integrity/volume fields, Activity target Display IDs) are required, optional, authoritative, and empty/unknown under the backend contract?** The question is about evidence/contract ownership, not approval to change the current screen.

### Retirement targets

Remove Overview Mock runtime branches, `overview-adapter.ts`, `overview-finance-mock-data.ts`, local Activity storage (`kuquest-admin-activity-v2`), `payout-mock-state` overlay reads, dashboard seed/migration reads, and Mock query paths. `overview-adapter.test.ts` and Mock-only Overview tests become obsolete or must be rewritten as isolated API-shaped behavior tests. Existing local demo keys remain unused rather than cleaned up, per [`Decide legacy route and local-data cutover policy`](https://github.com/KUQuest/KUQuest-Admin/issues/132#issuecomment-5976953420).

---

## `/member` — Member board

### Source, reads, behavior, ownership, and seams

- `src/app/(admin)/member/page.tsx:8-13` calls `loadMemberPageData(cookieHeader)` in API mode.
- `member-service.ts:28-41` reads `GET /api/v1/admin/members?limit=50[&cursor=...]`, maps items, and returns only `items` plus `nextCursor`.
- `MemberBoard` filters loaded models locally by status tabs and a text query over Display ID, Student ID, name, email, faculty, department, occupation, Member status, and Wallet status. It sorts six columns, paginates locally at ten by default, offers cursor `Load more`/`all`, and opens `/member/<id>` in a soft drawer. There is no export.
- Board counts are loaded/filtered counts, not backend totals. If every API item has null Member status, status tabs are hidden. Empty, initial read failure, and next-page failure have separate presentations.
- Consumers include Wallet board Member links, case-detail Member links, Activity target links, global Search result links, and the Member drawer/full page. The service does not use the declared `search` or `walletStatus` query fields.

### API evidence

`GET /api/v1/admin/members` valid-list behavior is **UNKNOWN**: source/type/test declarations only. `GET /api/v1/admin/members/not-a-uuid` returning 400 `VALIDATION` is **CONFIRMED** only for invalid-ID validation, not valid Member capability, counts, or pagination. No valid list response, total count, cursor semantics, or server filter behavior is in the immutable snapshot.

### Current versus approved UX and verification

No separate board UX delta was approved. Under [`Decide server-state and UI-state ownership`](https://github.com/KUQuest/KUQuest-Admin/issues/131#issuecomment-5977429700), partially loaded pages must not be presented as complete counts. Safe checks: first/final cursor page, zero result, filter/query reset, missing status, invalid payload, page failure/retry, Session isolation, drawer/full-page parity, keyboard, mobile, Thai/English/theme. If an accepted contract is available, live API proof is a release check; unresolved query/count semantics are a contract blocker.

### Precise board question

**Is the retained board search/status filtering contract-backed by `AdminMemberListQuery.search/walletStatus`, or intentionally local over loaded pages; and what total/count semantics are authoritative?** This is needed to specify truthful counts and cursor resets, not a request to silently change UX.

### Retirement targets

Remove `MemberBoard` Mock branching, `member-adapter.ts`, Mock list/detail loaders, local demo storage/mutations, dashboard seed/migration dependencies, and Mock-only board/detail tests. Keep only isolated API-shaped fixtures and pure model tests that exercise accepted response behavior.

---

## `/member/[id]` and intercepted Member drawer

### Route/service reads and commands

- Full page `src/app/(admin)/member/[id]/page.tsx:22-34` parses `?tab=` and calls `loadMemberDetailFromApi`; intercepted drawer `src/app/(admin)/@modal/(.)member/[id]/page.tsx:10-17` uses the same service/model.
- `member-service.ts:44-72` reads Member detail, then in parallel Member Finance and `listReports({memberId, limit:50})`; it chooses `finance?.wallet ?? detail.wallet`; if a Wallet exists it follows all Ledger cursors at `limit=50`.
- `member-query.ts` lazily reads Top-ups with `userId=<memberId>&limit=25&cursor`. API mode does not call penalty/note commands: `useMemberActionMutation` throws “Admin notes are not available…” or “Member penalty commands are not available…”. Mock mode writes local demo data.
- `memberModelFromApi` initializes API Reviews, Quest history, Payout records, penalty history, Admin Notes, and submitted Reports as empty/missing. It maps only the one Reports page and traversed Ledger rows.

### Section evidence rows

| Section | Current behavior and meaningful seam | Evidence status | Approved UX / required proof |
|---|---|---|---|
| **Account Information / Occupation** | Shows Member/Wallet status, four-balance sum, latest sealed-row date, email, creation date, and label **Role**; null Occupation becomes **Student**. | Valid Member/Finance/Ledger reads **UNKNOWN**; only invalid Member-ID validation is CONFIRMED. | [`Decide API-only capability gaps and approved UX changes`](https://github.com/KUQuest/KUQuest-Admin/issues/133#issuecomment-5977007760) already approved label **Occupation**, API value, otherwise **Not provided**; verify Staff/Lecturer/Student/missing. Do not reopen. |
| **Reviews and overview preview** | API `reviews=[]`, while summary count/average come from `detail.stats`; positive count shows unavailable text only on full tab; zero reaches generic filter-empty; preview still shows count/average and View all. Mock has generated Reviews. Full tab has local text/rating filters and is read-only. | Review detail capability **UNKNOWN**; frontend types/fixtures are not runtime evidence. | Approved in [`Decide Member detail evidence gaps and missing-data UX`](https://github.com/KUQuest/KUQuest-Admin/issues/137#issuecomment-5977076502): verified zero **“No Reviews received.”**; positive without details **“Review details are not available.”**; unverified **“Review data is not verified.”**; no invented average/count; disable filters when details unavailable. Verify zero/positive/absent/unavailable/invalid/supplied-details. |
| **Quest history / Activity tab** | API `quests=[]`; screen displays zero loaded rows while separately showing completed summary stats. Quest rows would link to `/quest/<id>` if present. | Member-specific history **UNKNOWN**. | Approved exact missing state **“Quest history is not available.”**; retain validated summary separately; never infer full history from summary. Verify scope, coverage, zero, unavailable. |
| **Work Experience** | API mode says “Experience detail is not provided by the Admin API”; Mock shows fabricated participant content. | Admin read **UNKNOWN**. | Approved **“Work Experience is not available.”**; only validated empty read may say no records. |
| **Certificates** | API mode says “Certificate detail is not provided by the Admin API”; Mock shows fabricated orientation credential. | Admin read **UNKNOWN**. | Approved **“Certificates are not available.”**; verify read/access/records/empty/unavailable. |
| **Payout summary/records** | API records remain empty. Count uses `detail.stats.payoutsCount`; amount uses stats unless any loaded record exists, then sums that subset. No Member Payout detail read. | Global sampled Payout list/detail **CONFIRMED** only; Member scope/association/records/summary semantics **UNKNOWN**. | Approved in [`Decide Member Payout details and Wallet read-state display`](https://github.com/KUQuest/KUQuest-Admin/issues/138#issuecomment-5977165723): retain summary/preview; **“No Payouts.”** only verified zero; **“Payout details are not available.”**, **“Payout data is not verified.”**, distinct failure/invalid/conflict; never substitute loaded-page sum for lifetime. Verify statuses, scope, cursors, totals, ownership, and all states. |
| **Wallet source/balances** | Service nullish-falls back from Finance Wallet to Member-detail Wallet; `balancesFromWallet` converts missing numbers to zero; current balance sums four compartments. | Member Finance/Wallet null/identity/projection semantics **UNKNOWN**. | Approved Finance-primary/validated fallback, no silent successful-null fallback, no inferred zero, single-source four compartments, conflict/mismatch text and command blocking. Verify absence/failure/null/invalid/conflict/mismatch. |
| **Latest date / Wallet Statement** | Latest date is max `createdAt` among loaded sealed rows, without proving complete Wallet-scoped committed/sealed coverage. Missing date is `—`. Statement loads all cursors, filters event type/date locally, shows four balances and 25 rows then local Load more. | Valid Ledger read/latest semantics **UNKNOWN**; unit fixtures prove only cursor/request wiring. | Approved states include **“Member นี้ไม่มี Wallet”**, **“ยังไม่มี Ledger Transaction”**, **“อ่าน Wallet Statement ไม่สำเร็จ”**, **“อ่านวันที่ Ledger Transaction ล่าสุดไม่สำเร็จ”**, unverified/invalid text, and filter-empty distinct from empty history. Verify scope/order/sealed eligibility/cursor completeness/date and independent source failures. |
| **Reports received** | One `listReports(memberId, limit:50)` page; loaded length is displayed as count; no cursor continuation/filter/export; kind inferred from returned status. Recent preview truncates to three. | Member-filtered Reports **UNKNOWN**. | Approved **“Reports received are not available.”** on missing data; label loaded records as Records loaded; verify Report Case + Conduct coverage, `memberId` meaning, pagination/totals and independent errors. |
| **Reports submitted** | API model is always empty with unavailable text; UI shows a zero count beside it and says data is Mock-only. | No submitted-report operation/runtime evidence: **UNKNOWN**. | Approved **“Reports submitted are not available.”**; never display missing as zero; retain section and show verified records if contract exists. |
| **Moderation Summary/history/commands** | Confirmed-violation count null; warning/suspension counters derive from status; API penalty history empty/unavailable; API commands hidden, Mock commands mutate local state. | Penalty audit/command operations **UNKNOWN**; Admin Rulebook is authority. | Approved missing count/history strings; keep Record violation/Remove penalty visible but disabled with **“Member penalty commands are not available.”**; no local changes/fake success. Verify audit count/history, selected penalty, exemptions, reversals, command preconditions. |
| **Admin Notes** | API notes absent; Add note hidden; API save throws; Mock stores local notes. | Admin note read/write **UNKNOWN**. | Approved retain section, **“Admin Notes are not available.”**, visible disabled Add note with **“Adding Admin Notes is not available.”**, validated-empty **“No Admin Notes”**, distinct failed save. |
| **Top-ups** | Lazy `GET /api/v1/admin/top-ups?userId&limit=25&cursor`; loading/error/retry/empty/table/row detail drawer/Load more. No export. | Valid Member-scoped Top-up read **UNKNOWN**; fixture only. | No separate UX approval; release verifies Member scope, empty, pagination, failure, invalid response, and safe identifiers/provider references. |

### Current versus approved boundary

The approved Member strings/states above are already decisions, not new questions. Current mismatches—Role/Student, zero history, fabricated Mock sections, zero beside unavailable Reports submitted, hidden API commands/notes, Wallet fallback/zero coercion, and loaded-page count/sum presentation—are implementation work and release verification targets. They do not authorize feature removal or backend-policy changes.

### Safe scenarios and release gates

Use safe read-only records for full/null/missing/empty/invalid/failure/partial states, plus drawer/full-page parity, tabs/back-forward, Top-up and Ledger cursor edges, Review zero/positive, Reports kind/Member scope, four Wallet compartments/integer-satang sum, masked Payout data, Thai/English/theme/mobile, Session isolation, and late-response rejection. Accepted-contract runtime absence is a release check; an unresolved operation relationship/coverage is a contract decision blocker.

---

## `/activity` — Activity Log

### Source and behavior

- `src/app/(admin)/activity/page.tsx:8-20` server-loads `loadActivityLogPageData` and passes initial data/error.
- `activity-log-service.ts:24-42` constructs `GET /api/v1/admin/activity-log?limit=50&sort=<newest|oldest>` plus optional action/resource/resource-id/Admin/cursor fields.
- `ActivityLogBoard` displays a **loaded entries** count, local search over IDs/admin/action/resource/reason/timestamps, local column sort, local page size/pagination, cursor Load more, CSV export, and a row detail drawer with linked-target navigation.
- `activityLogCsv` exports all loaded rows matching local search, not merely visible-page rows and not necessarily complete backend history; formula-leading cells are neutralized and cells quoted. API does not provide fixture-only previous/new state/note fields.
- `activity-log-board-store.ts` and model/service support action/resource/resource-id/Admin/date filters and server sort, but the board passes `DEFAULT_ACTIVITY_LOG_FILTERS` and does not render/apply filter controls. Current visible filter is only local search.
- Empty, loading, API error/retry, delayed-page, and pagination-error states are separate. Mock shows a fixture notice. Detail links map supported resource types; Wallet links to `/wallet`.

### API evidence and approved behavior

Valid Activity Log success/pagination is **UNKNOWN**: no valid Activity request is in immutable facts; the live spec is credential-gated; fixture/unit request tests are not runtime proof. The facts’ general pagination warning means Quest/Payout behavior cannot be generalized here. The Search 429 error envelope is the only directly documented SPEC-ONLY Search fact relevant to these targets.

Shared decisions [`Decide shared UI, styling and localisation boundaries`](https://github.com/KUQuest/KUQuest-Admin/issues/134#issuecomment-5977495548) and [`Decide verification gates and incremental cutover sequencing`](https://github.com/KUQuest/KUQuest-Admin/issues/135#issuecomment-5977541586) require section-level loading/error/empty distinctions, explicit retry, deterministic test-only HTTP fixtures, and API-backed release checks. They do not approve a new Activity filter/export UX.

**Precise Activity question:** Are action/resource/resource-id/Admin/date filters part of the retained workflow (already represented in service/store/tests), or is local search over loaded pages the retained scope? If export is retained, is “loaded matching rows” sufficient, or must a verified full traversal/total be established before export can imply completeness?

Safe scenarios: first/final/non-empty page, empty search, each retained server filter, newest/oldest, partial page, export quoting/formula values, drawer/focus restoration, missing state fields, delayed/failing next page, invalid response, Session states, Thai/English/theme/mobile. Accepted-contract live proof is a release check; unresolved pagination/export semantics are a contract blocker.

Retire runtime generated 200-entry fixtures and Mock query/notice. Keep isolated HTTP fixture and behavior tests only when they validate production response handling, not Mock runtime.

---

## Global Search

### Source, reads, behavior, ownership, and consumers

- `AdminShell` mounts `AdminGlobalSearch`; header/sidebar and Ctrl/Cmd-K open it.
- `overview-search-query.ts` trims/debounces 250ms, calls `GET /api/v1/admin/search?q=<q>&kind=<all|kind>` only while open/non-empty, and uses 5s stale/60s GC. API mode has no command or export.
- Eight result kinds are retained: Member, Quest, Payout, Dispute Case, Report Case, Conduct Report, Wallet, Activity Log. `overview-search-model.ts` maps visible IDs/statuses and canonical route hrefs; results are grouped category-first/newest-first. Mock matching caps at 12; API result cap/ordering is not known.
- `admin-global-search.tsx` stores only saved query/kind preferences (up to 12) in `localStorage`, mirrors query/kind in URL params, and keeps loading/error/empty/blank-query states distinct. This preference persistence is approved and must remain; records/results are never persisted.
- Current Mock/API divergence: Mock excludes hidden Quests and inserts a synthetic Activity result; API mapping trusts Search response. Wallet results route to the global Wallet board, not a Member-specific Wallet detail.

### API evidence and approved behavior

Successful Search operation/result coverage is **UNKNOWN**. The immutable facts explicitly record only the documented OpenAPI 429 error envelope as **SPEC-ONLY**; no successful Search probe, result index coverage, cap, ranking, hidden-record semantics, or Retry-After runtime proof exists. Source declarations/fixtures remain UNKNOWN.

Saved filters/theme/language preservation is approved by [`Decide legacy route and local-data cutover policy`](https://github.com/KUQuest/KUQuest-Admin/issues/132#issuecomment-5976953420); no new UX is approved by this inventory.

Precise questions:

1. What does `kind=all` index, what fields are searchable per kind, and how are hidden/retired records handled? Current Mock/API behavior diverges for hidden Quests and Activity.
2. Who owns canonical Search ordering/cap—the API or frontend—and what result cap/ordering is contractually guaranteed?
3. Does an Activity Search result represent a real searchable audit resource or only an `/activity` route shortcut?

Safe scenarios: empty/debounce/stale-result rejection, each kind/all, hidden Quest, missing Display/Student ID, no match, invalid/401/403/5xx/429, saved-filter reload/remove, URL restoration, Session switch, Thai/English/theme/mobile, canonical links. Runtime proof is a release check once a contract is accepted; missing scope/ranking/visibility semantics are decision blockers.

Retire Mock local record loading and synthetic result generation; retain only saved preference storage and API-shaped deterministic tests.

---

## Target-specific cutover/retirement inventory

The approved [`Decide legacy route and local-data cutover policy`](https://github.com/KUQuest/KUQuest-Admin/issues/132#issuecomment-5976953420) requires old paths/query routing to 404, demo keys to become unused without cleanup/import, and only theme/language/saved Search filters to persist. For these workflows, address:

- `src/features/admin/overview/overview-adapter.ts`, `overview-finance-mock-data.ts`, `src/features/admin/member/member-adapter.ts`, Mock branches in `member-query.ts`, `activity-log-model.ts` generated fixtures/Mock branch, `activity-log-query.ts`, and `overview-search-query.ts` Mock branch.
- `dashboard-bootstrap.ts`, `dashboard-seed-data.ts`, `dashboard-seed-migration.ts`, `data/admin-demo-data-adapter.ts`, `data/mock-demo-fixtures.ts`, `data/mock-pagination.ts`, local Activity storage, payout Mock overrides, Mock penalty/note writes, and Mock session/data-source branches.
- `src/lib/auth/admin-routing.ts`, legacy matcher aliases in `src/proxy.ts`, and `/member/[id]/wallet-statement/page.tsx` compatibility redirect. Update repository-controlled links/tests/docs rather than preserving aliases.
- Retire only tests that pin demo/compat runtime (`overview-adapter.test.ts`, Mock portions of `member-route.spec.ts`, `admin-shell.spec.ts`, generated Activity fixture scenarios, seed/migration tests). Keep/rewrite isolated HTTP fixtures (`admin-security-api-fixture.ts`, service request handlers) and pure API-shaped model/CSV tests when they exercise consumer-visible production behavior.
- Update `docs/admin-app-router-parity-gate.md` and migration/test documentation so Mock runtime, seed migration, and old aliases are historical evidence rather than retained workflow requirements.

No source files were edited and no checks were run.

## Cross-cutting cutover register

This register identifies affected artifacts, not an instruction to delete all files with these names. Keep useful behavior tests and contract-aligned fixtures; remove production substitutes and obsolete expectations under the canonical decisions.

| Area | Actual artifacts and callers | Cutover obligation and limit |
| --- | --- | --- |
| Runtime source selection and mock identity | `src/lib/auth/admin-auth-mode.ts`, `admin-session.ts`, `admin-session-policy.ts`; `src/features/admin/api/admin-provider.ts`; login/shell; feature page loaders/query hooks; `src/features/admin/admin-auth.ts` | Remove API/mock/invalid mode branching and mock identity/cookie/local Session authority. Preserve real unavailable Session states. Leave old demo business keys unused; do not clear all browser storage. |
| Local business data and seeds | `src/features/admin/data/admin-demo-data-adapter.ts`, `admin-records.ts`, `mock-demo-fixtures.ts`, `mock-pagination.ts`; `src/features/admin/dashboard/dashboard-bootstrap.ts`, `dashboard-seed-data.ts`, `dashboard-seed-migration.ts`, `dashboard-model.ts`; feature mock-data/mock-state and local mutation adapters | Remove production reads/writes/seeding/migration and old schema repair paths. Retain only independently contract-aligned HTTP test fixtures. Theme/language/saved filters remain. |
| Compatibility statuses and manufactured records | `src/features/admin/domain/rulebook.ts`; feature model/adapter defaults and aliases; broad API type barrel | Canonical contract schemas own checked statuses. Do not map unknown states to Normal/Open/Pending or fabricate financial/context values. Keep useful display labels and UI availability rules where accepted contracts require them; Backend remains authoritative. |
| Legacy routing and internal links | `src/lib/auth/admin-routing.ts`, `src/proxy.ts`, `src/features/admin/admin-routes.ts`; old root/plural query links; Member Wallet Statement normalization | Remove legacy route interpretation under the approved route decision. Keep root entry and current canonical links. Retire the redirect-only Wallet Statement alias while preserving the canonical Member tab under the existing approval. |
| Shared boundaries | Central `admin-api*` modules, `admin-provider.ts`, `src/lib/auth` feature imports, `data/admin-query-events.ts`, moderation workspace/model imports, shared UI shell translation imports | Move responsibilities to approved owners and expose only real cross-feature public reads/commands/invalidation. No blanket identical layers, no global domain-policy utility, no forwarding-only services. |
| Query caches and local invalidation | Overview transport cache/in-flight; feature query hooks; board stores; dashboard/local snapshots; local business/storage events | Feature TanStack Query is the sole API-record/page cache. Retain only UI preferences/transient identity/draft state. Use Session scope and correct query parameters; do not reconstruct full counts from loaded pages. |
| Styles and language | `src/app/styles.css`, `theme.css`, `tailwind.css`, `admin-extensions.css`, `user-page.css`, `login.css`; shared controls; global language catalog and heuristic translator | Remove obsolete selector/translation compatibility after migrating actual consumers. Retain valid data attributes, themes, keyboard/focus, responsive and reduced-motion behavior. Keep feature-owned keyed content and shared formatting mechanisms. |
| Unit suites | `tests/unit/admin-auth-mode.test.ts`, `auth.test.ts`, `admin-session.test.ts`, `admin-proxy.test.ts`, `admin-routes.test.ts`, `admin-api.test.ts`, `admin-language.test.ts`, `dashboard-seed-migration.test.ts`, `dashboard-model.test.ts`, `mock-demo-fixtures.test.ts`, `quest-mock-state.test.ts`; feature model/service/adapter/board-store tests | Delete retired mode/seed/alias and source-text/incidental behavior expectations. Preserve useful behavior, ordering, boundaries, validation, safe money/state transitions and race isolation. Do not re-pin false fallback semantics. |
| Browser suites and fixtures | `tests/e2e/admin-shell.spec.ts`, `admin-canonical-click-flows.spec.ts`, `canonical-parity.spec.ts`, `canonical-language-detail.spec.ts`, `canonical-input-responsive.spec.ts`, feature route suites; `admin-security-api-fixture.ts`, `wallet-api-fixture.ts`, `tests/e2e/support`; live Quest/Activity/Payout/Wallet suites | Migrate mock-session/localStorage setup to test-only auth/resource HTTP fixtures through production validation and UI. Do not restore mock runtime to satisfy tests. Preserve safe live suites and truthful coverage distinctions. Historical test counts are not current passing evidence. |
| Playwright configuration and scripts | `playwright.config.ts`, `playwright.admin-shell.config.ts`, `playwright.quest.config.ts`, `playwright.payout.config.ts`, `playwright.wallet.config.ts` select mock mode; other `playwright.*` select API mode; `scripts/run-e2e.mjs`, `run-live-e2e.mjs`, `run-playwright-configs.mjs`, `run-with-env.mjs` | Remove obsolete mode variables from all configs. Reuse HTTP fixture servers and environment runner when still needed. Keep finite isolated config/server ports, safe record gating and no leaked credentials. `test:e2e:mock` naming must not imply production mock mode. Do not remove runner utilities only because they previously launched a mock-configured app. |
| Configuration and CI | `.env.example`, `next.config.ts`, `.github/workflows/ci.yml`, package scripts, `tsconfig.json` and installed Next.js guides | Remove data-source switch. Reconcile wildcard rewrites with the approved Admin-only forwarding boundary, rather than leave two competing HTTP paths. CI currently uses shell/mock-configured suites and calls the mixed E2E runner; update gates during implementation. No CI/build/test result was collected here. Read installed Next.js 16.2.10 guides before changing Next.js code. |
| Dependencies and lockfiles | `package.json`, `bun.lock`, `package-lock.json`: Next/React/TanStack Query/Zod/Zustand/Radix/Tailwind/CVA/clsx/tailwind-merge/lucide and verification dependencies | No package is established as demo-only by this inventory. Do not delete legitimate UI/query/schema dependencies speculatively. After callers retire, remove any then-proven unused dependency and synchronize lockfiles with the existing toolchain. This is not approval for a framework upgrade. |
| Documentation | `README.md`, `docs/admin-app-router-parity-gate.md`, `docs/agents/admin-ui-migration.md`, `All_mis_api.md`, `missing_api.md`, `api_fix_*.md`, accepted Rulebooks/ADRs and published API evidence | Update operational route/runtime instructions at cutover. README currently names `app/page.tsx`, not actual `src/app/page.tsx`. Identify historical parity/fix proposals as history, not accepted contracts/live release proof. Do not delete immutable evidence or change accepted policy to fit frontend code. This inventory and new decisions become specification inputs. |

## Verification and blocker classification

The canonical requirements remain in [Decide verification gates and incremental cutover sequencing](https://github.com/KUQuest/KUQuest-Admin/issues/135#issuecomment-5977541586). These are future checks; this prerequisite does not run them.

- **Implementation blocker:** no accepted operation/payload/coverage contract, unresolved presentation consequence, or missing decision needed to write a retained workflow without inventing data or changing its behavior. Create a precise decision/external prerequisite.
- **Release check:** an explicit accepted contract exists, but safe actual API-to-screen behavior has not been verified. Keep the operation in scope. UNKNOWN is not permission to disable it. Safe records/authorized access are prerequisites to live checks, not inferred credentials.
- **Confirmed capability gap:** requires specific evidence and per-workflow unavailable-state approval. No new capability gap is confirmed in this inventory.
- **Already-decided mismatch:** migrate under its existing canonical resolution; do not create duplicate decisions for validation, Session/cache ownership, truthful missing-data states, typed localisation, or generic recovery.

Before release, exercise each retained workflow's read path and every retained command using authorized safe test records. Do not run provider reconcile/retry, money movement, moderation or Wallet/Quest changes against arbitrary real records. Use isolated HTTP fixtures for invalid payloads, failures, conflicts, uncertain command outcomes, pagination and late-response races. Fixtures do not promote backend statuses to CONFIRMED. Record operation/version/environment and redacted result evidence at each live milestone.



## Fog reconciliation and next decisions

### Per-screen approved UX deltas

Every retained route/workflow is recorded above with its current behavior, inherited approval and named verification requirements. Existing approval detail stays in its canonical resolution. In particular, Member Occupation, retained Member missing-data sections, Member Payout/Wallet states, Session/error/cache/draft behavior, theme/language and old-link retirement are not reopened.

The review exposed precise current-behavior questions about login inputs, board coverage/count wording, Overview optional sections, Search visibility/order, Activity CSV coverage, Finance operational controls, Money Policy fields, Top-up detail, global Wallet Ledger display, Payout detail/history/inputs, Quest actions, Dispute opening/amount inputs, and Report/Conduct context/reasons. They are child decision tickets below, not approved deltas. Do not carry current controls into production by assuming their contracts, or remove them merely because current runtime proof is missing.

### Feature-specific API/model inconsistencies

The source still uses unchecked API types, legacy status/field aliases, partial-page totals, discarded count metadata, context-enrichment fallbacks, independent-read failure masking and duplicate/local caches. The already-approved architecture/error/state decisions govern validation/ownership/recovery changes. Exact missing input/source/coverage contracts and their presentation consequences are now sharp child questions. Missing evidence is not a confirmed capability gap.

Member Reviews, Quest history, Work Experience, Certificates, Reports received/submitted, moderation/notes, Member Payout scope and Wallet source/Statement/latest-date coverage keep their existing evidence/release requirements under the Member resolutions. No new note/penalty command or endpoint is invented by this inventory. Report query scope is also a cross-feature input to the Report Case contract ticket; approved Member unavailable text remains unchanged.

### Named component/model/query seams and scenarios

The workflow rows identify actual owners and public/shared consumers: Session versus login; HTTP versus feature response schemas; shell/Overview counts; Search versus Overview target labels; feature board/detail/evidence/command hooks; Wallet/Ledger versus Member composition; Finance/Top-up drawer versus Member tab; Payout history versus its query; Quest-to-Dispute opening; separate Report/Conduct/Dispute composition versus shared dialog/context presentation. Each has scenario requirements and cutover callers. Exact file splits/stale-time durations belong to the implementation plan under accepted policy, not new architecture approvals.

This fog patch is now covered by the inventory. It does not require a file-by-file build plan. No unphrased question remains from the three original patches at this source snapshot; future ticket answers may expose new fog. The map remains open until all child decisions and necessary external prerequisites are resolved. The inventory does not itself deliver the refactor specification or authorize implementation.

### Scope findings

- Keep the canonical Member Wallet Statement tab at `/member/[id]?tab=wallet-statement`. `/member/[id]/wallet-statement` is a redirect-only compatibility alias, not a second retained screen; it retires under the existing old-link decision. This is a clarification of already-approved scope, not a new decision.
- Current unused Activity filter state does not authorize new UI controls. Conduct policy permitting context access does not by itself authorize a new general Chat viewer. Their decision tickets must preserve the refactor/new-feature boundary.
- No backend API/schema/domain-policy change is part of this map. Where an accepted exact input contract is missing, identify the external owner/prerequisite; do not redesign the backend or silently fix policy in the frontend.
- No dependency is proven obsolete merely from its package name. Retire dependencies only when actual consumers become obsolete at cutover.


### Child decision index

These questions remain open. This list is an inventory handoff, not approval and not the map body. Native sub-issue/dependency relationships are the frontier authority.

- [Decide Admin login validation and truthful credential text](https://github.com/KUQuest/KUQuest-Admin/issues/140)
- [Decide retained board query coverage and count presentation](https://github.com/KUQuest/KUQuest-Admin/issues/141)
- [Decide Overview section contracts and missing-data presentation](https://github.com/KUQuest/KUQuest-Admin/issues/142)
- [Decide Global Search coverage, visibility and result ordering](https://github.com/KUQuest/KUQuest-Admin/issues/143)
- [Decide Activity Log search and CSV export coverage](https://github.com/KUQuest/KUQuest-Admin/issues/144)
- [Decide finance operational command contracts and outcome verification](https://github.com/KUQuest/KUQuest-Admin/issues/145)
- [Decide Money Policy field authority and read presentation](https://github.com/KUQuest/KUQuest-Admin/issues/146)
- [Decide Top-up detail amount and status-history presentation](https://github.com/KUQuest/KUQuest-Admin/issues/147)
- [Decide Wallet drawer Ledger coverage and resulting-balance display](https://github.com/KUQuest/KUQuest-Admin/issues/148)
- [Decide Payout detail history sources and approval inputs](https://github.com/KUQuest/KUQuest-Admin/issues/149)
- [Decide Quest Admin action contracts and reason inputs](https://github.com/KUQuest/KUQuest-Admin/issues/150)
- [Decide Dispute Case opening eligibility and duplicate handling](https://github.com/KUQuest/KUQuest-Admin/issues/151)
- [Decide Dispute Case settlement amount inputs and evidence states](https://github.com/KUQuest/KUQuest-Admin/issues/152)
- [Decide Report Case evidence, reporter and reason contracts](https://github.com/KUQuest/KUQuest-Admin/issues/153)
- [Decide Conduct Report context access and decision contracts](https://github.com/KUQuest/KUQuest-Admin/issues/154)
