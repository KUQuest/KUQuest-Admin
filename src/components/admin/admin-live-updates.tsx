"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { invalidateActiveAdminQueries, invalidateAdminQueriesForEvent } from "../../features/admin/admin-live-invalidation";
import { subscribeToAdminEvents } from "../../features/admin/api/admin-api-events";

export function AdminLiveUpdates() {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    const refreshActiveAdminData = () => {
      void invalidateActiveAdminQueries(queryClient);
      router.refresh();
    };

    const subscription = subscribeToAdminEvents({
      onEvent: (event) => {
        void invalidateAdminQueriesForEvent(queryClient, event);
        router.refresh();
      },
      onOpen: refreshActiveAdminData,
    });

    return () => subscription.close();
  }, [queryClient, router]);

  return null;
}
