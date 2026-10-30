<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

give me a little bit of context, talk in ASD-STE100 Simplified Technical English, and use the ubiquitous language from `CONTEXT.md`.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `KUQuest/KUQuest-Admin`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five canonical labels without remapping: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repository: read root `CONTEXT.md` and relevant ADRs under `docs/adr/`. See `docs/agents/domain.md`.

**Admin Rulebook** — for Payout Approval, Dispute Case, Quest Hide, Wallet Freeze or Suspend, Report Case moderation, Conduct Report, Red Flag, or Member Ban, read `docs/rulebook/admin/admin-rulebook.md` before planning or coding.

**Finance Rulebook** — for `Top-up`, `Wallet`, `Funding Reservation`, `Ledger Transaction`, `Earnings Conversion`, `Payout`, or `Payout Destination`, read `docs/rulebook/finance/finance-rulebook.md` before planning or coding.

**Quest Rulebook** — for Quest State, Start Work, Proof Submission, cancellation, failure, or Work Chat membership, read `docs/rulebook/quest/quest-work-chat-rulebook.md` §Resolved Quest lifecycle before planning or coding.

**Rulebook routing** — for an authoritative decision table mapping tasks, actors, and states to Rulebooks, sub-contracts, and reconciliation guides, read `docs/agents/routing.md` before planning or coding.

### Workflow

- Idea → sharpened plan: `grilling`/`grill-me` (interview only), `grill-with-docs` (interview + ADR/glossary), `batch-grill-me` (many open questions at once).
- Plan → issue tracker: `to-spec` (synthesis, no interview, one spec issue), `to-tickets` (breaks plan into blocking tracer-bullet tickets).
- Work bigger than one session: `wayfinder` — shared map issue + child ticket issues with blocking edges, resolved one at a time.
- Bug reports / QA: `qa` — conversational bug intake, files GitHub issues.
- Issue lifecycle: `triage` — categorises issues/PRs into the five labels above.
- Domain/architecture: `domain-modeling` (terminology, ADRs), `improve-codebase-architecture` (refactor scan).

Typical chain: `grilling`/`grill-with-docs` → `to-spec`/`to-tickets` → `triage` as issues come in → `wayfinder` if scope exceeds one session.

### Coding guidelines

Behavioral guidelines to reduce common LLM coding mistakes ([source](https://github.com/multica-ai/andrej-karpathy-skills)). Bias toward caution over speed; use judgment on trivial tasks.

**1. Think before coding** — don't assume, don't hide confusion, surface tradeoffs.
- State assumptions explicitly; if uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so; push back when warranted.
- If something is unclear, stop, name what's confusing, ask.

**2. Simplicity first** — minimum code that solves the problem, nothing speculative.
- No features beyond what was asked. No abstractions for single-use code. No unrequested "flexibility". No error handling for impossible scenarios.
- 200 lines that could be 50 → rewrite it.
- Ask: "Would a senior engineer call this overcomplicated?" If yes, simplify.

**3. Surgical changes** — touch only what you must, clean up only your own mess.
- Don't "improve" adjacent code, comments, or formatting. Don't refactor what isn't broken. Match existing style even if you'd do it differently.
- Unrelated dead code: mention it, don't delete it.
- Remove imports/variables/functions YOUR changes made unused; don't remove pre-existing dead code unless asked.
- Test: every changed line traces directly to the user's request.

**4. Goal-driven execution** — define success criteria, loop until verified.
- "Add validation" → write tests for invalid inputs, then make them pass.
- "Fix the bug" → write a test that reproduces it, then make it pass.
- "Refactor X" → ensure tests pass before and after.
- Multi-step tasks: state a brief plan, one line per step with its verify check.
