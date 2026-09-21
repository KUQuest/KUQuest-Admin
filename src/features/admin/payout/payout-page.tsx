"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { ApiError } from "../../../lib/api/client";
import { AdminDrawer } from "../../../components/admin/admin-drawer";
import { AdminActionReceipt } from "../../../components/admin/admin-action-feedback";
import { AdminRecordHeader } from "../../../components/admin/admin-record-header";
import { AdminStatusAlert } from "../../../components/admin/admin-status-alert";
import { AdminRecordFact as Fact } from "../../../components/admin/admin-record-fields";
import { RecordStatusBar } from "../../../components/admin/record-status-bar";
import { adminRecordFacts, adminRecordHeader, adminRecordHeading, adminRecordSection } from "../../../components/admin/admin-record-styles";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Button as UiButton, Card, CardHeader, type ButtonSize } from "../../../components/ui";
import { payoutRoutes } from "../admin-routes";
import { adminApiProvider } from "../api/admin-provider";
import { payoutStatusLabel } from "../domain/rulebook";
import {
  formatPayoutDate,
  formatPayoutMoney,
  payoutOutcomeReason,
  payoutStatusClass,
  type PayoutDetailView,
} from "./payout-model";
import type {
  PayoutDataSource,
  PayoutDetailPageData,
} from "./payout-service";
import {
  applyMockPayoutDecision,
  applyMockPayoutOverride,
  PAYOUT_MOCK_UPDATED_EVENT,
  payoutMockOverrideFromDetail,
  readMockPayoutOverride,
  saveMockPayoutOverride,
} from "./payout-mock-state";
import { PayoutStatusBadge as Badge } from "./payout-status-badge";
import { PayoutCommandDialog, type PayoutCommand, type PayoutCommandSubmission } from "./payout-command-dialog";

type PayoutPresentation = "page" | "drawer";

