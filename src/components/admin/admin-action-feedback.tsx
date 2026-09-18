import type { ReactNode } from "react";
import { formatAdminTimestamp } from "../../features/admin/date-format";
import { useAdminShell } from "./admin-shell-context";

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

function displayState(value: string): string {
  if (!value.includes("_")) return value;
  return value
    .replaceAll("_", " ")
    .toLocaleLowerCase()
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

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
  const { translateText } = useAdminShell();

  return (
    <section className={`admin-action-summary${className ? ` ${className}` : ""}`} aria-label={translateText(title)}>
      <div className="admin-action-summary-heading">
        <span className="admin-action-summary-icon" aria-hidden="true">!</span>
        <h3>{translateText(title)}</h3>
      </div>
      <dl className="admin-action-summary-facts">
        <div>
          <dt>{translateText("Affected resource")}</dt>
          <dd>{affected}</dd>
        </div>
        {currentState ? (
          <div>
            <dt>{translateText("Current state")}</dt>
            <dd>{translateText(displayState(currentState))}</dd>
          </div>
        ) : null}
        {nextState ? (
          <div>
            <dt>{translateText("New state")}</dt>
            <dd>{translateText(displayState(nextState))}</dd>
          </div>
        ) : null}
        <div>
          <dt>{translateText("Effect")}</dt>
          <dd>{effect}</dd>
        </div>
        {reversibility ? (
          <div>
            <dt>{translateText("Reversibility")}</dt>
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
  const { translateText } = useAdminShell();
  const timestamp = occurredAt ?? new Date().toISOString();

  return (
    <output className="admin-action-receipt" aria-live="polite">
      <div className="admin-action-receipt-heading">
        <span className="admin-action-receipt-icon" aria-hidden="true">✓</span>
        <div>
          <strong>{translateText(title)}</strong>
          {mock ? <small>{translateText("Development fixture")}</small> : null}
        </div>
      </div>
      <dl className="admin-action-receipt-facts">
        <div><dt>{translateText("Action")}</dt><dd>{translateText(displayState(action))}</dd></div>
        <div><dt>{translateText("Resource")}</dt><dd>{translateText(resource)} · {resourceId}</dd></div>
        <div><dt>{translateText("Result")}</dt><dd>{translateText(displayState(status))}</dd></div>
        <div><dt>{translateText("Admin")}</dt><dd>{admin}</dd></div>
        <div><dt>{translateText("Time")}</dt><dd><time dateTime={timestamp}>{formatAdminTimestamp(timestamp)}</time></dd></div>
      </dl>
      {details ? <div className="admin-action-receipt-details">{details}</div> : null}
      {onDismiss ? <button className="link" type="button" onClick={onDismiss}>{translateText("Dismiss")}</button> : null}
    </output>
  );
}
