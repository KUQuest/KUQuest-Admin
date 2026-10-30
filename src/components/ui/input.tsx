import * as React from "react";
import { cn } from "@/lib/utils";

const inputClasses = "flex min-h-10 w-full rounded-admin-sm border border-admin-border bg-admin-surface px-3 py-2 text-base text-admin-text outline-none placeholder:text-admin-faint transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:border-admin-accent focus-visible:ring-2 focus-visible:ring-admin-accent/20 disabled:cursor-not-allowed disabled:bg-admin-soft disabled:opacity-70";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => (
  <input ref={ref} type={type} data-slot="input" className={cn(inputClasses, className)} {...props} />
));
Input.displayName = "Input";

export { Input };
