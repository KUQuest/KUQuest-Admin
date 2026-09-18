import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-admin-sm border border-transparent font-sans font-semibold no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-admin-accent text-white hover:bg-admin-accent-strong",
        secondary: "bg-admin-soft text-admin-text hover:bg-admin-hover",
        outline: "border border-admin-border bg-admin-surface text-admin-text hover:bg-admin-hover",
        ghost: "bg-transparent text-admin-text hover:bg-admin-hover",
        danger: "bg-admin-danger text-white hover:bg-admin-danger/90",
        link: "bg-transparent text-admin-accent underline-offset-4 hover:underline",
      },
      size: {
        xs: "min-h-8 px-2 text-xs",
        sm: "min-h-9 px-3 text-sm",
        md: "min-h-10 px-4 text-sm",
        lg: "min-h-11 px-5 text-base",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} type={asChild ? undefined : type} data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  },
);
Button.displayName = "Button";
