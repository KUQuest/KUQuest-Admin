"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { ApiError } from "../../../lib/api/client";
import { disputeRoutes, questRoutes } from "../admin-routes";
import {
  adminApi,
  type AdminQuestDetail,
  type AdminQuestFinance,
  type AdminQuestReasonCode,
} from "../api/admin-api";
import { canHideQuest, DISPUTE_CASE_STATUSES, isQuestTerminal, questStateFor } from "../domain/rulebook";
import {
  formatQuestDate,
  formatQuestMoney,
  pageQuestRows,
  QUEST_BOARD_TABS,
  questMatchesTab,
  questMemberName,
  questPageCount,
  questRowsFromApi,
  questStatusClass,
  searchQuestRows,
  sortQuestRows,
  type QuestBoardPageSize,
  type QuestBoardRow,
  type QuestBoardTab,
  type QuestSortDirection,
  type QuestSortKey,
} from "./quest-model";

type QuestPresentation = "page" | "drawer";
type QuestCommand = "hide" | "restore" | "terminate";

type QuestDetailPageProps = {
  questId: string;
  presentation?: QuestPresentation;
};

const reasonCodes: Array<{ value: AdminQuestReasonCode; label: string }> = [
  { value: "POLICY_REVIEW", label: "Policy review" },
  { value: "SAFETY_REVIEW", label: "Safety review" },
];

function newIdempotencyKey(action: QuestCommand, questId: string): string {
  const id = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `admin-${action}-quest-${questId}-${id}`;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 404) return "Quest was not found.";
  return error instanceof Error ? error.message : fallback;
}

