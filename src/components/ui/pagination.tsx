import { Button } from "./button";
import { cn } from "./utils";

export type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
  previousLabel?: string;
  nextLabel?: string;
};

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
  previousLabel = "Previous",
  nextLabel = "Next",
}: PaginationProps) {
  const safePage = Math.min(Math.max(page, 1), Math.max(pageCount, 1));
  return (
    <nav className={cn("flex items-center justify-between gap-3", className)} aria-label="Pagination">
      <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>
        {previousLabel}
      </Button>
      <span className="text-sm text-admin-muted" aria-live="polite">Page {safePage} of {Math.max(pageCount, 1)}</span>
      <Button variant="outline" size="sm" disabled={safePage >= pageCount} onClick={() => onPageChange(safePage + 1)}>
        {nextLabel}
      </Button>
    </nav>
  );
}
