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
      <div className="record-breadcrumb">
        <Link href={breadcrumbHref}>{breadcrumbLabel}</Link>
        <span aria-hidden="true">›</span>
        <span>{recordId}</span>
      </div>
      <div className="full-record-head">
        <div>
          <div className="record-id">{recordId}</div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="full-record-actions">{actions}</div>
      </div>
    </>
  );
}
