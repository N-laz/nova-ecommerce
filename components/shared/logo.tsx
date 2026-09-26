import { cn } from "@/lib/utils";

/** NOVA mark: a four-point star inside an orbit — "a new star". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn("size-7", className)}>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeOpacity="0.16" />
      <path d="M16 6.5c.7 4.9 2.6 6.8 7.5 7.5v.1c-4.9.7-6.8 2.6-7.5 7.5h-.1c-.7-4.9-2.6-6.8-7.5-7.5V14c4.9-.7 6.8-2.6 7.5-7.5h.1Z" fill="#7C5CFC" transform="translate(0 1.9)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} aria-label="NOVA">
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-[0.18em]">NOVA</span>
    </span>
  );
}
