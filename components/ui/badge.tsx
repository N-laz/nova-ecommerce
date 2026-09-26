import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide whitespace-nowrap", {
  variants: {
    variant: {
      default: "bg-white/8 text-foreground",
      accent: "bg-accent-soft text-[#b3a1ff]",
      success: "bg-success/12 text-success",
      danger: "bg-danger/12 text-danger",
      warning: "bg-warning/12 text-warning",
      solid: "bg-white text-black",
      outline: "border border-border-strong text-muted",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
