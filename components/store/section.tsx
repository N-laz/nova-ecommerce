import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Section({ eyebrow, title, href, linkLabel = "View all", children, className }: { eyebrow?: string; title: string; href?: string; linkLabel?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20", className)}>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="mb-2 text-xs font-medium tracking-normal text-accent sm:text-[13px]">{eyebrow}</p>}
          <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-[34px] md:leading-tight">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="group flex shrink-0 items-center gap-1.5 text-sm text-muted transition hover:text-foreground">
            {linkLabel} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
