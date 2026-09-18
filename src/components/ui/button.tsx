import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-admin-accent text-white hover:bg-admin-accent-strong",
  secondary: "bg-admin-soft text-admin-text hover:bg-admin-hover",
  outline: "border border-admin-border bg-admin-surface text-admin-text hover:bg-admin-hover",
  ghost: "bg-transparent text-admin-text hover:bg-admin-hover",
  danger: "bg-admin-danger text-white hover:bg-admin-danger/90",
  link: "bg-transparent text-admin-accent underline-offset-4 hover:underline",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-10 px-4 text-sm",
  lg: "min-h-11 px-5 text-base",
  icon: "size-10 p-0",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-admin-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});
