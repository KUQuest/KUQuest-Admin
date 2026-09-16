# Legacy browser suites

These suites cover the pre-App-Router Admin runtime. They remain here for comparison and rollback, as required by Issue 80.

The verification record for Issue 81 is [Admin App Router parity gate](../../docs/admin-app-router-parity-gate.md).

The active Playwright configuration runs `tests/e2e`, which contains the canonical route tests. The legacy suites are not part of the active App Router test run.

## Parity with the canonical routes

`tests/e2e/canonical-parity.spec.ts` ports the legacy assertions that the canonical routes support. The other canonical route specs in `tests/e2e` cover the rest of the supported behavior (sign-in, theme, language, global search, navigation, drawers, Payout commands, Quest commands, and failed Quest links).

These legacy checks are not ported. Each one needs a product decision or a follow-up issue before it can have an active test.

### Feature gaps in the canonical routes

| Legacy test | Gap |
| --- | --- |
| admin can export a quest log after switching to Thai | Quest detail has no Export log control. |
| translates functional controls in the rendered quest page | Same gap: no Export log control. |
| admin can log out from the dashboard | The Admin shell has no Log out control. |
| temporary ban follows the fixed SRS duration | Member detail does not show the Temporary ban expiry or the "No manual penalty override" note. |
| detail global search accepts input and fits the mobile viewport | The Ctrl+K global search is available only on Overview. |
| quest status and team or solo filters can be combined | Quest board filter tabs are single-select; status and Team or Solo cannot be combined. |
| every failed quest links to its dispute case | The Quest board has no Dispute Case link column. Quest detail keeps the link (`quest-route.spec.ts`). |
| translates quest full detail and pending-change content | Quest detail does not use the Admin language translations. |
| translates dispute search placeholder and table headers | The Dispute Case board search label ("Search Dispute Cases") and first table header ("Dispute Case") have no Thai translation. |
| report creation form inputs accept input on mobile (evidence file and saved report) | The canonical report form has no evidence file field and does not save to local demo data. The input part is ported. |
| resolving a dispute in the board drawer refreshes its row | Not ported: needs a decision on mock-mode Dispute Case commands. |
| closed disputes leave their linked quest in a final status | Not ported: same reason. |
| hiding a quest updates and persists its status | Quest commands always call the Admin API; mock mode has no local command handling. `quest-route.spec.ts` covers the command request. |
| activity search accepts input and fits the mobile viewport | Activity Log renders only an "Admin API is required" notice in mock mode, so there is no search field. |

### Mock data limits

| Legacy test | Limit |
| --- | --- |
| admin can filter quests and move to the next page | The canonical Quest mock has 5 Quests, so there is no second page. Filter tabs and page-size controls are ported. |

### Legacy runtime only

These checks test the legacy runtime itself and have no canonical equivalent: removed legacy Overview after repeated navigation, primary navigation during a slow session check, banned users in `window.data` assignments, board rows after the legacy full profile, and the legacy Overview command center.
