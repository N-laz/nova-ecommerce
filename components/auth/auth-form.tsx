"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { ErrorNote } from "@/components/ui/states";
import { loginAction, registerAction } from "@/lib/actions/auth";
import { GoogleButton } from "@/components/auth/google-button";

export function AuthForm({ mode, next, googleEnabled, initialEmail = "" }: { mode: "login" | "register"; next?: string; googleEnabled: boolean; initialEmail?: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(mode === "login" ? loginAction : registerAction, null);
  const [show, setShow] = useState(false);
  // Controlled so React 19 form-action resets don't wipe what the user typed after an error.
  const [vals, setVals] = useState({ name: "", email: initialEmail });
  useEffect(() => {
    if (state?.ok) {
      router.push(state.data.redirectTo);
      router.refresh();
    }
  }, [state, router]);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const err = state && !state.ok && !Object.keys(fe).length ? state.error : null;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {err && <ErrorNote>{err}</ErrorNote>}
      {mode === "register" && (
        <Field label="Full name" htmlFor="name" error={fe.name}>
          <Input id="name" name="name" autoComplete="name" value={vals.name} onChange={(e) => setVals((v) => ({ ...v, name: e.target.value }))} required invalid={!!fe.name} />
        </Field>
      )}
      <Field label="Email" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" value={vals.email} onChange={(e) => setVals((v) => ({ ...v, email: e.target.value }))} required invalid={!!fe.email} />
      </Field>
      <Field label="Password" htmlFor="password" error={fe.password} hint={mode === "register" ? "At least 8 characters, with a letter and a number." : undefined}>
        <div className="relative">
          <Input id="password" name="password" type={show ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required invalid={!!fe.password} className="pr-10" />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      {mode === "login" && (
        <div className="-mt-1 text-right">
          <Link href={`/forgot-password${vals.email ? `?email=${encodeURIComponent(vals.email)}` : ""}`} className="text-xs text-muted hover:text-foreground">Forgot password?</Link>
        </div>
      )}
      <Button type="submit" size="lg" className="w-full" loading={pending || !!state?.ok}>{mode === "login" ? "Sign in" : "Create account"}</Button>
      <div className="relative py-2 text-center text-xs text-subtle">
        <span className="relative z-10 bg-background px-2">or</span>
        <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
      </div>
      <GoogleButton enabled={googleEnabled} next={next} label={mode === "login" ? "Continue with Google" : "Sign up with Google"} />
      <p className="pt-2 text-center text-sm text-muted">
        {mode === "login" ? <>New to NOVA? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-foreground hover:underline">Create an account</Link></> : <>Already have an account? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-foreground hover:underline">Sign in</Link></>}
      </p>
    </form>
  );
}
