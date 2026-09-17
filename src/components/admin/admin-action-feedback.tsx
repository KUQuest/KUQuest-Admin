import type { ReactNode } from "react";

export type AdminActionSummaryProps = {
  title: string;
  affected: string;
  currentState?: string | null;
  nextState?: string | null;
  effect: ReactNode;
  reversibility?: ReactNode;
  warning?: ReactNode;
  className?: string;
};

/**
 * A compact, policy-facing preview for an Admin command.
 *
 * The component is deliberately data-only. It does not decide whether a
 * command is allowed; the owning feature remains the authority for that.
 */
export function AdminActionSummary({
  title,
  affected,
  currentState,
  nextState,
  effect,
  reversibility,
  warning,
  className,
}: AdminActionSummaryProps) {
  return (
    <section className={`admin-action-summary${className ? ` ${className}` : ""}`} aria-label={title}>
      <div className="admin-action-summary-heading">
        <span className="admin-action-summary-icon" aria-hidden="true">!</span>
        <h3>{title}</h3>
      </div>
      <dl className="admin-action-summary-facts">
        <div>
          <dt>Affected resource</dt>
          <dd>{affected}</dd>
        </div>
        {currentState ? (
          <div>
            <dt>Current state</dt>
            <dd>{currentState}</dd>
          </div>
        ) : null}
        {nextState ? (
          <div>
            <dt>New state</dt>
            <dd>{nextState}</dd>
          </div>
        ) : null}
        <div>
          <dt>Effect</dt>
          <dd>{effect}</dd>
        </div>
        {reversibility ? (
          <div>
            <dt>Reversibility</dt>
            <dd>{reversibility}</dd>
          </div>
        ) : null}
      </dl>
      {warning ? <p className="admin-action-summary-warning">{warning}</p> : null}
    </section>
  );
}

export type AdminActionReceiptProps = {
  title?: string;
  action: string;
  resource: string;
  resourceId: string;
  status?: string;
  admin?: string;
  occurredAt?: string;
  details?: ReactNode;
  mock?: boolean;
  onDismiss?: () => void;
};

export function AdminActionReceipt({
  title = "Action recorded",
  action,
  resource,
  resourceId,
  status = "Recorded",
  admin = "mock-admin",
  occurredAt,
  details,
  mock = false,
  onDismiss,
}: AdminActionReceiptProps) {
  const timestamp = occurredAt ?? new Date().toISOString();

  return (
    <output className="admin-action-receipt" aria-live="polite">
      <div className="admin-action-receipt-heading">
        <span className="admin-action-receipt-icon" aria-hidden="true">✓</span>
        <div>
          <strong>{title}</strong>
          {mock ? <small>Development fixture</small> : null}
        </div>
      </div>
      <dl className="admin-action-receipt-facts">
        <div><dt>Action</dt><dd>{action}</dd></div>
        <div><dt>Resource</dt><dd>{resource} · {resourceId}</dd></div>
        <div><dt>Result</dt><dd>{status}</dd></div>
        <div><dt>Admin</dt><dd>{admin}</dd></div>
        <div><dt>Time</dt><dd><time dateTime={timestamp}>{timestamp}</time></dd></div>
      </dl>
      {details ? <div className="admin-action-receipt-details">{details}</div> : null}
      {onDismiss ? <button className="link" type="button" onClick={onDismiss}>Dismiss</button> : null}
    </output>
  );
}
