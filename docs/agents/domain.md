# Domain Docs

This is a single-context repository.

## Before exploring

Read these sources when they exist:

- `CONTEXT.md` at the repository root
- Relevant architectural decisions under `docs/adr/`
- Relevant domain rulebooks under `docs/rulebook/`

For Admin operations (Payout Approval, Dispute Case, Quest Hide, Wallet Freeze/Suspend, Trust & Safety moderation, Member Bans, and Conduct Reports), read `docs/rulebook/admin/admin-rulebook.md` before planning or coding.

If they do not exist, proceed silently. Domain-modeling skills create them lazily when terminology or architectural decisions are established.

## Rulebooks

A Rulebook is accepted domain policy. It defines what the system must do for one domain. `CONTEXT.md` defines the canonical language; it is not a Rulebook.

### Accepted Rulebooks

- `docs/rulebook/admin/admin-rulebook.md` — Admin Operations.
- `docs/rulebook/quest/quest-work-chat-rulebook.md` — Quest and Work Chat.
- `docs/rulebook/finance/finance-rulebook.md` — Finance and Wallets.

### Authority

1. A relevant Rulebook defines current policy for its Domain and overrides Legacy Implementation.
2. Each Rulebook owns its Domain. A shared flow must name its exact boundary; neither Rulebook is globally superior.
3. ADRs record decisions. Rulebooks define domain policy.

### Reading route

For a complete decision table mapping tasks, branches, actors, and Quest states directly to Rulebooks, sub-contracts, and ADRs, see [`docs/agents/routing.md`](routing.md).

- **Policy** — read the Rulebook that owns the Domain before planning.
- **Admin Operations** — read `docs/rulebook/admin/admin-rulebook.md`.
- **Finance & Money** — read `docs/rulebook/finance/finance-rulebook.md`.
- **Quest & Chat** — read `docs/rulebook/quest/quest-work-chat-rulebook.md`.

## Vocabulary

Use domain terms as defined in `CONTEXT.md`. Do not substitute terminology that the glossary explicitly avoids.
