import { cn } from "@/lib/utils";

export function StockStatus({ stock, low, className }: { stock: number; low: number; className?: string }) {
  const state = stock <= 0 ? "out" : stock <= low ? "low" : "in";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", state === "out" ? "text-danger" : state === "low" ? "text-warning" : "text-success", className)}>
      <span className={cn("size-1.5 rounded-full", state === "out" ? "bg-danger" : state === "low" ? "bg-warning" : "bg-success")} />
      {state === "out" ? "Currently unavailable" : state === "low" ? `Only ${stock} left` : "In stock"}
    </span>
  );
}
