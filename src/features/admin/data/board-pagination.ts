import {
  BOARD_PAGE_SIZE_OPTIONS,
  pageCount,
  pageRange,
  pageRows,
  type BoardPageOption,
} from "@/lib/board-pagination";

export type { BoardPageOption, BoardPageSize } from "@/lib/board-pagination";

/** Page sizes exposed by the admin board controls. */
export type AdminBoardPageSize = BoardPageOption;

export const ADMIN_BOARD_PAGE_SIZES = BOARD_PAGE_SIZE_OPTIONS;

export { pageCount, pageRange, pageRows };
