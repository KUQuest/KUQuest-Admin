import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-admin-md border border-admin-border bg-admin-surface shadow-admin-card", className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-admin-border px-5 py-4", className)} {...props} />;
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-base font-semibold text-admin-text", className)} {...props}>{children}</h2>;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm text-admin-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-3 border-t border-admin-border px-5 py-4", className)} {...props} />;
}

export type SectionProps = HTMLAttributes<HTMLElement> & {
  title?: ReactNode;
  description?: ReactNode;
};

export function Section({ className, title, description, children, ...props }: SectionProps) {
  return (
    <section className={cn("rounded-admin-md border border-admin-border bg-admin-surface", className)} {...props}>
      {title || description ? (
        <header className="border-b border-admin-border px-5 py-4">
          {title ? <h2 className="text-base font-semibold text-admin-text">{title}</h2> : null}
          {description ? <p className="mt-1 text-sm text-admin-muted">{description}</p> : null}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}
