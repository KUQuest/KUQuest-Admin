import type { ReactNode } from "react";
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
