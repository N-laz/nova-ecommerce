"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { GoogleButton, GoogleIcon } from "@/components/auth/google-button";
import { resendVerificationAction, setPasswordAction, unlinkGoogleAction, updateEmailPreferencesAction } from "@/lib/actions/auth";

export function VerifyEmailBanner({ email }: { email: string }) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-accent/25 bg-accent/8 p-4 sm:flex-row sm:items-center">
      <MailWarning className="size-5 shrink-0 text-accent" />
      <p className="flex-1 text-sm">
        <span className="font-medium">Verify your email.</span> <span className="text-muted">We sent a link to {email}. Verified emails keep your account secure and ensure order updates reach you.</span>
      </p>
      <Button
        size="sm"
        variant="secondary"
        loading={pending}
        disabled={sent}
        onClick={() =>
          start(async () => {
            const r = await resendVerificationAction();
            if (!r.ok) return void toast.error(r.error);
            setSent(true);
            toast.success(r.message ?? "Verification email sent");
          })
        }
      >
        {sent ? "Sent — check your inbox" : "Resend email"}
      </Button>
    </div>
  );
}

export function SetPasswordForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(setPasswordAction, null);
  const last = useRef(state);
  useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    if (state.ok) {
      toast.success(state.message ?? "Password added");
      formRef.current?.reset();
      router.refresh();
    } else if (!state.fieldErrors) toast.error(state.error);
  }, [state, router]);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form ref={formRef} action={formAction} className="grid max-w-lg gap-4">
      <Field label="New password" htmlFor="sp-new" error={fe.newPassword} hint="At least 8 characters with a letter and a number."><Input id="sp-new" name="newPassword" type="password" autoComplete="new-password" invalid={!!fe.newPassword} /></Field>
      <Field label="Confirm password" htmlFor="sp-conf" error={fe.confirmPassword}><Input id="sp-conf" name="confirmPassword" type="password" autoComplete="new-password" invalid={!!fe.confirmPassword} /></Field>
      <Button type="submit" loading={pending} className="w-fit">Add password</Button>
    </form>
  );
}

export function GoogleMethodRow({ linkedEmail, googleEnabled, canUnlink }: { linkedEmail: string | null; googleEnabled: boolean; canUnlink: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
      <span className="grid size-9 place-items-center rounded-full bg-white/6"><GoogleIcon className="size-4" /></span>
      <div className="flex-1 text-sm">
        <p className="font-medium">Google</p>
        <p className="text-xs text-muted">{linkedEmail ? `Connected as ${linkedEmail}` : "Sign in with one tap using your Google account."}</p>
      </div>
      {linkedEmail ? (
        <Button
          size="sm"
          variant="ghost"
          loading={pending}
          disabled={!canUnlink}
          title={canUnlink ? undefined : "Add a password first so you can still sign in"}
          onClick={() =>
            start(async () => {
              if (!confirm("Disconnect Google from your NOVA account?")) return;
              const r = await unlinkGoogleAction();
              if (!r.ok) return void toast.error(r.error);
              toast.success(r.message ?? "Google disconnected");
              router.refresh();
            })
          }
        >
          Disconnect
        </Button>
      ) : googleEnabled ? (
        <GoogleButton enabled mode="link" label="Connect Google" className="h-8 w-auto px-3.5 text-[13px]" />
      ) : (
        <span className="text-xs text-subtle">Unavailable on this server</span>
      )}
    </li>
  );
}

export function EmailPreferences({ orderUpdates, offers }: { orderUpdates: boolean; offers: boolean }) {
  const [v, setV] = useState({ emailOrderUpdates: orderUpdates, emailOffers: offers });
  const [pending, start] = useTransition();
  const save = (next: typeof v) => {
    const prev = v;
    setV(next);
    start(async () => {
      const r = await updateEmailPreferencesAction(next);
      if (!r.ok) {
        setV(prev);
        return void toast.error(r.error);
      }
      toast.success(r.message ?? "Saved");
    });
  };
  const row = (k: keyof typeof v, title: string, desc: string) => (
    <label key={k} className="flex cursor-pointer items-start justify-between gap-6 py-4">
      <span className="text-sm">
        <span className="block font-medium">{title}</span>
        <span className="block text-muted">{desc}</span>
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" aria-label={title} className="peer sr-only" checked={v[k]} disabled={pending} onChange={(e) => save({ ...v, [k]: e.target.checked })} />
        <span className="h-6 w-11 rounded-full bg-white/10 transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60 peer-disabled:opacity-60" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
  return (
    <section className="mb-6 rounded-2xl bg-card px-6 py-2 hairline">
      <div className="divide-y divide-border">
        {row("emailOrderUpdates", "Shipping updates by email", "Shipped, out for delivery and delivered. Order confirmations, cancellations and security alerts are always sent.")}
        {row("emailOffers", "Offers & product alerts by email", "Price drops on your wishlist, back-in-stock alerts and NOVA promotions.")}
      </div>
    </section>
  );
}
