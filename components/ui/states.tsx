import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-16 text-center", className)}>
      {icon && <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-card text-muted hairline [&_svg]:size-6">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted text-pretty">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div role="alert" className={cn("rounded-xl border border-danger/25 bg-danger/8 px-4 py-3 text-sm text-danger", className)}>{children}</div>;
}

export function SuccessNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div role="status" className={cn("rounded-xl border border-success/25 bg-success/8 px-4 py-3 text-sm text-success", className)}>{children}</div>;
}
