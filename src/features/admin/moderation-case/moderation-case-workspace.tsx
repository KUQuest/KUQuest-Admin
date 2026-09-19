import Link from "next/link";
import type { ReactNode } from "react";

import type {
  ModerationCaseRelatedRecord,
  ModerationHistorySummary,
} from "./moderation-case-context";
import { hasModerationHistory } from "./moderation-case-context";
import { questStateLabel } from "../domain/rulebook";
import { Card, CardHeader } from "../../../components/ui/card";
import { AdminOverviewMeta } from "../../../components/admin/admin-overview-meta";
import {
  adminRecordCount,
  adminRecordGroup,
  adminRecordHeader,
  adminRecordHeading,
  adminRecordPartyGrid,
  adminRecordSection,
} from "../../../components/admin/admin-record-styles";

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
  showCaseMetadata?: boolean;
  showModerationHistory?: boolean;
  showRelatedRecord?: boolean;
  showDecisionContext?: boolean;
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

export function ModerationHistoryPanel({
  summary,
  translateText,
  compact,
  member,
  memberLabel = "Reported Member",
}: {
  summary: ModerationHistorySummary;
  translateText: (value: string) => string;
  compact: boolean;
  member?: { id: string | null; name: string; href: string | null } | null;
  memberLabel?: string;
}) {
  const fallback = translateText("Not provided.");
  const panelClass = `${adminRecordSection} moderation-case-history`;
  const actionText = summary.previousActions.length
    ? summary.previousActions.map((action) => translateText(action)).join(" · ")
    : fallback;
  const noteText = summary.adminNotes.length
    ? summary.adminNotes.join(" · ")
    : fallback;

  return (
    <Card as="section" className={panelClass}>
      <CardHeader flush className={adminRecordHeader}>
        {compact ? <h3 className={adminRecordHeading}>{translateText("Member moderation context")}</h3> : <h2 className={adminRecordHeading}>{translateText("Member moderation context")}</h2>}
        <span className={adminRecordCount}>{hasModerationHistory(summary) ? translateText("Available") : translateText("Partial")}</span>
      </CardHeader>
      {member && (
        <div className={`${adminRecordGroup} moderation-case-history-member`}>
          <span>{translateText(memberLabel)}</span>
          <p>
            <strong className="font-semibold">{!compact && member.href && member.id ? <Link href={member.href}>{member.name}</Link> : member.name}</strong>
            {member.id && <small className="text-xs text-admin-muted"> · {member.id}</small>}
          </p>
        </div>
      )}
      <AdminOverviewMeta className="moderation-case-history-grid !grid-cols-2 max-[600px]:!grid-cols-1">
        <div><dt>{translateText("Current Member status")}</dt><dd>{translateText(displayValue(summary.currentMemberStatus, fallback))}</dd></div>
        <div><dt>{translateText("Previous reports received")}</dt><dd>{displayValue(summary.previousReportCount, fallback)}</dd></div>
        <div><dt>{translateText("Confirmed previous violations")}</dt><dd>{displayValue(summary.confirmedViolationCount, fallback)}</dd></div>
      </AdminOverviewMeta>
      <div className={adminRecordGroup}>
        <span>{translateText("Previous moderation actions")}</span>
        <p>{actionText}</p>
      </div>
      <div className={adminRecordGroup}>
        <span>{translateText("Internal Admin notes")}</span>
        <p>{noteText}</p>
      </div>
    </Card>
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
  showCaseMetadata = true,
  showModerationHistory = true,
  showRelatedRecord = true,
}: Omit<ModerationCaseWorkspaceProps, "children">) {
  const fallback = translateText("Not provided.");
  const panelClass = `${adminRecordSection} moderation-case-context`;

  return (
    <Card as="section" className={panelClass} data-moderation-case-workspace="context">
      <CardHeader flush className={adminRecordHeader}>
        <div>
          {compact ? <h3 className={adminRecordHeading}>{translateText("Decision context")}</h3> : <h2 className={adminRecordHeading}>{translateText("Decision context")}</h2>}
          <p className="mt-1 text-sm leading-[1.45] text-admin-muted">{translateText("Review the case boundary and related records before deciding.")}</p>
        </div>
        <span className={`badge ${badgeClass} text-xs leading-[1.35]`}>{translateText(statusLabel)}</span>
      </CardHeader>
      {showCaseMetadata && <AdminOverviewMeta className="moderation-case-context-grid !grid-cols-2 max-[600px]:!grid-cols-1">
        <div><dt>{translateText("Case")}</dt><dd>{caseId}</dd></div>
        <div><dt>{translateText("Case type")}</dt><dd>{translateText(kind)}</dd></div>
        <div><dt>{translateText("Source")}</dt><dd>{translateText(source)}</dd></div>
        <div><dt>{translateText("Submitted")}</dt><dd>{submittedAt}</dd></div>
        <div><dt>{translateText(evidenceLabel)}</dt><dd>{evidenceCount || translateText("None")}</dd></div>
      </AdminOverviewMeta>}
      <div className={adminRecordGroup}>
        <span>{translateText("Submitted detail")}</span>
        <p>{detail || fallback}</p>
      </div>
      {(reportedMember || reporter) && (
        <div className={`${adminRecordPartyGrid} moderation-case-parties`}>
          {reportedMember && <div><span>{translateText(reportedMember.role)}</span><strong><PersonLink person={reportedMember} interactive={!compact} /></strong><small>{reportedMember.id ?? "—"}</small></div>}
          {reporter && <div><span>{translateText(reporter.role)}</span><strong><PersonLink person={reporter} interactive={!compact} /></strong><small>{reporter.id ?? "—"}</small></div>}
        </div>
      )}
      {showRelatedRecord && relatedRecord && (
        <div className={`${adminRecordGroup} moderation-case-related-record`}>
          <span>{translateText(kind === "Dispute Case" ? "Related Quest and settlement" : "Related Quest")}</span>
          <p>
            {relatedRecord.href && relatedRecord.id && !compact
              ? <Link href={relatedRecord.href}>{relatedRecord.title ?? relatedRecord.id}</Link>
              : <strong>{relatedRecord.title ?? relatedRecord.id ?? fallback}</strong>}
            {relatedRecord.id && <small> · {relatedRecord.id}</small>}
          </p>
          {relatedRecord.state && <p>{translateText("Quest State")}: {translateText(questStateLabel(relatedRecord.state))}</p>}
        </div>
      )}
      {financialSummary && financialSummary.length > 0 && (
        <AdminOverviewMeta className="moderation-case-finance !grid-cols-2 max-[600px]:!grid-cols-1">
          {financialSummary.map((item) => <div key={item.label}><dt>{translateText(item.label)}</dt><dd>{item.value}</dd></div>)}
        </AdminOverviewMeta>
      )}
      <div className={`${adminRecordGroup} moderation-case-policy-note`}>
        <span>{translateText("Policy boundary")}</span>
        <p>{translateText(policyNote)}</p>
      </div>
      {showModerationHistory && moderationHistory && <ModerationHistoryPanel summary={moderationHistory} translateText={translateText} compact={Boolean(compact)} />}
    </Card>
  );
}

export function ModerationCaseWorkspace({
  children,
  showDecisionContext = true,
  ...props
}: ModerationCaseWorkspaceProps) {
  return (
    <div className="grid gap-[18px]" data-moderation-case-workspace={props.kind}>
      {showDecisionContext && <CaseContextPanel {...props} />}
      {children}
    </div>
  );
}
