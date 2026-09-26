import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { peekAuthToken } from "@/lib/auth/tokens";
import { ResetPasswordForm } from "@/components/auth/password-forms";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Reset password", robots: { index: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const t = await peekAuthToken(token, "PASSWORD_RESET");
  if (!t || !token) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-white/6"><KeyRound className="size-5 text-muted" /></span>
        <h1 className="text-2xl font-semibold tracking-tight">This link has expired</h1>
        <p className="mb-8 mt-2 text-sm text-muted">Reset links work once and expire after 30 minutes. Request a new one and we&apos;ll email it right away.</p>
        <Link href="/forgot-password" className={buttonVariants({ size: "lg", className: "w-full" })}>Send a new link</Link>
      </div>
    );
  }
  return (
    <>
      <h1 className="text-center text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mb-8 mt-1 text-center text-sm text-muted">for {t.user.email}</p>
      <ResetPasswordForm token={token} />
    </>
  );
}
