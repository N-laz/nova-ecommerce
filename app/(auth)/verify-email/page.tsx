import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck, MailX } from "lucide-react";
import { peekAuthToken } from "@/lib/auth/tokens";
import { VerifyEmailButton } from "@/components/auth/password-forms";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Verify email", robots: { index: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const t = await peekAuthToken(token, "EMAIL_VERIFY");
  if (!t || !token) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-white/6"><MailX className="size-5 text-muted" /></span>
        <h1 className="text-2xl font-semibold tracking-tight">Link invalid or expired</h1>
        <p className="mb-8 mt-2 text-sm text-muted">Verification links expire after 24 hours. You can send a fresh one from your account.</p>
        <Link href="/account" className={buttonVariants({ size: "lg", className: "w-full" })}>Go to my account</Link>
      </div>
    );
  }
  return (
    <div className="text-center">
      <span className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-accent/15"><MailCheck className="size-5 text-accent" /></span>
      <h1 className="text-2xl font-semibold tracking-tight">Confirm your email</h1>
      <p className="mb-8 mt-2 text-sm text-muted">Confirm <span className="text-foreground">{t.user.email}</span> as the email for your NOVA account.</p>
      <VerifyEmailButton token={token} />
    </div>
  );
}
