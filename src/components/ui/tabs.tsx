"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export type TabsProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>;

export function Tabs({ className, ...props }: TabsProps) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("grid gap-0", className)} {...props} />;
}

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} data-slot="tabs-list" className={cn("flex w-full min-w-0 items-center gap-1 overflow-x-auto rounded-none border-b border-admin-border bg-transparent p-0", className)} {...props} />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    data-slot="tabs-trigger"
    className={cn(
      "min-h-10 shrink-0 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 py-2 text-sm font-medium text-admin-muted transition-colors hover:bg-transparent hover:text-admin-text focus-visible:outline-2 focus-visible:outline-admin-accent disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-admin-accent data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-admin-text data-[state=active]:shadow-none",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} data-slot="tabs-content" className={cn("min-w-0", className)} {...props} />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
