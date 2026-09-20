import type { ReactNode } from "react";
import Link from "next/link";

type AdminRecordHeaderProps = {
  breadcrumbHref: string;
  breadcrumbLabel: ReactNode;
  recordId: ReactNode;
  title: ReactNode;
  subtitle: ReactNode;
  actions: ReactNode;
};

export function AdminRecordHeader({
  breadcrumbHref,
  breadcrumbLabel,
  recordId,
  title,
  subtitle,
  actions,
}: AdminRecordHeaderProps) {
  return (
    <>
      <div className="record-breadcrumb mb-[18px] flex items-center gap-[7px] text-admin-muted">
        <Link className="text-admin-accent no-underline" href={breadcrumbHref}>{breadcrumbLabel}</Link>
        <span aria-hidden="true">›</span>
        <span>{recordId}</span>
      </div>
      <div className="full-record-head mb-5 flex items-start justify-between gap-6 max-[700px]:block">
        <div>
          <div className="record-id text-admin-muted text-[13px] font-bold">{recordId}</div>
          <h1 className="m-0 mb-[5px] mt-0.5 text-2xl tracking-[-0.025em] max-[700px]:text-[23px]">{title}</h1>
          <p className="m-0 text-admin-muted">{subtitle}</p>
        </div>
        <div className="full-record-actions flex gap-2 max-[700px]:mt-4 max-[700px]:flex-wrap max-[700px]:overflow-visible [&>[data-slot=button]]:flex-[1_1_auto]">{actions}</div>
      </div>
    </>
  );
}
