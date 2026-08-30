"use client";

import { useEffect } from "react";

import { requireAdminSession } from "./auth";
import { applyRequestedLegacyRecords } from "./deep-links";
import { initializeFunctionalControls } from "./functional-controls";
import { getLegacyAdminRuntime } from "./runtime";

export type LegacyPage = "home" | "quest" | "dispute" | "report" | "user";

export function LegacyRuntimeLoader({ page, recordId }: { page: LegacyPage; recordId?: string }) {
  useEffect(() => {
    let cancelled = false;
    if (!requireAdminSession(window.localStorage, window.location)) return;

    const notifyReady = async () => {
      if (cancelled) return;
      const runtime = getLegacyAdminRuntime(window);
      if (runtime) {
        if (page === "dispute" && typeof window.openDisputeDrawer === "function") {
          const { initializeDisputeInteractions } = await import("./dispute-interactions");
          if (cancelled) return;
          window.openDisputeDrawer = initializeDisputeInteractions(document, runtime, window.openDisputeDrawer);
        }
        initializeFunctionalControls(document, runtime);
        applyRequestedLegacyRecords(
          new URLSearchParams(window.location.search),
          runtime,
          window.requestAnimationFrame,
        );
      }
    };

    window.__KUQUEST_RECORD_ID__ = recordId;
    window.__KUQUEST_PAGE__ = page;
    void import("./language")
      .then(() => import("./page-runtime"))
      .then(({ initializeTypedLegacyPage }) => initializeTypedLegacyPage({ page, recordId, search: window.location.search }))
      .then(notifyReady)
      .catch((error: unknown) => console.error(error));

    return () => {
      cancelled = true;
    };
  }, [page, recordId]);

  return null;
}
