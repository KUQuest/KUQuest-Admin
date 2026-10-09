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

### Approved policy amendment — 2026-10-08 (Admin commands)

Approved by the Domain Owner on 2026-10-08:

- **Direct Add Penalty choices**: The Admin selects the exact permitted Misconduct result: Red Flag, 7-day Member Ban, or permanent Member Ban. The 1-month Review result is not a choice. Existing direct-action exemptions still apply. A direct Admin-selected penalty does not count toward later automatic Misconduct ladder results.
- **Required reasons**: Add and Remove each require a reason code from their own approved set below. The Admin may also enter an optional decision note of up to 200 characters.
- **Add reason codes**: `MEMBER_PENALTY_VIOLATION_CONFIRMED`, `MEMBER_PENALTY_REPEATED_VIOLATION_CONFIRMED`, `MEMBER_PENALTY_SAFETY_RISK_CONFIRMED`, and `MEMBER_PENALTY_OTHER_VIOLATION_CONFIRMED`.
- **Remove reason codes**: `MEMBER_PENALTY_ADMIN_ERROR`, `MEMBER_PENALTY_NEW_EVIDENCE`, `MEMBER_PENALTY_POLICY_REVIEW`, and `MEMBER_PENALTY_OTHER_CORRECTION`.
- **Effective penalty**: An original, non-exempt penalty record that has not been reversed is effective, even when its timed restriction has expired. An Admin may remove an effective penalty from any source, including Conduct Report and Review.
- **Recalculated automatic results**: If removing a penalty changes a later automatic ladder result, append a linked reversal for the old result and a linked replacement record for the recalculated result. Keep every record immutable. Direct Admin-selected penalties remain the exact results selected by the Admin.
- **Version check**: Penalty History returns a version token. Add and Remove commands must send this token. The API rejects a command when the token is stale.
- **Stable history identity**: Every Penalty History item includes its stable `recordId` UUID. Remove must send the selected item's `recordId`; `sourceDisplayId` identifies the source event and must not be used as the penalty record ID.
- **Decision note**: The Admin may provide a note of up to 200 characters for Add or Remove. The note is part of immutable Penalty History.
- **Audit record**: Penalty History is the audit record for these actions. Do not write a separate `AdminAction` record.

### Approved policy amendment — 2026-10-09

The Domain Owner requires every new direct Admin **Record violation** action to apply the penalty selected by the Admin. `PC-12` and `PC-13` do not exempt this action. This supersedes the earlier direct-action exemption wording. The Report Case and Conduct Report rules remain separate and unchanged. Existing Penalty History records stay unchanged.

## Two independent ladders

Member penalties operate through two independent ladders. A Member's strike count on one never affects the other.

---

## 1. Misconduct ladder

Triggered when an Admin confirms a violation:
- a `REPORT_CASE_HIDDEN` Moderation Decision on a sent Message; or
- a `CONDUCT_REPORT_UPHELD` decision on a Quest Conduct Report.

These case decisions use the automatic penalty tiers below. A direct Member **Record violation** action always applies the Admin-selected tier recorded in its audit entry. A reversal of that direct action restores the Member and Wallet state that existed before the selected penalty.

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
- **Direct Record violation**: No exemption applies. Each new command requires the Admin to select a permitted result, and the API applies that result. This rule does not change the automatic Report Case exemption or the Conduct Report rule above. Existing `PENALTY_EXEMPT` records stay unchanged.
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
