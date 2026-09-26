"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { subscribeNewsletterAction } from "@/lib/actions/browse";

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState(subscribeNewsletterAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      ref.current?.reset();
    }
  }, [state]);
  return (
    <form ref={ref} action={formAction} className="w-full max-w-md">
      <div className="flex items-center gap-2 rounded-full bg-white/5 p-1.5 hairline focus-within:ring-2 focus-within:ring-accent/40">
        <input name="email" type="email" required placeholder="you@example.com" aria-label="Email address" className="h-10 min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-subtle" />
        <button type="submit" disabled={pending} className="flex h-10 items-center gap-1.5 rounded-full bg-white px-5 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60 cursor-pointer">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <>Subscribe <ArrowRight className="size-4" /></>}
        </button>
      </div>
      {state && !state.ok && <p role="alert" className="mt-2 px-4 text-xs text-danger">{state.error}</p>}
    </form>
  );
}
