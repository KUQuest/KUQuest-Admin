# Hold Quest-failure settlement for the Dispute Case window

When a Quest becomes `QUEST_FAILED`, the amount the Reward and money
contract returns to the Hirer is held for 7 days — not released as ordinary
Spending Balance immediately — so that money is still available if a
Dispute Case later redirects some of it back to a Worker (see
`docs/rulebook/admin/admin-rulebook.md` §2). Without a hold, a Hirer could spend or
withdraw the returned amount before a same-Quest Dispute Case is decided,
leaving no funds for the reversing Ledger Transaction to draw from.

The hold is not a new Wallet balance. It is the Quest's own Funding
Reservation kept `ACTIVE` for 7 more days, with the returned amount left as
its `remainingSatang`. This keeps ADR 0009 true — the Quest module owns the
timing while the Wallet keeps a generic Funding Reservation — and it adds no
column to the Wallet, whose four balances (`SPENDING`, `EARNINGS`,
`FUNDING_RESERVED`, `RESERVED_FOR_PAYOUTS`) stay as they are. The release at
day 7 is an ordinary `FUNDING_RELEASE`.

The whole returned amount is held, including the Platform Fee that a failed
Quest returns to the Hirer. Splitting the reservation to release the fee
early adds machinery for no product gain.

Two payments draw on this reservation, not only a Dispute Case. A Hirer may
approve a still-`PROOF_PENDING` Proof Submission after the Quest failed
(`docs/rulebook/quest/quest-work-chat-rulebook.md` §Failure and partial success), and
that Worker's Reward settles from this same reservation. Because a pending
Proof Submission becomes `PROOF_APPROVED` automatically 24 hours after it is
sent, that payment always falls inside the 7-day hold.

The hold releases automatically and unconditionally at 7 days, whether or
not a Dispute Case for that Quest is still `DISPUTE_CASE_PENDING`. A
Dispute Case resolved after the hold releases and before its decision
deadline can still redirect funds if the Hirer's Spending Balance has
enough at that time; if not, the transfer fails. This is a deliberate
simplicity trade-off: extending the hold for every still-open case avoids
that failure mode, but adds a hold duration tied to the case decision
window.

### Policy amendment — 2026-10-30

- A pending Dispute Case is automatically dismissed 7 days after the case
  opens. The deadline starts at the case's `createdAt` time, not when the
  Quest becomes `QUEST_FAILED`.
- Automatic dismissal uses `DISPUTE_CASE_DISMISSED`, makes no money
  movement, and creates an Audit Record for the timeout.
- An Admin may resolve a case after the Funding Reservation hold releases,
  until the case's 7-day decision deadline. After that deadline, the Server
  must not accept an Admin decision.

To keep that trade-off honest, both windows for opening a Dispute Case close
before the hold does. Self-filing is capped at 1 day, and an Admin may open a
case on a Worker's behalf up to 5 days. Every case therefore has at least 2
days of held money before the hold releases. An Admin may decide a pending
case for up to 7 days after it opens. A case that remains pending at its
decision deadline is automatically dismissed.

The code this decision needs — keeping the reservation `ACTIVE` and
releasing it at day 7 — is listed in `docs/reconciliation/admin-reconciliation.md`
§Migration and implementation checklist.

Status: accepted.
