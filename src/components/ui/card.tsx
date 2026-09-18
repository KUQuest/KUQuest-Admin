import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardElement = "div" | "section";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  as?: CardElement;
};

export function Card({ as = "div", className, ...props }: CardProps) {
  const Component = as;
  return <Component data-slot="card" className={cn("rounded-admin-md border border-admin-border bg-admin-surface shadow-admin-card", className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-header" className={cn("border-b border-admin-border px-5 py-4", className)} {...props} />;
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 data-slot="card-title" className={cn("text-base font-semibold text-admin-text", className)} {...props}>{children}</h2>;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p data-slot="card-description" className={cn("mt-1 text-sm text-admin-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-content" className={cn("px-5 py-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-footer" className={cn("flex items-center gap-3 border-t border-admin-border px-5 py-4", className)} {...props} />;
}

export type SectionProps = HTMLAttributes<HTMLElement> & {
  title?: ReactNode;
  description?: ReactNode;
};

export function Section({ className, title, description, children, ...props }: SectionProps) {
  return (
    <section data-slot="section" className={cn("rounded-admin-md border border-admin-border bg-admin-surface", className)} {...props}>
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
