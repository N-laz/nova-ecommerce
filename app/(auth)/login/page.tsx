import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isGoogleEnabled } from "@/lib/auth/providers";
import { AUTH_ERRORS } from "@/lib/auth/messages";
import { AuthForm } from "@/components/auth/auth-form";
import { ErrorNote, SuccessNote } from "@/components/ui/states";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; reset?: string }> }) {
  const { next, error, reset } = await searchParams;
  const user = await getCurrentUser();
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  if (user) redirect(safe ?? (user.role === "ADMIN" ? "/admin" : "/account"));
  const errorText = error ? AUTH_ERRORS[error] ?? AUTH_ERRORS.google_failed : null;
  return (
    <>
      <h1 className="text-center text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mb-8 mt-1 text-center text-sm text-muted">Sign in to your NOVA account.</p>
      {reset && <SuccessNote className="mb-4">Your password has been reset. Sign in with your new password.</SuccessNote>}
      {errorText && <ErrorNote className="mb-4">{errorText}</ErrorNote>}
      <AuthForm mode="login" next={safe} googleEnabled={isGoogleEnabled()} />
    </>
  );
}
