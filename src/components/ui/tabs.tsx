"use client";

import { createContext, useContext, useId, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "./utils";

type TabsContextValue = {
  value: string;
  onValueChange?: (value: string) => void;
  idPrefix: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) throw new Error("Tabs components must be used inside Tabs");
  return context;
}

export type TabsProps = HTMLAttributes<HTMLDivElement> & {
  value: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
};

export function Tabs({ className, value, onValueChange, children, id, ...props }: TabsProps) {
  const generatedId = useId();
  const idPrefix = id ?? `tabs-${generatedId.replaceAll(":", "")}`;
  return (
    <TabsContext.Provider value={{ value, onValueChange, idPrefix }}>
      <div id={id} className={cn("grid gap-3", className)} {...props}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="tablist" className={cn("inline-flex w-fit items-center gap-1 rounded-admin-sm bg-admin-soft p-1", className)} {...props} />;
}

export type TabsTriggerProps = HTMLAttributes<HTMLButtonElement> & {
  value: string;
  disabled?: boolean;
};

export function TabsTrigger({ className, value, disabled, onClick, ...props }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange, idPrefix } = useTabsContext();
  const selected = value === selectedValue;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={`${idPrefix}-panel-${value}`}
      id={`${idPrefix}-tab-${value}`}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      className={cn("min-h-9 rounded-admin-sm px-3 py-1.5 text-sm font-medium text-admin-muted transition-colors hover:text-admin-text focus-visible:outline-2 focus-visible:outline-admin-accent disabled:pointer-events-none disabled:opacity-50", selected && "bg-admin-surface text-admin-text shadow-admin-low", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onValueChange?.(value);
      }}
      {...props}
    />
  );
}

export type TabsContentProps = HTMLAttributes<HTMLDivElement> & {
  value: string;
};

export function TabsContent({ className, value, children, ...props }: TabsContentProps) {
  const { value: selectedValue, idPrefix } = useTabsContext();
  const selected = value === selectedValue;
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${value}`} aria-labelledby={`${idPrefix}-tab-${value}`} hidden={!selected} className={cn("min-w-0", className)} {...props}>
      {selected ? children : null}
    </div>
  );
}
