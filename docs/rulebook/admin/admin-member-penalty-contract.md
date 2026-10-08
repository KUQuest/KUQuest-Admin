# Admin Member Penalty Contract

Part of the [Admin Rulebook](admin-rulebook.md). Defines accepted policy for the Misconduct penalty ladder, Low-Average-Review ladder, Red Flags, Member Bans, and the `memberPenaltyRecord` audit trail.

### Approved policy amendment — 2026-09-23

Approved by Domain Owner T: when an Admin uses **Record violation** in a Member profile, the Admin must select the penalty to apply. This choice applies only to that direct Member action. Report Case and Conduct Report decisions continue to use the automatic Misconduct ladder below. The direct action's confirmed-violation counts and `PC-12`/`PC-13` exemptions do not change. When an exemption applies, the violation receives no penalty and the Admin cannot select one. Automatic case-decision exemptions are defined by the 2026-10-08 amendment below.

### Approved policy amendment — 2026-10-08

Approved by the Domain Owner on 2026-10-08:

- **Report Case exemption**: Each Member's first confirmed `REPORT_CASE_HIDDEN` decision is exempt once and does not advance the Misconduct ladder, even if that Member had an upheld Conduct Report first. A dismissed Report Case does not use the exemption. If the first exempt Report Case is later restored, the exemption stays used.
- **Conduct Report exemption**: `CONDUCT_REPORT_UPHELD` has no exemption. Every upheld Conduct Report advances the Misconduct ladder. Neither Report Case nor Conduct Report decisions use the first-10 or post-ban first-3 exemptions.
- **Direct Add Penalty**: The existing **Record violation** action remains the direct Admin action for adding a penalty. The Admin selects a permitted penalty and a reason code. The decision note is optional. Its existing `PC-12`/`PC-13` behavior remains unchanged.
- **Remove Penalty**: An Admin may remove any effective penalty record from a Member's Penalty History, regardless of source. The Admin selects a reason code; the decision note is optional. Removal adds a linked reversal record and never deletes or edits the original record. It reverses the penalty effect but does not change the source Report Case, Conduct Report, or Review decision. The Member's restrictions and penalty-created Wallet state are recalculated from the remaining effective penalty records. A separate discretionary Wallet Freeze or Wallet Suspend remains in place.

## Two independent ladders

Member penalties operate through two independent ladders. A Member's strike count on one never affects the other.

---

## 1. Misconduct ladder

Triggered when an Admin confirms a violation:
- a `REPORT_CASE_HIDDEN` Moderation Decision on a sent Message; or
- a `CONDUCT_REPORT_UPHELD` decision on a Quest Conduct Report.

These case decisions use the automatic penalty tiers below. A direct Member **Record violation** action uses the Admin-selected tier recorded in its audit entry, unless an exemption applies. A reversal of that direct action restores the Member and Wallet state that existed before the selected penalty.

### Penalty tiers

| Applied Misconduct strike count | Result | Duration |
| --- | --- | --- |
| 1st strike | Red Flag | 7 days (`PC-09`) |
| 2nd strike | Temporary ban + Wallet Auto-Freeze | 7 days (`PC-11`) |
| 3rd strike | Permanent ban | Permanent |

### Rules and exemptions

- **Red Flag**: Visible on Member Profile, mini-profile during Candidate selection, and Hirer identity on Quest pages. Blocks applying as Candidate, joining FCFS Quests, and **publishing new Quests**. Runs existing Quests unchanged. Expires automatically after 7 days without Admin intervention.
- **Temporary ban (2nd strike)**: Denies sign-in for 7 days. Auto-freezes Wallet in the same action; auto-restores Wallet to `ACTIVE` upon expiry.
- **Permanent ban (3rd strike)**: Denies sign-in permanently and auto-freezes Wallet. Read directly from `memberPenaltyRecord`.
- **Automatic case-decision exemptions**: Only the first confirmed `REPORT_CASE_HIDDEN` decision for a Member is exempt. A `CONDUCT_REPORT_UPHELD` decision is never exempt. No post-ban exemption applies to either case-decision source. The first Report Case exemption remains used if that Report Case is later restored.
- **Direct Record violation exemptions**: `PC-12` and `PC-13` continue to apply only to the direct Member **Record violation** action as previously approved. `PC-12` exempts the first 10 confirmed violations after account creation; `PC-13` exempts the first 3 confirmed violations after a temporary or permanent ban lifts. Their existing confirmed-violation counts do not change. If an exemption applies, no penalty is added and the Admin cannot select one.
- **Remove Penalty eligibility**: An effective penalty record is a non-exempt original penalty record that has not already been reversed. A timed penalty may remain effective in the ladder after its restriction expires.
- **Reversals**: `REPORT_CASE_RESTORED` reverses the penalty created by its earlier `REPORT_CASE_HIDDEN` decision. An Admin may also remove any effective penalty record through the separate **Remove Penalty** action above. Each reversal is linked to the original `memberPenaltyRecord`; it does not delete the original or change its source decision. A Conduct Report remains upheld even when its penalty is removed. Reversals clear only the effects of the selected penalty and preserve restrictions caused by other effective penalty records.
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
- `memberPenaltyRecord` (immutable audit table): Source of truth for penalties, recording Member, ladder (`MISCONDUCT` | `REVIEW`), source (`REPORT_CASE`, `CONDUCT_REPORT`, `REVIEW_AVERAGE`, or direct Admin adjustment), sequence number, result, Admin or system actor, reason code, optional Admin decision note for direct Admin actions, timestamp, and nullable reversal link.
