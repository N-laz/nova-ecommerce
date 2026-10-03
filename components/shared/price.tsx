import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Price({ price, compareAt, discount, size = "md", className }: { price: string; compareAt?: string | null; discount?: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const hasDiscount = !!compareAt && Number(compareAt) > Number(price);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular min-w-0", className)}>
      <span className={cn("font-semibold tracking-tight", size === "lg" ? "text-3xl" : size === "md" ? "text-sm sm:text-base" : "text-sm")}>{formatINR(price)}</span>
      {hasDiscount && (
        <>
          <span className={cn("text-muted line-through", size === "lg" ? "text-base" : "text-[11px] sm:text-xs")}>{formatINR(compareAt!)}</span>
          {!!discount && <span className={cn("font-medium text-success", size === "lg" ? "text-sm" : "text-[11px] sm:text-xs")}>{discount}% off</span>}
        </>
      )}
    </div>
  );
}
