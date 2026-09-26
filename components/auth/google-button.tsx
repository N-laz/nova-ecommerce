import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1S8.7 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.07-1.1-.16-1.6H12z" />
      <path fill="#34A853" d="M3.7 7.6l3.2 2.3C7.8 7.7 9.7 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 8.4 2.5 5.3 4.6 3.7 7.6z" opacity="0" />
      <path fill="#4285F4" d="M21 12.3c0-.6-.07-1.1-.16-1.6H12v3.9h5.5c-.26 1.3-1 2.4-2.1 3.1l3.3 2.5c1.9-1.8 2.3-4.5 2.3-7.9z" />
      <path fill="#FBBC05" d="M6.3 14.3a5.7 5.7 0 010-4.6L3 7.2a9.5 9.5 0 000 9.6l3.3-2.5z" />
      <path fill="#34A853" d="M12 21.5c2.6 0 4.7-.85 6.3-2.3l-3.3-2.5c-.9.6-2 1-3 1-2.4 0-4.4-1.6-5.2-3.8L3.5 16.4c1.6 3 4.8 5.1 8.5 5.1z" />
    </svg>
  );
}

/** Real link to the OAuth start route when configured; otherwise a disabled control that says why. */
export function GoogleButton({ enabled, next, label = "Continue with Google", mode = "signin", className }: { enabled: boolean; next?: string; label?: string; mode?: "signin" | "link"; className?: string }) {
  if (!enabled) {
    return (
      <div className={className}>
        <button type="button" disabled className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full")} aria-describedby="google-unavailable">
          <GoogleIcon className="size-4 opacity-60" /> {label}
        </button>
        <p id="google-unavailable" className="mt-2 text-center text-xs text-subtle">Google sign-in is unavailable on this server right now. Use email and password.</p>
      </div>
    );
  }
  const qs = new URLSearchParams();
  if (next) qs.set("next", next);
  if (mode === "link") qs.set("mode", "link");
  const href = `/api/auth/google${qs.size ? `?${qs}` : ""}`;
  return (
    // Plain anchor: this is a full-page redirect to Google, not a client navigation.
    <a href={href} className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full", className)}>
      <GoogleIcon className="size-4" /> {label}
    </a>
  );
}