function readableValue(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLocaleLowerCase()
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

async function findDisputeForQuest(questId: string): Promise<string | null> {
  for (const status of DISPUTE_CASE_STATUSES) {
    let cursor: string | undefined;
    do {
      const page = await adminApi.listDisputes({
        status,
        limit: 50,
        ...(cursor ? { cursor } : {}),
      });
      const linkedCase = page.items.find((item) => item.questId === questId);
      if (linkedCase) return linkedCase.id;
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
  }
  return null;
}

function Badge({ state }: { state: ReturnType<typeof questStateFor> }) {
  return <span className={`badge ${questStatusClass(state)}`}>{readableValue(state.replace("QUEST_", ""))}</span>;
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        {count !== undefined ? <span className="section-count">{count}</span> : null}
      </div>
      <div className="quest-detail-body">{children}</div>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="fact"><span>{label}</span><strong>{children}</strong></div>;
}

function ListEmpty({ children }: { children: ReactNode }) {
  return <div className="submission-empty"><strong>{children}</strong></div>;
}

function QuestDetailContent({
  detail,
  finance,
  linkedDisputeId,
  onCommand,
  showFullDetailLink,
}: {
  detail: AdminQuestDetail;
  finance: AdminQuestFinance | null;
  linkedDisputeId: string | null;
  onCommand: (command: QuestCommand) => void;
  showFullDetailLink: boolean;
}) {
  const state = questStateFor(detail.questStatus);
  const hidden = Boolean(detail.hiddenAt);
  const financeQuest = finance?.quest;
  const fundingTotal = financeQuest?.questFundingTotalSatang ?? detail.questFundingTotalSatang;
  const reward = financeQuest?.rewardSatang ?? detail.rewardSatang;
  const platformFee = financeQuest?.platformFeePerWorkerSatang ?? detail.platformFeePerWorkerSatang;
  const timeline = detail.adminActions.length
    ? detail.adminActions.map((action) => ({
        id: action.id,
        title: readableValue(action.action),
        time: formatQuestDate(action.createdAt),
        detail: action.reasonCode ? readableValue(action.reasonCode) : "No reason code",
      }))
    : [{
        id: "current-state",
        title: readableValue(state.replace("QUEST_", "")),
        time: formatQuestDate(detail.updatedAt),
        detail: "Current Quest State recorded by the Admin API.",
      }];

  return (
    <div className="quest-detail-stack">
      <Section title="Quest summary">
        <div className="facts quest-detail-facts">
          <Fact label="Status"><Badge state={state} />{hidden ? <span className="badge neutral quest-hidden-overlay">Hidden</span> : null}</Fact>
          <Fact label="Quest Funding Total">{formatQuestMoney(fundingTotal)}</Fact>
          <Fact label="Participant mode">{detail.participation === "GROUP" ? "Team" : "Solo"}</Fact>
          <Fact label="Candidate mode">{detail.mode === "FIRST_COME_FIRST_SERVED" ? "First come, first served" : "Candidate"}</Fact>
          <Fact label="Quest ID">{detail.id}</Fact>
          <Fact label="API version">{detail.apiVersion}</Fact>
        </div>
      </Section>

      <Section title="Quest description">
        <p className="record-description">{detail.description || "No Quest description recorded by the Admin API."}</p>
        <div className="requirement-box">
          <strong>Quest Condition</strong>
          <p>{detail.condition.text || "No Quest Condition text recorded by the Admin API."}</p>
          {detail.condition.items.length ? (
            <ol>
              {detail.condition.items.map((item) => <li key={`${item.position}-${item.text}`}>{item.text}</li>)}
            </ol>
          ) : null}
        </div>
      </Section>

      <Section title="Hirer">
        <div className="hirer-profile-summary">
          <strong>{questMemberName(detail.hirer)}</strong>
          <span>{detail.hirer.email}</span>
        </div>
      </Section>

      <Section title="Schedule and location">
        <div className="facts">
          <Fact label="Starts">{formatQuestDate(detail.startTime)}</Fact>
          <Fact label="Due">{formatQuestDate(detail.dueAt)}</Fact>
        </div>
        <div className="quest-detail-list-block">
          <span className="fact-label">Location</span>
          <strong className="quest-detail-list-value">
            {detail.locations.length
              ? detail.locations.map((location) => location.label || "Location label not provided by the Admin API.").join(" · ")
              : "Location not provided by the Admin API."}
          </strong>
        </div>
      </Section>

      <Section
        title="Candidates and Assignments"
        count={detail.candidates.applications.length + detail.candidates.teams.length + detail.assignments.length}
      >
        {detail.candidates.applications.length ? (
          <div className="related-list">
            {detail.candidates.applications.map((application) => (
              <div className="related-row" key={application.id}>
                <span><strong>{questMemberName(application.worker)}</strong><small>Candidate · {readableValue(application.applicationStatus)}</small></span>
                <span>{formatQuestDate(application.appliedAt)}</span>
              </div>
            ))}
          </div>
        ) : null}
        {detail.candidates.teams.length ? (
          <div className="related-list quest-detail-list-gap">
            {detail.candidates.teams.map((team) => (
              <div className="related-row" key={team.id}>
                <span><strong>{team.name}</strong><small>Candidate Team · {readableValue(team.teamStatus)} · {team.members.length} member{team.members.length === 1 ? "" : "s"}</small></span>
                <span>{formatQuestDate(team.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : null}
        {detail.assignments.length ? (
          <div className="related-list quest-detail-list-gap">
            {detail.assignments.map((assignment) => (
              <div className="related-row" key={assignment.id}>
                <span><strong>{questMemberName(assignment.worker)}</strong><small>Assignment · {readableValue(assignment.assignmentStatus)}</small></span>
                <span>{assignment.startedAt ? `Started ${formatQuestDate(assignment.startedAt)}` : "Not started"}</span>
              </div>
            ))}
          </div>
        ) : null}
        {!detail.candidates.applications.length && !detail.candidates.teams.length && !detail.assignments.length ? <ListEmpty>No Candidates, Candidate Teams, or Assignments returned by the Admin API.</ListEmpty> : null}
      </Section>

      <Section title="Proof Submissions" count={detail.proofSubmissions.length}>
        {detail.proofSubmissions.length ? (
          <div className="related-list">
            {detail.proofSubmissions.map((submission) => (
              <div className="related-row" key={submission.id}>
                <span><strong>{submission.worker ? questMemberName(submission.worker) : questMemberName(submission.submittedBy)}</strong><small>{readableValue(submission.submissionStatus)} · {formatQuestDate(submission.submittedAt)}</small><small>{submission.content || "No proof description."}</small></span>
                <span>{submission.files.length} file{submission.files.length === 1 ? "" : "s"}</span>
              </div>
            ))}
          </div>
        ) : <ListEmpty>No Proof Submissions returned by the Admin API.</ListEmpty>}
      </Section>

      <Section title="Financial record">
        <div className="financial-line"><span>Quest Funding Total</span><strong>{formatQuestMoney(fundingTotal)}</strong></div>
        <div className="financial-line"><span>Quest Reward</span><strong>{formatQuestMoney(reward)}</strong></div>
        <div className="financial-line"><span>Platform Fee per Worker</span><strong>{formatQuestMoney(platformFee)}</strong></div>
        <div className="financial-line"><span>Platform Fee policy</span><strong>{detail.platformFeeBps === null ? "Not provided by the Admin API" : `${detail.platformFeeBps / 100}%`}</strong></div>
        {finance?.reservation ? (
          <>
            <div className="financial-line"><span>Funding Reservation</span><strong>{readableValue(finance.reservation.status)}</strong></div>
            <div className="financial-line"><span>Reserved</span><strong>{formatQuestMoney(finance.reservation.totalReservedSatang)}</strong></div>
            <div className="financial-line"><span>Remaining</span><strong>{formatQuestMoney(finance.reservation.remainingSatang)}</strong></div>
          </>
        ) : <p className="audit-note">No Funding Reservation was returned by the Finance API.</p>}
        {finance?.transfers.length ? (
          <div className="quest-finance-list">
            <h3>Money movements</h3>
            {finance.transfers.map((transfer) => <div className="financial-line" key={transfer.id}><span>{readableValue(transfer.type)}<small>{formatQuestDate(transfer.occurredAt)}</small></span><strong>{formatQuestMoney(transfer.amountSatang)}</strong></div>)}
          </div>
        ) : null}
        {!finance ? <p className="audit-note">Quest finance data is not available from the Admin API.</p> : null}
      </Section>

      <Section title="Quest edit history" count={detail.editHistory.length}>
        {detail.editHistory.length ? (
          <div className="related-list">
            {detail.editHistory.map((entry) => (
              <div className="related-row" key={entry.id}>
                <span><strong>{readableValue(entry.kind)}</strong><small>{entry.fieldName ? `Field · ${entry.fieldName}` : entry.requestStatus ? `Request · ${readableValue(entry.requestStatus)}` : "Quest record edit"}</small></span>
                <span>{formatQuestDate(entry.editedAt ?? entry.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : <ListEmpty>No Quest edits returned by the Admin API.</ListEmpty>}
      </Section>

      <Section title="Dispute and risk">
        {linkedDisputeId ? (
          <>
            <p>A Dispute Case is linked to this Quest.</p>
            <Link className="btn primary full-width" href={disputeRoutes.detail(linkedDisputeId)}>Open Dispute Case</Link>
          </>
        ) : state === "QUEST_FAILED" ? (
          <p className="audit-note">This Quest is in QUEST_FAILED, but no linked Dispute Case was returned by the Admin API.</p>
        ) : <p className="audit-note">No linked Dispute Case was returned by the Admin API.</p>}
      </Section>

      <Section title="Overall Quest timeline" count={timeline.length}>
        <ol className="timeline">
          {timeline.map((entry) => <li key={entry.id}><strong>{entry.title}</strong><time>{entry.time}</time><span>{entry.detail}</span></li>)}
        </ol>
      </Section>

      <div className="quest-command-actions">
        {showFullDetailLink ? <a className="btn quest-full-detail-link" href={questRoutes.detail(detail.id)}>Full Quest detail</a> : null}
        {!hidden && canHideQuest(state) ? <button className="btn" type="button" onClick={() => onCommand("hide")}>Hide Quest</button> : null}
        {hidden ? <button className="btn" type="button" onClick={() => onCommand("restore")}>Restore Quest</button> : null}
        {!isQuestTerminal(state) ? <button className="btn danger" type="button" onClick={() => onCommand("terminate")}>Terminate Quest</button> : null}
      </div>
    </div>
  );
}

function QuestCommandDialog({
  command,
  onCancel,
  onSubmit,
  error,
  pending,
}: {
  command: QuestCommand;
  onCancel: () => void;
  onSubmit: (reason: string, reasonCode?: AdminQuestReasonCode) => void;
  error: string | null;
  pending: boolean;
}) {
  const [reason, setReason] = useState("");
  const [reasonCode, setReasonCode] = useState<AdminQuestReasonCode | "">("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason.trim().length < 8) {
      setValidationError("Enter at least 8 characters for the reason.");
      return;
    }
    if (!reasonCode) {
      setValidationError("Select a reason code.");
      return;
    }
    onSubmit(reason.trim(), reasonCode || undefined);
  }

  return (
    <div className="quest-command-layer" role="presentation">
      <button className="quest-command-backdrop" type="button" aria-label="Close command dialog" onClick={onCancel} />
      <dialog open className="quest-command-dialog" aria-labelledby="quest-command-title">
        <form onSubmit={submit}>
          <h2 id="quest-command-title">{command === "hide" ? "Hide Quest" : command === "restore" ? "Restore Quest" : "Terminate Quest"}</h2>
          <p>{command === "terminate" ? "This changes the Quest to QUEST_CANCELLED and preserves the Admin Action." : "The API Server remains the authority for this Quest action."}</p>
          <label htmlFor="quest-command-reason">Reason<textarea id="quest-command-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={4} /></label>
          <label htmlFor="quest-command-reason-code">Reason code *<select id="quest-command-reason-code" value={reasonCode} onChange={(event) => setReasonCode(event.target.value as AdminQuestReasonCode | "")}><option value="">Select a reason code</option>{reasonCodes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          {validationError || error ? <p className="field-error" role="alert">{validationError || error}</p> : null}
          <div className="dialog-actions"><button className="btn" type="button" onClick={onCancel} disabled={pending}>Cancel</button><button className={`btn ${command === "terminate" ? "danger" : "primary"}`} type="submit" disabled={pending}>{pending ? "Saving…" : "Confirm"}</button></div>
        </form>
      </dialog>
    </div>
  );
}

export function QuestDetailPage({ questId, presentation = "page" }: QuestDetailPageProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<AdminQuestDetail | null>(null);
  const [finance, setFinance] = useState<AdminQuestFinance | null>(null);
  const [linkedDisputeId, setLinkedDisputeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [command, setCommand] = useState<QuestCommand | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [commandPending, setCommandPending] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setFinance(null);
    setLinkedDisputeId(null);
    setError(null);
    setNotFound(false);

    async function load() {
      try {
        const [detailResult, financeResult] = await Promise.allSettled([
          adminApi.getQuest(questId),
          adminApi.getQuestFinance(questId),
        ]);
        if (detailResult.status === "rejected") throw detailResult.reason;
        const nextDetail = detailResult.value;
        let nextDisputeId: string | null = null;
        if (questStateFor(nextDetail.questStatus) === "QUEST_FAILED") {
          try {
            nextDisputeId = await findDisputeForQuest(nextDetail.id);
          } catch {
            nextDisputeId = null;
          }
        }
        if (cancelled) return;
        setDetail(nextDetail);
        setFinance(financeResult.status === "fulfilled" ? financeResult.value : null);
        setLinkedDisputeId(nextDisputeId);
      } catch (loadError: unknown) {
        if (!cancelled) {
          setNotFound(loadError instanceof ApiError && loadError.status === 404);
          setError(errorMessage(loadError, "Quest detail could not load from the Admin API."));
        }
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [questId, reloadKey]);

  function openCommand(nextCommand: QuestCommand) {
    setCommandError(null);
    setCommand(nextCommand);
  }

  async function submitCommand(reason: string, reasonCode?: AdminQuestReasonCode) {
    if (!detail || !command) return;
    setCommandError(null);
    setCommandPending(true);
    const options = {
      idempotencyKey: newIdempotencyKey(command, detail.id),
      expectedVersion: detail.version,
    };
    try {
      if (command === "hide") {
        if (!reasonCode) throw new Error("A reason code is required.");
        await adminApi.hideQuest(detail.id, { ...options, reason, reasonCode });
      } else if (command === "restore") {
        if (!reasonCode) throw new Error("A reason code is required.");
        await adminApi.restoreQuest(detail.id, { ...options, reason, reasonCode });
      } else {
        if (!reasonCode) throw new Error("A reason code is required.");
        await adminApi.terminateQuest(detail.id, { ...options, reason, reasonCode });
      }
      setCommand(null);
      setReloadKey((key) => key + 1);
    } catch (commandErrorValue: unknown) {
      setCommandError(errorMessage(commandErrorValue, "Quest command failed."));
    } finally {
      setCommandPending(false);
    }
  }

  const content = error
    ? <div className="empty"><h2>{notFound ? "Quest not found" : "Quest unavailable"}</h2><p>{error}</p></div>
    : detail
      ? <QuestDetailContent detail={detail} finance={finance} linkedDisputeId={linkedDisputeId} onCommand={openCommand} showFullDetailLink={presentation === "drawer"} />
      : <div className="empty"><p>Loading Quest from the Admin API…</p></div>;

  if (presentation === "drawer") {
    return (
      <>
        <div className="scrim" />
        <aside className="drawer open quest-drawer" aria-label="Quest detail drawer">
          <div className="drawer-top"><div><strong>{detail?.title ?? questId}</strong><small>Quest {questId} · Quest detail drawer</small></div><button className="icon" type="button" aria-label="Close Quest detail" onClick={() => router.back()}><span className="close-lines" /></button></div>
          <div className="drawer-body">{content}</div>
        </aside>
        {command ? <QuestCommandDialog command={command} onCancel={() => setCommand(null)} onSubmit={submitCommand} error={commandError} pending={commandPending} /> : null}
      </>
    );
  }

  return (
    <main className="admin-route-page quest-detail-page" tabIndex={-1}>
      <div className="page-head"><div><p className="admin-route-kicker">Quest</p><h1>{detail?.title ?? questId}</h1><p>{detail ? `Created by ${questMemberName(detail.hirer)}` : "Full Quest record from the Admin API."}</p></div><Link className="btn" href={questRoutes.list()}>Back to Quests</Link></div>
      <div className="quest-detail-grid">{content}</div>
      {command ? <QuestCommandDialog command={command} onCancel={() => setCommand(null)} onSubmit={submitCommand} error={commandError} pending={commandPending} /> : null}
    </main>
  );
}

export function AdminQuestPage() {
  const router = useRouter();
  const [rows, setRows] = useState<QuestBoardRow[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<QuestBoardTab>("all");
  const [pageSize, setPageSize] = useState<QuestBoardPageSize>(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<QuestSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<QuestSortDirection>("descending");
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let firstPageLoaded = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const firstPage = await adminApi.listQuests({ limit: 50, sort: "newest" });
        if (cancelled) return;
        firstPageLoaded = true;
        setRows(questRowsFromApi(firstPage.items));
        setLoading(false);
        if (!firstPage.nextCursor) return;

        setBackgroundLoading(true);
        const allItems = [...firstPage.items];
        let cursor: string | undefined = firstPage.nextCursor;
        while (cursor) {
          const nextPage = await adminApi.listQuests({ limit: 50, cursor, sort: "newest" });
          if (cancelled) return;
          allItems.push(...nextPage.items);
          if (!nextPage.nextCursor || nextPage.nextCursor === cursor) break;
          cursor = nextPage.nextCursor;
        }
        if (!cancelled) setRows(questRowsFromApi(allItems));
      } catch (loadError: unknown) {
        if (!cancelled) {
          if (!firstPageLoaded) setRows([]);
          setLoading(false);
          setError(errorMessage(loadError, "Quest data could not load from the Admin API."));
        }
      } finally {
        if (!cancelled) setBackgroundLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  const filteredRows = searchQuestRows(rows, query).filter((row) => questMatchesTab(row, tab));
  const sortedRows = sortQuestRows(filteredRows, sortKey, sortDirection);
  const totalPages = questPageCount(sortedRows.length, pageSize);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const visibleRows = pageQuestRows(sortedRows, currentPage, pageSize);
  const pageStart = visibleRows.length ? (pageSize === "all" ? 1 : (currentPage - 1) * pageSize + 1) : 0;
  const pageEnd = visibleRows.length ? pageStart + visibleRows.length - 1 : 0;

  function chooseTab(nextTab: QuestBoardTab) { setTab(nextTab); setPage(1); }
  function choosePageSize(nextSize: QuestBoardPageSize) { setPageSize(nextSize); setPage(1); }
  function sortBy(nextKey: QuestSortKey) {
    setPage(1);
    if (sortKey === nextKey) setSortDirection((direction) => direction === "ascending" ? "descending" : "ascending");
    else { setSortKey(nextKey); setSortDirection("ascending"); }
  }

  return (
    <main className="admin-route-page quest-route-page" tabIndex={-1}>
      <div className="page-head"><div><p className="admin-route-kicker">KUQuest Admin</p><h1>Quests</h1><p>Review Quests through every Quest State.</p></div></div>
      <section className="panel quest-board" aria-label="Quest board">
        <div className="tabs" aria-label="Quest filters">{QUEST_BOARD_TABS.map((item) => <button className={`tab${tab === item.id ? " active" : ""}`} type="button" aria-pressed={tab === item.id} key={item.id} onClick={() => chooseTab(item.id)}>{item.label}{item.id === "all" ? ` (${rows.length})` : ""}</button>)}</div>
        <div className="toolbar resource-toolbar"><label className="inline-search search-field" htmlFor="quest-search"><span className="visually-hidden">Search Quests</span><input id="quest-search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search Quests…" autoComplete="off" /></label><span className="sort-help">Click a column to sort</span><div className="page-size-controls">{([10, 25, 50, "all"] as const).map((size) => <button className={`page-size-button${pageSize === size ? " active" : ""}`} type="button" key={size} onClick={() => choosePageSize(size)}>{size === "all" ? "Show all" : `Show ${size}`}</button>)}</div><span className="count" aria-live="polite">{loading ? "Loading Quests…" : `Showing ${pageStart}–${pageEnd} of ${sortedRows.length} results`}</span></div>
        {backgroundLoading ? <p className="quest-api-status" aria-live="polite">Loading more Quests from the Admin API…</p> : null}
        {error ? <div className="quest-api-error" role="alert"><strong>Admin API unavailable</strong><span>{error}</span></div> : null}
        {loading ? <div className="empty"><p>Loading Quests from the Admin API…</p></div> : !sortedRows.length ? <div className="empty"><h2>No matching records</h2><p>There are no Quests in this view.</p><button className="btn" type="button" onClick={() => { setQuery(""); setTab("all"); }}>Reset view</button></div> : <div className="table-wrap" aria-label="quests table"><table className="data"><caption>Quests</caption><thead><tr><SortableHeader label="Quest" sortKey="id" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Title" sortKey="title" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Hirer" sortKey="hirer" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Created At" sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Quest Reward" sortKey="reward" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /><SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={sortBy} /></tr></thead><tbody>{visibleRows.map((row) => <tr className="quest-row" data-quest-id={row.id} key={row.id} tabIndex={0} aria-label={`Open Quest ${row.title}`} onClick={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; void router.push(questRoutes.detail(row.id)); }} onKeyDown={(event) => { if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea")) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void router.push(questRoutes.detail(row.id)); } }}><td><Link className="row-record-button" href={questRoutes.detail(row.id)} aria-label={`Open Quest ${row.displayId}`}>{row.displayId}</Link></td><td><Link className="row-record-button quest-title-link" href={questRoutes.detail(row.id)} aria-label={`Open Quest ${row.title}`}><strong>{row.title}</strong><small>{row.participationLabel} · {row.modeLabel}</small></Link></td><td><strong>{row.hirerName}</strong><small>{row.hirerEmail}</small></td><td>{formatQuestDate(row.createdAt)}</td><td className="money">{formatQuestMoney(row.rewardSatang)}</td><td><span className={`badge ${questStatusClass(row.state)}`}>{row.stateLabel}</span>{row.hiddenAt ? <span className="badge neutral quest-hidden-overlay">Hidden</span> : null}</td></tr>)}</tbody></table></div>}
        {sortedRows.length ? <div className="table-pagination"><button className="page-nav" type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="page-indicator">Page {currentPage} of {Math.max(totalPages, 1)}</span><button className="page-nav" type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div> : null}
      </section>
    </main>
  );
}

function SortableHeader({ label, sortKey, activeKey, direction, onSort }: { label: string; sortKey: QuestSortKey; activeKey: QuestSortKey; direction: QuestSortDirection; onSort: (key: QuestSortKey) => void }) {
  return <th aria-sort={activeKey === sortKey ? direction : "none"}><button className={`table-sort${activeKey === sortKey ? " is-active" : ""}`} type="button" onClick={() => onSort(sortKey)}>{label}<span className="sort-indicator" aria-hidden="true">{activeKey === sortKey && direction === "ascending" ? "↑" : "↓"}</span></button></th>;
}
