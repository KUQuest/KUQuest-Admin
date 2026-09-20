import { Button } from "./button";
import { cn } from "./utils";

export type BoardPageSize = 10 | 25 | 50 | "all";

const boardPageSizes = [10, 25, 50, "all"] as const satisfies readonly BoardPageSize[];
const identityText = (text: string) => text;

export type PageSizeControlsProps = {
  value: number | "all";
  onChange: (size: BoardPageSize) => void;
  translateText?: (value: string) => string;
  disabled?: boolean;
  className?: string;
};

export function PageSizeControls({
  value,
  onChange,
  translateText = identityText,
  disabled = false,
  className,
}: PageSizeControlsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)} aria-label={translateText("Rows per page")}>
      {boardPageSizes.map((size) => (
        <Button
          key={size}
          variant="outline"
          size="xs"
          className={cn("min-h-8 border-admin-border bg-admin-surface px-2 text-xs text-admin-muted hover:border-admin-accent hover:bg-admin-accent-soft hover:text-admin-text", value === size && "border-admin-accent bg-admin-accent-soft text-admin-text")}
          type="button"
          disabled={disabled}
          aria-pressed={value === size}
          onClick={() => onChange(size)}
        >
          {size === "all" ? translateText("Show all") : `${translateText("Show")} ${size}`}
        </Button>
      ))}
    </div>
  );
}

export type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
  previousLabel?: string;
  nextLabel?: string;
  pageLabel?: string;
  ofLabel?: string;
  ariaLabel?: string;
  buttonClassName?: string;
};

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
  previousLabel = "Previous",
  nextLabel = "Next",
  pageLabel = "Page",
  ofLabel = "of",
  ariaLabel = "Pagination",
  buttonClassName,
}: PaginationProps) {
  const safePage = Math.min(Math.max(page, 1), Math.max(pageCount, 1));
  return (
    <nav className={cn("flex items-center justify-between gap-3", className)} aria-label={ariaLabel}>
      <Button variant="outline" size="xs" className={cn("min-h-8 border-admin-border bg-admin-surface px-2 text-xs text-admin-muted hover:border-admin-accent hover:bg-admin-accent-soft hover:text-admin-text", buttonClassName)} disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>
        {previousLabel}
      </Button>
      <span className="text-sm text-admin-muted" aria-live="polite">{pageLabel} {safePage} {ofLabel} {Math.max(pageCount, 1)}</span>
      <Button variant="outline" size="xs" className={cn("min-h-8 border-admin-border bg-admin-surface px-2 text-xs text-admin-muted hover:border-admin-accent hover:bg-admin-accent-soft hover:text-admin-text", buttonClassName)} disabled={safePage >= pageCount} onClick={() => onPageChange(safePage + 1)}>
        {nextLabel}
      </Button>
    </nav>
  );
}
