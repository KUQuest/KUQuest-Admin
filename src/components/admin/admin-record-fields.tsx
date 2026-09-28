import type { ReactNode } from "react";

import { adminRecordFact } from "./admin-record-styles";

export function AdminRecordFact({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <div className={adminRecordFact}><span>{label}</span><strong>{children}</strong></div>;
}
