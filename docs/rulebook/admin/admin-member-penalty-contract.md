# Admin Member Penalty Contract

Part of the [Admin Rulebook](admin-rulebook.md). Defines accepted policy for the Misconduct penalty ladder, Low-Average-Review ladder, Red Flags, Member Bans, and the `memberPenaltyRecord` audit trail.

### Approved policy amendment — 2026-09-23

Approved by Domain Owner T: when an Admin uses **Record violation** in a Member profile, the Admin must select the penalty to apply. This choice applies only to that direct Member action. Report Case and Conduct Report decisions continue to use the automatic Misconduct ladder below. Confirmed-violation counts and `PC-12`/`PC-13` exemptions do not change. When an exemption applies, the violation receives no penalty and the Admin cannot select one.

## Two independent ladders

Member penalties operate through two independent ladders. A Member's strike count on one never affects the other.

---

## 1. Misconduct ladder

Triggered when an Admin confirms a violation:
- a `REPORT_CASE_HIDDEN` Moderation Decision on a sent Message; or
- a `CONDUCT_REPORT_UPHELD` decision on a Quest Conduct Report.

These case decisions use the automatic penalty tiers below. A direct Member **Record violation** action uses the Admin-selected tier recorded in its audit entry, unless an exemption applies. A reversal of that direct action restores the Member and Wallet state that existed before the selected penalty.

### Penalty tiers

| Confirmed-violation count | Result | Duration |
| --- | --- | --- |
| 1st strike | Red Flag | 7 days (`PC-09`) |
| 2nd strike | Temporary ban + Wallet Auto-Freeze | 7 days (`PC-11`) |
| 3rd strike | Permanent ban | Permanent |

### Rules and exemptions

- **Red Flag**: Visible on Member Profile, mini-profile during Candidate selection, and Hirer identity on Quest pages. Blocks applying as Candidate, joining FCFS Quests, and **publishing new Quests**. Runs existing Quests unchanged. Expires automatically after 7 days without Admin intervention.
- **Temporary ban (2nd strike)**: Denies sign-in for 7 days. Auto-freezes Wallet in the same action; auto-restores Wallet to `ACTIVE` upon expiry.
- **Permanent ban (3rd strike)**: Denies sign-in permanently and auto-freezes Wallet. Read directly from `memberPenaltyRecord`.
- **Exemptions (`PC-12` & `PC-13`)**:
  - The first 10 (`PC-12`) confirmed violations after account creation do not advance the ladder.
  - The first 3 (`PC-13`) confirmed violations after a temporary or permanent ban lifts do not advance the ladder.
  - A Member's 1st result (Red Flag) arrives at confirmed violation 11, 2nd result (Temp ban) at violation 12, and 3rd result (Permanent ban) at violation 13.
- **Reversals**: A `REPORT_CASE_RESTORED` decision cancels the strike created by its earlier `REPORT_CASE_HIDDEN` decision. Writes a linked reversing row in `memberPenaltyRecord` without deleting the original row, immediately clearing any Red Flag or ban produced by that strike. (Conduct Report strikes cannot be reversed).
- **Assignments during bans**: A banned Member's active Assignments are not force-cancelled. The standard deadline and Start Work rules apply; unfulfilled work fails via standard rules.

---

## 2. Low-Average-Review ladder

Fully automatic system evaluation (not Admin-triggered):

| Downward crossing count | Result | Duration |
| --- | --- | --- |
| 1st strike | Temporary ban | 7 days |
| 2nd strike | Temporary ban | 1 month |
| 3rd strike | Permanent ban | Permanent |

### Rules

- Triggers only once a Member has received at least **10 Reviews**.
- From the 10th Review onward, each time a new Review causes the Member's running average rating to cross from &ge;3.0 down to below 3.0, that crossing counts as one violation.
- Further Reviews received while the average remains below 3.0 do not increment the count. A new strike occurs only on subsequent downward crossings after recovering to &ge;3.0.
- `PC-12` and `PC-13` exemptions do not apply to this ladder.
- Evaluated only upon Review creation. Review edits within the 7-day window update displayed ratings but never alter recorded strikes.

---

## 3. Data shape and persistence

- `authUser.bannedUntil` (nullable timestamp): Projected later expiry of temporary bans from both ladders for O(1) auth guard evaluation.
- `authUser.redFlagExpiresAt` (nullable timestamp): Projected Red Flag expiry.
- `memberPenaltyRecord` (immutable audit table): Source of truth for strikes, recording member, ladder (`MISCONDUCT` | `REVIEW`), source (`REPORT_CASE`, `CONDUCT_REPORT`, `REVIEW_AVERAGE`), sequence number, result, actor, reason, timestamp, and nullable reversal link.
