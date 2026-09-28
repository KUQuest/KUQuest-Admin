import { forwardRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

const controlClasses = "min-h-10 w-full rounded-admin-sm border border-admin-border bg-admin-surface px-3 py-2 text-base text-admin-text outline-none placeholder:text-admin-faint focus-visible:border-admin-accent focus-visible:ring-2 focus-visible:ring-admin-accent/20 disabled:cursor-not-allowed disabled:bg-admin-soft disabled:opacity-70";

export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function NativeSelect(
  { className, ...props },
  ref,
) {
  return <select ref={ref} className={cn(controlClasses, "pr-8", className)} {...props} />;
});

export type FieldProps = {
  id?: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function Field({ id, label, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}{required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-sm text-admin-danger" role="alert">{error}</p> : hint ? <p className="text-sm text-admin-muted">{hint}</p> : null}
    </div>
  );
}
