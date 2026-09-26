import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/shared/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <LogoMark className="mx-auto size-10 text-muted" />
        <p className="mt-8 font-mono text-sm text-accent">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">This page doesn&apos;t exist.</h1>
        <p className="mt-2 text-muted">The link may be broken, or the product may no longer be available.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild><Link href="/">Go home</Link></Button>
          <Button asChild variant="secondary"><Link href="/shop">Browse products</Link></Button>
        </div>
      </div>
    </main>
  );
}
