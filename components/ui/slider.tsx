"use client";
import * as React from "react";
import * as S from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export function Slider({ className, ...props }: React.ComponentProps<typeof S.Root>) {
  const count = (props.value ?? props.defaultValue ?? [0]).length;
  return (
    <S.Root className={cn("relative flex h-5 w-full touch-none select-none items-center", className)} {...props}>
      <S.Track className="relative h-1 grow overflow-hidden rounded-full bg-white/10">
        <S.Range className="absolute h-full bg-accent" />
      </S.Track>
      {Array.from({ length: count }).map((_, i) => (
        <S.Thumb key={i} aria-label={i === 0 ? "Minimum" : "Maximum"} className="block size-4 rounded-full border-2 border-accent bg-white shadow transition focus-visible:ring-4 focus-visible:ring-accent/30 outline-none cursor-grab" />
      ))}
    </S.Root>
  );
}
