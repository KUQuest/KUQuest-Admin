"use client";

import { useEffect } from "react";

/** Reset board-local filters whenever a board page mounts. */
export function useAdminBoardReset(reset: () => void): void {
  useEffect(() => {
    reset();
  }, [reset]);
}
