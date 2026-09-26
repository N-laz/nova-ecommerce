"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong.</h1>
        <p className="mt-2 max-w-md text-muted">We couldn&apos;t load this page. Please try again — if it keeps happening, our team has been notified.</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-subtle">Ref: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="secondary"><Link href="/">Go home</Link></Button>
        </div>
      </div>
    </main>
  );
}
