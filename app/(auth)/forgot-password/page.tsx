import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <>
      <h1 className="text-center text-2xl font-semibold tracking-tight">Forgot your password?</h1>
      <p className="mb-8 mt-1 text-center text-sm text-muted">Enter your email and we&apos;ll send you a link to reset it.</p>
      <ForgotPasswordForm initialEmail={typeof email === "string" ? email.slice(0, 160) : ""} />
    </>
  );
}
