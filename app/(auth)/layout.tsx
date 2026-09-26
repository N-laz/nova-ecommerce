import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]" />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mx-auto mb-10 block w-fit" aria-label="NOVA home"><Logo /></Link>
        {children}
      </div>
    </div>
  );
}
