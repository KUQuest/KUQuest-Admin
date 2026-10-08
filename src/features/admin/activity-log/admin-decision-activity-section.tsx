"use client";

import { Card, CardHeader } from "../../../components/ui/card";
import { useAdminShell } from "../../../components/admin/admin-shell-context";
import {
  adminRecordFact,
  adminRecordFacts,
  adminRecordHeader,
  adminRecordHeading,
  adminRecordSection,
} from "../../../components/admin/admin-record-styles";
import { activityLogValueLabel } from "./activity-log-model";
import { decisionActivityStateFromQuery, useAdminDecisionActivityQuery } from "./activity-log-query";

export function AdminDecisionActivitySection({
  resourceType,
  resourceId,
  actions,
  reasonCode,
  adminName,
}: {
  resourceType: "report_case" | "conduct_report";
  resourceId: string;
  actions: readonly string[];
  reasonCode?: string | null;
  adminName?: string | null;
}) {
  const { translateText } = useAdminShell();
  const query = useAdminDecisionActivityQuery(resourceType, resourceId, actions);
  const readback = decisionActivityStateFromQuery(query);
  const loading = readback.kind === "loading";
  const unavailable = readback.kind === "unavailable";
  const activity = readback?.kind === "found" ? readback.entry : null;
  const effectiveReasonCode = reasonCode ?? activity?.reasonCode ?? null;
  const effectiveAdminName = adminName ?? activity?.adminName ?? null;
  const reasonFallback = loading
    ? "Loading the Admin decision record…"
    : unavailable
      ? "The Admin decision record is unavailable."
      : readback?.kind === "invalid"
        ? "The Admin decision record response is invalid."
        : readback?.kind === "found"
          ? "No decision reason code was recorded."
          : readback?.kind === "empty"
            ? "No Admin decision record was returned."
            : "Not available";
  const adminFallback = loading
    ? "Loading the Admin decision record…"
    : unavailable
      ? "The Admin decision record is unavailable."
    : readback?.kind === "found"
      ? "Admin identity was not provided."
      : "Not available";
  const noteValue = activity?.decisionReasonText
    ?? (loading
      ? translateText("Loading the Admin decision record…")
      : unavailable
        ? translateText("The Admin decision record is unavailable.")
        : readback?.kind === "invalid"
          ? translateText("The Admin decision record response is invalid.")
          : readback?.kind === "found"
            ? translateText("No note recorded")
            : readback?.kind === "empty"
              ? translateText("No Admin decision record was returned.")
              : translateText("Not available"));

  return (
    <Card as="section" className={adminRecordSection}>
      <CardHeader flush className={adminRecordHeader}>
        <h2 className={adminRecordHeading}>{translateText("Admin decision record")}</h2>
      </CardHeader>
      <div className={adminRecordFacts}>
        <div className={adminRecordFact}>
          <span>{translateText("Admin-selected reason")}</span>
          <strong>{effectiveReasonCode ? translateText(activityLogValueLabel(effectiveReasonCode)) : translateText(reasonFallback)}</strong>
        </div>
        <div className={adminRecordFact}>
          <span>{translateText("Admin")}</span>
          <strong>{effectiveAdminName ?? translateText(adminFallback)}</strong>
        </div>
        <div className={adminRecordFact}>
          <span>{translateText("Admin decision note")}</span>
          <strong>{noteValue}</strong>
        </div>
      </div>
      {unavailable ? <p className="field-error" role="alert">{translateText("The Admin decision record is unavailable.")}</p> : null}
      {readback?.kind === "invalid" ? <p className="field-error" role="alert">{translateText("The Admin decision record response is invalid.")}</p> : null}
    </Card>
  );
}
