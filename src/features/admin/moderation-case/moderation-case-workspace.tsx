import Link from "next/link";
import type { ReactNode } from "react";

import type {
  ModerationCaseRelatedRecord,
  ModerationHistorySummary,
} from "./moderation-case-context";
import { hasModerationHistory } from "./moderation-case-context";

export type ModerationCaseKind = "Report Case" | "Conduct Report" | "Dispute Case";

type Person = {
  id: string | null;
  name: string;
  href: string | null;
  role: string;
};

export type ModerationCaseWorkspaceProps = {
  kind: ModerationCaseKind;
  caseId: string;
  statusLabel: string;
  badgeClass: string;
  submittedAt: string;
  source: string;
  detail: string;
  reportedMember?: Person | null;
  reporter?: Person | null;
  relatedRecord?: ModerationCaseRelatedRecord | null;
  evidenceCount: number;
  evidenceLabel?: string;
  financialSummary?: Array<{ label: string; value: string }>;
  moderationHistory?: ModerationHistorySummary;
  policyNote: string;
  translateText: (value: string) => string;
  compact?: boolean;
  children: ReactNode;
};

function PersonLink({ person, interactive = true }: { person: Person; interactive?: boolean }) {
  return interactive && person.href && person.id
    ? <Link href={person.href}>{person.name}</Link>
    : <span>{person.name}</span>;
}

function displayValue(value: string | number | null | undefined, fallback: string): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function ModerationHistoryPanel({
  summary,
  translateText,
  compact,
}: {
  summary: ModerationHistorySummary;
  translateText: (value: string) => string;
  compact: boolean;
}) {
  const fallback = translateText("Not provided by the current mock record.");
  const panelClass = compact ? "section moderation-case-history" : "record-panel moderation-case-history";
  const actionText = summary.previousActions.length
    ? summary.previousActions.join(" · ")
    : fallback;
  const noteText = summary.adminNotes.length
    ? summary.adminNotes.join(" · ")
    : fallback;

  return (
    <section className={panelClass}>
      <div className="record-panel-head">
        {compact ? <h3>{translateText("Member moderation context")}</h3> : <h2>{translateText("Member moderation context")}</h2>}
        <span className="section-count">{hasModerationHistory(summary) ? translateText("Available") : translateText("Partial")}</span>
      </div>
      <dl className="overview-meta moderation-case-history-grid">
        <div><dt>{translateText("Current Member status")}</dt><dd>{displayValue(summary.currentMemberStatus, fallback)}</dd></div>
        <div><dt>{translateText("Previous reports received")}</dt><dd>{displayValue(summary.previousReportCount, fallback)}</dd></div>
        <div><dt>{translateText("Confirmed previous violations")}</dt><dd>{displayValue(summary.confirmedViolationCount, fallback)}</dd></div>
      </dl>
      <div className="overview-group">
        <span>{translateText("Previous moderation actions")}</span>
        <p>{actionText}</p>
      </div>
      <div className="overview-group">
        <span>{translateText("Internal Admin notes")}</span>
        <p>{noteText}</p>
      </div>
    </section>
  );
}

function CaseContextPanel({
  kind,
  caseId,
  statusLabel,
  badgeClass,
  submittedAt,
  source,
  detail,
  reportedMember,
  reporter,
  relatedRecord,
  evidenceCount,
  evidenceLabel = "Evidence References",
  financialSummary,
  moderationHistory,
  policyNote,
  translateText,
  compact,
}: Omit<ModerationCaseWorkspaceProps, "children">) {
  const fallback = translateText("Not provided by the current mock record.");
  const panelClass = compact ? "section moderation-case-context" : "record-panel moderation-case-context";

  return (
    <section className={panelClass} data-moderation-case-workspace="context">
      <div className="record-panel-head">
        <div>
          {compact ? <h3>{translateText("Decision context")}</h3> : <h2>{translateText("Decision context")}</h2>}
          <p>{translateText("Review the case boundary and related records before deciding.")}</p>
        </div>
        <span className={`badge ${badgeClass}`}>{translateText(statusLabel)}</span>
      </div>
      <dl className="overview-meta moderation-case-context-grid">
        <div><dt>{translateText("Case")}</dt><dd>{caseId}</dd></div>
        <div><dt>{translateText("Case type")}</dt><dd>{translateText(kind)}</dd></div>
        <div><dt>{translateText("Source")}</dt><dd>{translateText(source)}</dd></div>
        <div><dt>{translateText("Submitted")}</dt><dd>{submittedAt}</dd></div>
        <div><dt>{translateText(evidenceLabel)}</dt><dd>{evidenceCount || translateText("None")}</dd></div>
      </dl>
      <div className="overview-group">
        <span>{translateText("Submitted detail")}</span>
        <p>{detail || fallback}</p>
      </div>
      {(reportedMember || reporter) && (
        <div className="party-grid moderation-case-parties">
          {reportedMember && <div><span>{translateText(reportedMember.role)}</span><strong><PersonLink person={reportedMember} interactive={!compact} /></strong><small>{reportedMember.id ?? "—"}</small></div>}
          {reporter && <div><span>{translateText(reporter.role)}</span><strong><PersonLink person={reporter} interactive={!compact} /></strong><small>{reporter.id ?? "—"}</small></div>}
        </div>
      )}
      {relatedRecord && (
        <div className="overview-group moderation-case-related-record">
          <span>{translateText(kind === "Dispute Case" ? "Related Quest and settlement" : "Related Quest")}</span>
          <p>
            {relatedRecord.href && relatedRecord.id && !compact
              ? <Link href={relatedRecord.href}>{relatedRecord.title ?? relatedRecord.id}</Link>
              : <strong>{relatedRecord.title ?? relatedRecord.id ?? fallback}</strong>}
            {relatedRecord.id && <small> · {relatedRecord.id}</small>}
          </p>
          {relatedRecord.state && <p>{translateText("Quest State")}: {relatedRecord.state}</p>}
        </div>
      )}
      {financialSummary && financialSummary.length > 0 && (
        <dl className="overview-meta moderation-case-finance">
          {financialSummary.map((item) => <div key={item.label}><dt>{translateText(item.label)}</dt><dd>{item.value}</dd></div>)}
        </dl>
      )}
      <div className="overview-group moderation-case-policy-note">
        <span>{translateText("Policy boundary")}</span>
        <p>{translateText(policyNote)}</p>
      </div>
      {moderationHistory && <ModerationHistoryPanel summary={moderationHistory} translateText={translateText} compact={Boolean(compact)} />}
    </section>
  );
}

export function ModerationCaseWorkspace({
  children,
  ...props
}: ModerationCaseWorkspaceProps) {
  return (
    <div className="moderation-case-workspace" data-moderation-case-workspace={props.kind}>
      <CaseContextPanel {...props} />
      {children}
    </div>
  );
}
