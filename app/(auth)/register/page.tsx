import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthForm } from "@/components/auth/auth-form";
import { isGoogleEnabled } from "@/lib/auth/providers";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/account");
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return (
    <>
      <h1 className="text-center text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mb-8 mt-1 text-center text-sm text-muted">Get 100 NOVA points when you join.</p>
      <AuthForm mode="register" next={safe} googleEnabled={isGoogleEnabled()} />
    </>
  );
}
