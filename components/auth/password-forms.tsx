"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Mail } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { ErrorNote } from "@/components/ui/states";
import { requestPasswordResetAction, resetPasswordAction, verifyEmailAction } from "@/lib/actions/auth";

export function ForgotPasswordForm({ initialEmail }: { initialEmail: string }) {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, null);
  const [email, setEmail] = useState(initialEmail);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (state?.ok) {
      setSentTo(state.data.email);
      setCooldown(60);
    }
  }, [state]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const err = state && !state.ok && !Object.keys(fe).length ? state.error : null;

  if (sentTo) {
    return (
      <div className="text-center" role="status">
        <span className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-accent/15"><Mail className="size-5 text-accent" /></span>
        <h2 className="text-lg font-semibold">Check your inbox</h2>
        <p className="mt-2 text-sm text-muted">If an account exists for <span className="text-foreground">{sentTo}</span>, a reset link is on its way. It expires in 30 minutes.</p>
        <form action={formAction} className="mt-8 space-y-3">
          <input type="hidden" name="email" value={sentTo} />
          <Button type="submit" variant="secondary" size="lg" className="w-full" loading={pending} disabled={cooldown > 0}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend link"}
          </Button>
        </form>
        {err && <ErrorNote className="mt-3">{err}</ErrorNote>}
        <p className="mt-6 text-sm text-muted"><Link href="/login" className="text-foreground hover:underline">Back to sign in</Link></p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {err && <ErrorNote>{err}</ErrorNote>}
      <Field label="Email" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required invalid={!!fe.email} autoFocus />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>Send reset link</Button>
      <p className="pt-2 text-center text-sm text-muted">Remembered it? <Link href="/login" className="text-foreground hover:underline">Sign in</Link></p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(resetPasswordAction, null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (state?.ok) router.replace(state.data.redirectTo);
  }, [state, router]);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const err = state && !state.ok && !Object.keys(fe).length ? state.error : null;
  const expired = state && !state.ok && state.code === "TOKEN_INVALID";

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      {err && (
        <ErrorNote>
          {err} {expired && <Link href="/forgot-password" className="underline">Request a new link</Link>}
        </ErrorNote>
      )}
      <Field label="New password" htmlFor="password" error={fe.password} hint="At least 8 characters, with a letter and a number.">
        <div className="relative">
          <Input id="password" name="password" type={show ? "text" : "password"} autoComplete="new-password" required invalid={!!fe.password} className="pr-10" autoFocus />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted hover:text-foreground">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={fe.confirmPassword}>
        <Input id="confirmPassword" name="confirmPassword" type={show ? "text" : "password"} autoComplete="new-password" required invalid={!!fe.confirmPassword} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending || !!state?.ok}>Reset password</Button>
      <p className="text-center text-xs text-subtle">You&apos;ll be signed out on all devices.</p>
    </form>
  );
}

export function VerifyEmailButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (done) {
    return (
      <div role="status">
        <p className="mb-6 flex items-center justify-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" /> Email verified. Thanks!</p>
        <Link href="/account" className={buttonVariants({ size: "lg", className: "w-full" })}>Go to my account</Link>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button
        size="lg"
        className="w-full"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await verifyEmailAction(token);
            if (!r.ok) return void setError(r.error);
            setDone(true);
            router.refresh();
          })
        }
      >
        Confirm email
      </Button>
    </div>
  );
}
