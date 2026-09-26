"use client";
import * as React from "react";
import * as A from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Accordion = A.Root;
export function AccordionItem({ className, ...p }: React.ComponentProps<typeof A.Item>) {
  return <A.Item className={cn("border-b border-border", className)} {...p} />;
}
export function AccordionTrigger({ className, children, ...p }: React.ComponentProps<typeof A.Trigger>) {
  return (
    <A.Header className="flex">
      <A.Trigger className={cn("group flex flex-1 items-center justify-between py-4 text-left text-sm font-medium transition hover:text-foreground cursor-pointer", className)} {...p}>
        {children}
        <ChevronDown className="size-4 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </A.Trigger>
    </A.Header>
  );
}
export function AccordionContent({ className, children, ...p }: React.ComponentProps<typeof A.Content>) {
  return (
    <A.Content className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down" {...p}>
      <div className={cn("pb-4", className)}>{children}</div>
    </A.Content>
  );
}
