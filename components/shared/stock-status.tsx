import { cn } from "@/lib/utils";

export function StockStatus({ stock, low, className, subtle = false }: { stock: number; low: number; className?: string; subtle?: boolean }) {
  const state = stock <= 0 ? "out" : stock <= low ? "low" : "in";
  // In subtle mode: "in stock" is the default/expected state — showing it on every card
  // creates visual clutter without useful information. Low stock and out-of-stock are
  // always shown because those are actionable signals for the shopper.
  if (subtle && state === "in") return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px]", state === "out" ? "text-danger" : state === "low" ? "text-warning" : "text-success", className)}>
      <span className={cn("size-1.5 rounded-full", state === "out" ? "bg-danger" : state === "low" ? "bg-warning" : "bg-success")} aria-hidden="true" />
      {state === "out" ? "Currently unavailable" : state === "low" ? `Only ${stock} left` : "In stock"}
    </span>
  );
}
