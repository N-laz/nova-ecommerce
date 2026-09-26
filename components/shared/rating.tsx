import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-white/15" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="text-[#f5c451]" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function RatingInline({ avg, count, className }: { avg: number; count: number; className?: string }) {
  if (!count) return <span className={cn("text-xs text-subtle", className)}>No reviews yet</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted", className)}>
      <Stars value={avg} size={12} />
      <span className="tabular text-foreground/80">{avg.toFixed(1)}</span>
      <span className="tabular">({count})</span>
    </span>
  );
}