function newIdempotencyKey(command: PayoutCommand, payoutId: string): string {
  const id = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `admin-${command}-payout-${payoutId}-${id}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return "Payout was not found.";
  return error instanceof Error ? error.message : "Payout command failed.";
}

function readableValue(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLocaleLowerCase()
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

function payoutReasonLabel(value: string): string {
  return /^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(value) ? readableValue(value) : value;
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card as="section" className={`${adminRecordSection}${className ? ` ${className}` : ""}`}>
      <CardHeader flush className={adminRecordHeader}><h3 className={adminRecordHeading}>{title}</h3></CardHeader>
      {children}
    </Card>
  );
}

function PayoutDecisionActions({
  detail,
  onCommand,
  onReconcile,
  reconcilePending,
  showReconcileAction,
  size = "md",
}: {
  detail: PayoutDetailView;
  onCommand: (command: PayoutCommand) => void;
  onReconcile: () => void;
  reconcilePending: boolean;
  showReconcileAction: boolean;
  size?: ButtonSize;
}) {
  const { translateText } = useAdminShell();
  const canDecide = detail.status === "PENDING_ADMIN_APPROVAL";
  const canReconcile = showReconcileAction
    && ["SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING", "FAILED"].includes(detail.status);

  if (canDecide) {
    return <>
      <UiButton size={size} variant="primary" type="button" onClick={() => onCommand("approve")}>{translateText("Approve Payout")}</UiButton>
      <UiButton size={size} variant="danger" type="button" onClick={() => onCommand("reject")}>{translateText("Reject Payout")}</UiButton>
    </>;
  }
  if (canReconcile) {
    return <UiButton size={size} variant="primary" type="button" onClick={onReconcile} disabled={reconcilePending}>
      {reconcilePending ? translateText("Reconciling…") : translateText("Reconcile with provider")}
    </UiButton>;
  }
  return null;
}

function PayoutStatusAlert({ detail }: { detail: PayoutDetailView }) {
  const { translateText } = useAdminShell();
  const needsApproval = detail.status === "PENDING_ADMIN_APPROVAL";
  const failed = detail.status === "FAILED";
  const tone = needsApproval ? "open" : failed ? "failed" : "closed";
  const title = needsApproval ? translateText("Payout approval is required") : translateText(detail.decisionContext.heading);
  const copy = needsApproval
    ? translateText("Review the masked destination and API-provided amounts before approving this Payout.")
    : translateText(detail.decisionContext.copy);

  return (
    <AdminStatusAlert
      as="output"
      tone={tone === "open" ? "warning" : tone === "failed" ? "danger" : "success"}
      title={title}
      description={copy}
      badge={translateText(payoutStatusLabel(detail.status))}
      badgeClassName={payoutStatusClass(detail.status)}
      className="dispute-page-alert payout-page-alert"
    />
  );
}

function PayoutDetailContent({
  detail,
  onCommand,
  onReconcile,
  reconcileError,
  reconcileNotice,
  reconcilePending,
  showReconcileAction,
  showFullDetailLink,
  fullDetail,
  actionReceipt,
  renderDecisionActions,
}: {
  detail: PayoutDetailView;
  onCommand: (command: PayoutCommand) => void;
  onReconcile: () => void;
  reconcileError: string | null;
  reconcileNotice: string | null;
  reconcilePending: boolean;
  showReconcileAction: boolean;
  showFullDetailLink: boolean;
  fullDetail: boolean;
  actionReceipt?: {
    action: string;
    status: string;
    reason: string | null;
    occurredAt: string;
  } | null;
  renderDecisionActions: boolean;
}) {
  const { translateText } = useAdminShell();
  const canDecide = detail.status === "PENDING_ADMIN_APPROVAL";
  const canReconcile = showReconcileAction
    && ["SUBMITTED_TO_PROVIDER", "PROVIDER_PENDING", "FAILED"].includes(detail.status);
  const outcomeReason = payoutOutcomeReason(detail);
  const showDecisionContext = !canDecide && !canReconcile;
  const fullSectionClass = fullDetail ? "!p-[18px] border border-admin-border rounded-admin-md bg-admin-surface shadow-admin-card [&_h3]:mb-[14px]" : "";

  const payoutSummarySection = <Section title={translateText("Payout summary")} className={`payout-summary-section ${fullDetail ? "col-span-full" : ""} ${fullSectionClass}`}>
    <div className={`${adminRecordFacts} payout-detail-facts`}>
      <Fact label={translateText("Status")}><Badge status={detail.status} /></Fact>
      <Fact label={translateText("Payout record")}>{detail.id}</Fact>
      <Fact label={translateText("Student")}>{detail.student.name}</Fact>
      <Fact label={translateText("Student email")}>{detail.student.email}</Fact>
      <Fact label={translateText("Quote")}>{detail.quoteId}</Fact>
      <Fact label={translateText(fullDetail ? "Occurred at" : "Payout version")}>
        {fullDetail ? formatPayoutDate(detail.createdAt) : detail.version}
      </Fact>
    </div>
  </Section>;

  const payoutAmountsSection = <Section title={translateText("Payout amounts")} className={`payout-amounts-section ${fullSectionClass}`}>
    <div className="grid grid-cols-2 gap-x-3.5 gap-y-2.5 max-[420px]:grid-cols-1">
      <div className="grid min-w-0 gap-0.5"><span className="text-[13px] leading-[1.4] text-admin-muted">{translateText("Principal")}</span><strong className="block text-[15px] leading-[1.4] tabular-nums text-admin-text">{formatPayoutMoney(detail.amounts.principalSatang)}</strong></div>
      <div className="grid min-w-0 gap-0.5"><span className="text-[13px] leading-[1.4] text-admin-muted">{translateText("Recipient receipt")}</span><strong className="block text-[15px] leading-[1.4] tabular-nums text-admin-text">{formatPayoutMoney(detail.amounts.receiptSatang)}</strong></div>
      <div className="grid min-w-0 gap-0.5"><span className="text-[13px] leading-[1.4] text-admin-muted">{translateText("Actual fee")}</span><strong className="block text-[15px] leading-[1.4] tabular-nums text-admin-text">{formatPayoutMoney(detail.amounts.actualFeeSatang)}</strong></div>
      <div className="grid min-w-0 gap-0.5"><span className="text-[13px] leading-[1.4] text-admin-muted">{translateText("Actual tax")}</span><strong className="block text-[15px] leading-[1.4] tabular-nums text-admin-text">{formatPayoutMoney(detail.amounts.actualTaxSatang)}</strong></div>
      <div className="grid min-w-0 gap-0.5"><span className="text-[13px] leading-[1.4] text-admin-muted">{translateText("Actual debit")}</span><strong className="block text-[15px] leading-[1.4] tabular-nums text-admin-text">{formatPayoutMoney(detail.amounts.actualDebitSatang)}</strong></div>
    </div>
    <p className="audit-note">{translateText("Actual fee, tax, and debit values are read from the Payout record.")}</p>
  </Section>;

  const payoutDestinationSection = <Section title={translateText("Payout Destination")} className={`payout-destination-section ${fullSectionClass}`}>
    <div className={`${adminRecordFacts} payout-destination-facts`}>
      <Fact label={translateText("Bank")}>{detail.destination.bankName}</Fact>
      <Fact label={translateText("Bank code")}>{detail.destination.bankCode}</Fact>
      <Fact label={translateText("Destination type")}>{translateText(readableValue(detail.destination.type))}</Fact>
      <Fact label={translateText("Destination")}>{detail.destination.maskedValue}</Fact>
      <Fact label={translateText("Routing")}>{detail.destination.maskedRoutingValue}</Fact>
    </div>
    <p className="audit-note">{translateText("Destination data is masked. Raw destination, encrypted payload, and Provider payload are not available to the Admin client.")}</p>
  </Section>;

  const payoutTimingSection = !fullDetail ? <Section title={translateText("Payout timing")} className="payout-timing-section">
    <div className="grid gap-2">
      {detail.history.length ? detail.history.map((entry) => (
        <div className="grid gap-2 rounded-lg border border-admin-border bg-admin-soft p-2.5" key={entry.id}>
          <div className="flex items-start justify-between gap-3"><span className="text-[13px] leading-[1.4] text-admin-muted">{translateText("Status")}</span><strong className="min-w-0 flex-1 text-right text-sm leading-[1.4] tabular-nums [overflow-wrap:anywhere]">{translateText(payoutStatusLabel(entry.toStatus))}</strong></div>
          <div className="flex items-start justify-between gap-3"><span className="text-[13px] leading-[1.4] text-admin-muted">{translateText("Occurred at")}</span><strong className="min-w-0 flex-1 text-right text-sm leading-[1.4] tabular-nums [overflow-wrap:anywhere]">{formatPayoutDate(entry.occurredAt)}</strong></div>
          {entry.fromStatus ? <div className="flex items-start justify-between gap-3"><span className="text-[13px] leading-[1.4] text-admin-muted">{translateText("Previous status")}</span><strong className="min-w-0 flex-1 text-right text-sm leading-[1.4] tabular-nums [overflow-wrap:anywhere]">{translateText(payoutStatusLabel(entry.fromStatus))}</strong></div> : null}
          {entry.reason ? <div className="flex items-start justify-between gap-3"><span className="text-[13px] leading-[1.4] text-admin-muted">{translateText("Reason")}</span><strong className="min-w-0 flex-1 text-right text-sm leading-[1.4] tabular-nums [overflow-wrap:anywhere]">{translateText(payoutReasonLabel(entry.reason))}</strong></div> : null}
          {entry.actorAdminId ? <div className="flex items-start justify-between gap-3"><span className="text-[13px] leading-[1.4] text-admin-muted">{translateText("Admin")}</span><strong className="min-w-0 flex-1 text-right text-sm leading-[1.4] tabular-nums [overflow-wrap:anywhere]">{entry.actorAdminId}</strong></div> : null}
        </div>
      )) : <p className="audit-note">{translateText("No Payout history is available.")}</p>}
    </div>
  </Section> : null;

  const payoutDecisionContextSection = showDecisionContext ? <Section title={translateText(detail.decisionContext.heading)} className={`payout-decision-context-section ${fullSectionClass}`}>
    <p>{translateText(detail.decisionContext.copy)}</p>
    <p className="audit-note">{translateText(detail.decisionContext.next)}</p>
  </Section> : null;

  const payoutHistorySection = <Section title={translateText("Payout history")} className={`payout-history-section ${fullSectionClass}`}>
    {detail.previousPayouts.length ? <div className="grid overflow-hidden rounded-lg border border-admin-border">
      {detail.previousPayouts.map((payout) => (
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-admin-border p-2.5 last:border-b-0 max-[420px]:items-end max-[420px]:flex-col max-[420px]:gap-1" key={payout.id}>
          <span><strong className="block text-sm leading-[1.4]">{payout.id}</strong><small className="mt-0.5 block text-[13px] leading-[1.4] text-admin-muted">{formatPayoutDate(payout.createdAt)}</small></span>
          <span className="flex shrink-0 items-center gap-2 max-[420px]:items-end max-[420px]:flex-col max-[420px]:gap-1"><strong className="block text-sm leading-[1.4] tabular-nums">{formatPayoutMoney(payout.principalSatang)}</strong><Badge status={payout.status} /></span>
        </div>
      ))}
    </div> : <p className="audit-note">{translateText("No previous Payouts are connected to this Student.")}</p>}
  </Section>;

  const payoutOutcomeSection = outcomeReason && (detail.status === "CANCELLED" || detail.status === "FAILED") ? (
    <Card as="section" className={`${adminRecordSection} payout-outcome-section border-admin-danger bg-admin-danger-soft ${fullSectionClass}`}>
      <CardHeader flush className={adminRecordHeader}><h3 className={`${adminRecordHeading} text-admin-danger`}>{translateText(detail.status === "FAILED" ? "Transfer failure reason" : "Rejection reason")}</h3></CardHeader>
      <p className="m-0 text-sm leading-[1.45] text-admin-danger">{translateText(payoutReasonLabel(outcomeReason))}</p>
    </Card>
  ) : null;

  const actionReceiptView = actionReceipt ? (
    <div className="col-span-full">
      <AdminActionReceipt
        action={actionReceipt.action}
        resource="Payout"
        resourceId={detail.id}
        status={actionReceipt.status}
        occurredAt={actionReceipt.occurredAt}
        mock
        details={actionReceipt.reason ? <p>{translateText("Reason")}: {actionReceipt.reason}</p> : undefined}
      />
    </div>
  ) : null;

  const payoutDecisionSection = canDecide || canReconcile ? (
    <Section title={translateText(renderDecisionActions ? "Admin decision" : "Decision context")} className={`payout-decision-section ${fullSectionClass}`}>
      <p>{canDecide
        ? translateText("Review the masked destination and API-provided amounts before deciding this Payout.")
        : translateText("The Payout needs a Provider status check before the next Admin action.")}</p>
      {renderDecisionActions ? <div className="payout-decision-actions mt-4 grid grid-cols-2 items-center gap-2 [&>*]:w-full max-[720px]:grid-cols-1">
        <PayoutDecisionActions
          detail={detail}
          onCommand={onCommand}
          onReconcile={onReconcile}
          reconcilePending={reconcilePending}
          showReconcileAction={showReconcileAction}
          size="lg"
        />
      </div> : null}
      {renderDecisionActions && reconcileError ? <p className="field-error" role="alert">{translateText(reconcileError)}</p> : null}
      {renderDecisionActions && reconcileNotice ? <output>{translateText(reconcileNotice)}</output> : null}
    </Section>
  ) : null;

  return (
    <div className={`payout-detail-stack admin-drawer-content-flow grid !grid-cols-1 gap-[18px]${fullDetail ? " !grid-cols-[minmax(0,1.65fr)_minmax(290px,0.72fr)] max-[1000px]:!grid-cols-1" : ""}`}>
      {payoutSummarySection}
      {fullDetail ? <>
        <div className="payout-detail-column payout-detail-primary-column grid min-w-0 !grid-cols-1 gap-[18px] [grid-column:1] max-[1000px]:[grid-column:1]">
          {payoutAmountsSection}
          {payoutHistorySection}
          {payoutOutcomeSection}
        </div>
        <div className="payout-detail-column payout-detail-secondary-column grid min-w-0 !grid-cols-1 gap-[18px] [grid-column:2] max-[1000px]:[grid-column:1]">
          {payoutDestinationSection}
          {payoutDecisionContextSection}
          {payoutDecisionSection}
        </div>
        {actionReceiptView}
      </> : <>
        {payoutAmountsSection}
        {payoutDestinationSection}
        {payoutTimingSection}
        {payoutDecisionContextSection}
        {payoutHistorySection}
        {payoutOutcomeSection}
        {actionReceiptView}
        {payoutDecisionSection}
      </>}
      {showFullDetailLink ? <UiButton asChild variant="outline" className="payout-full-detail-link justify-self-start"><a href={payoutRoutes.detail(detail.id)}>{translateText("Full Payout detail")}</a></UiButton> : null}
    </div>
  );
}

export function AdminPayoutDetailPage({
  data,
  dataSource,
  presentation = "page",
}: {
  data: PayoutDetailPageData;
  dataSource: PayoutDataSource;
  presentation?: PayoutPresentation;
}) {
  const router = useRouter();
  const { translateText } = useAdminShell();
  const [detail, setDetail] = useState(data.detail);
  const [command, setCommand] = useState<PayoutCommand | null>(null);
  const [commandIdempotencyKey, setCommandIdempotencyKey] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [commandPending, setCommandPending] = useState(false);
  const [actionReceipt, setActionReceipt] = useState<{
    action: string;
    status: string;
    reason: string | null;
    occurredAt: string;
  } | null>(null);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [reconcileNotice, setReconcileNotice] = useState<string | null>(null);
  const [reconcilePending, setReconcilePending] = useState(false);

  const closeDrawer = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    const persistedDetail = dataSource === "mock" && typeof window !== "undefined"
      ? applyMockPayoutOverride(data.detail, readMockPayoutOverride(window.localStorage, data.detail.id))
      : data.detail;
    setDetail(persistedDetail);
    setCommand(null);
    setCommandIdempotencyKey(null);
    setCommandError(null);
    setActionReceipt(null);
    setReconcileError(null);
    setReconcileNotice(null);
    setReconcilePending(false);
  }, [data, dataSource]);

  async function submitCommand(submission: PayoutCommandSubmission) {
    setCommandError(null);
    setCommandPending(true);
    const options = {
      idempotencyKey: commandIdempotencyKey ?? newIdempotencyKey(submission.command, detail.id),
      expectedVersion: detail.version,
    };
    try {
      if (dataSource === "api") {
        if (submission.command === "approve") {
          await adminApiProvider.commands.approvePayout(detail.id, {
            ...options,
          });
        } else {
          await adminApiProvider.commands.rejectPayout(detail.id, {
            ...options,
            reasonCode: submission.reasonCode,
            reason: submission.reason,
          });
        }
      } else {
        const decisionReason = submission.command === "reject" ? submission.reason : null;
        const decisionReasonCode = submission.command === "reject" ? submission.reasonCode : null;
        const occurredAt = new Date().toISOString();
        const nextDetail = applyMockPayoutDecision(detail, submission.command, decisionReason, occurredAt, decisionReasonCode);
        setDetail(nextDetail);
        if (typeof window !== "undefined") {
          saveMockPayoutOverride(window.localStorage, { id: nextDetail.id, ...payoutMockOverrideFromDetail(nextDetail) });
          window.dispatchEvent(new CustomEvent(PAYOUT_MOCK_UPDATED_EVENT, { detail: nextDetail }));
        }
        setActionReceipt({
          action: submission.command === "approve" ? "Approve Payout" : "Reject Payout",
          status: payoutStatusLabel(nextDetail.status),
          reason: decisionReason,
          occurredAt,
        });
      }
      setCommand(null);
      setCommandIdempotencyKey(null);
      if (presentation === "drawer" && dataSource === "api") {
        closeDrawer();
        window.setTimeout(() => router.refresh(), 0);
      }
      else if (dataSource === "api") router.refresh();
    } catch (error) {
      setCommandError(errorMessage(error));
    } finally {
      setCommandPending(false);
    }
  }

  async function reconcilePayout() {
    setReconcileError(null);
    setReconcileNotice(null);
    setReconcilePending(true);
    try {
      if (dataSource === "api") {
        await adminApiProvider.commands.reconcilePayout(detail.id);
        router.refresh();
      }
      setReconcileNotice(`${translateText("Payout")} ${detail.id} ${translateText("was reconciled with the Provider.")}`);
    } catch (error) {
      setReconcileError(errorMessage(error));
    } finally {
      setReconcilePending(false);
    }
  }

  const content = <PayoutDetailContent
    detail={detail}
    onCommand={(nextCommand) => { setCommandError(null); setCommandIdempotencyKey(newIdempotencyKey(nextCommand, detail.id)); setCommand(nextCommand); }}
    onReconcile={() => { void reconcilePayout(); }}
    reconcileError={reconcileError}
    reconcileNotice={reconcileNotice}
    reconcilePending={reconcilePending}
    showReconcileAction={dataSource === "api"}
    showFullDetailLink={false}
    fullDetail={presentation === "page"}
    actionReceipt={actionReceipt}
    renderDecisionActions
  />;

  if (presentation === "drawer") {
    return (
      <>
        <AdminDrawer
          ariaLabel={translateText("Close Payout detail")}
          title={detail.id}
          titleId="payout-drawer-title"
          subtitle={translateText("Payout detail drawer")}
          className="payout-drawer [&>.drawer-body]:grid [&>.drawer-body]:content-start [&>.drawer-body]:gap-3.5 [&>.drawer-body]:!pb-7"
          openerAttribute="data-payout-drawer-trigger"
          openerValue={detail.id}
          outsideClassName="payout-command-layer"
          escapeDisabled={command !== null}
          onClose={closeDrawer}
          actions={<UiButton asChild variant="outline"><a href={payoutRoutes.detail(detail.id)}>{translateText("Full Payout detail")}</a></UiButton>}
        >
          {content}
        </AdminDrawer>
        {command ? <PayoutCommandDialog detail={detail} command={command} onCancel={() => setCommand(null)} onSubmit={submitCommand} error={commandError} pending={commandPending} /> : null}
      </>
    );
  }

  return (
    <main className="admin-route-page payout-detail-page max-w-[1080px]" tabIndex={-1}>
      <AdminRecordHeader
        breadcrumbHref={payoutRoutes.list()}
        breadcrumbLabel={translateText("Payouts")}
        recordId={detail.id}
        title={detail.id}
        subtitle={`${translateText("Payout for")} ${detail.student.name} · ${translateText("created")} ${formatPayoutDate(detail.createdAt)}`}
        actions={<UiButton asChild size="lg" variant="outline"><Link href={payoutRoutes.list()}>{translateText("Back to Payouts")}</Link></UiButton>}
      />
      <PayoutStatusAlert detail={detail} />
      <RecordStatusBar className="payout-record-status-bar" items={[{ id: "status", label: translateText("Status"), value: <Badge status={detail.status} /> }, { id: "student", label: translateText("Student"), value: detail.student.name }, { id: "principal", label: translateText("Principal"), value: formatPayoutMoney(detail.amounts.principalSatang) }, { id: "created", label: translateText("Created"), value: formatPayoutDate(detail.createdAt) }, { id: "destination-type", label: translateText("Destination type"), value: translateText(readableValue(detail.destination.type)) }]} />
      <div className="min-w-0">{content}</div>
      {command ? <PayoutCommandDialog detail={detail} command={command} onCancel={() => setCommand(null)} onSubmit={submitCommand} error={commandError} pending={commandPending} /> : null}
    </main>
  );
}

export { AdminPayoutPage } from "./payout-board-page";
