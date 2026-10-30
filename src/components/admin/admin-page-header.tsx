import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  kicker?: ReactNode;
  actions?: ReactNode;
  showActionsOnMobile?: boolean;
  className?: string;
};

/** Shared page heading for Admin boards and full record routes. */
export function AdminPageHeader({
  title,
  description,
  kicker = "KUQuest Admin",
  actions,
  showActionsOnMobile = false,
  className = "",
}: AdminPageHeaderProps) {
  const mobileActions = Boolean(actions && showActionsOnMobile);
  return (
    <header className={`mb-6 flex items-start justify-between gap-6 max-[600px]:mb-5 max-[600px]:gap-3 ${mobileActions ? "max-[600px]:flex-wrap" : ""} ${className}`}>
      <div className="min-w-0">
        {kicker ? <p className="mb-1 text-sm font-medium text-admin-muted">{kicker}</p> : null}
        <h1 className="m-0 text-2xl font-semibold leading-tight tracking-[-0.025em] text-admin-text max-[600px]:text-[23px]">{title}</h1>
        {description ? <p className="mt-1 text-base text-admin-muted max-[600px]:hidden">{description}</p> : null}
      </div>
      {actions ? <div className={`flex shrink-0 flex-wrap items-center justify-end gap-2 ${showActionsOnMobile ? "max-[600px]:basis-full max-[600px]:w-full max-[600px]:justify-start" : "max-[600px]:hidden"}`}>{actions}</div> : null}
    </header>
  );
}
