import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { currentSessionId } from "@/lib/auth/session";
import { isGoogleEnabled } from "@/lib/auth/providers";
import { AUTH_ERRORS } from "@/lib/auth/messages";
import { PasswordForm, SessionRow } from "@/components/account/forms";
import { GoogleMethodRow, SetPasswordForm } from "@/components/account/email-security";
import { ErrorNote, SuccessNote } from "@/components/ui/states";

export const metadata: Metadata = { title: "Security", robots: { index: false } };

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ linked?: string; error?: string }> }) {
  const u = await requireUserPage("/account/security");
  const { linked, error } = await searchParams;
  const [sessions, sid, row] = await Promise.all([
    db.session.findMany({ where: { userId: u.id, expiresAt: { gt: new Date() } }, orderBy: { lastUsedAt: "desc" } }),
    currentSessionId(),
    db.user.findUniqueOrThrow({ where: { id: u.id }, select: { passwordHash: true, emailVerified: true, accounts: { select: { provider: true, email: true } } } }),
  ]);
  const hasPassword = Boolean(row.passwordHash);
  const google = row.accounts.find((a) => a.provider === "google");

  return (
    <div className="space-y-6">
      {linked === "google" && <SuccessNote>Google is now connected. You can use it to sign in.</SuccessNote>}
      {error && <ErrorNote>{AUTH_ERRORS[error] ?? AUTH_ERRORS.google_failed}</ErrorNote>}

      <section className="rounded-2xl bg-card p-6 hairline">
        <h2 className="mb-1 text-xl font-semibold">Sign-in methods</h2>
        <p className="text-sm text-muted">Ways you can sign in to your NOVA account.</p>
        <ul className="mt-2 divide-y divide-border">
          <li className="flex items-center gap-3 py-4">
            <span className="grid size-9 place-items-center rounded-full bg-white/6"><Mail className="size-4 text-muted" /></span>
            <div className="flex-1 text-sm">
              <p className="font-medium">Email & password</p>
              <p className="text-xs text-muted">{u.email} · {row.emailVerified ? <span className="text-success">Verified</span> : "Not verified"} · {hasPassword ? "Password set" : "No password yet"}</p>
            </div>
          </li>
          <GoogleMethodRow linkedEmail={google ? google.email ?? "Google account" : null} googleEnabled={isGoogleEnabled()} canUnlink={hasPassword} />
        </ul>
      </section>

      <section className="rounded-2xl bg-card p-6 hairline">
        {hasPassword ? (
          <>
            <h2 className="mb-1 text-xl font-semibold">Change password</h2>
            <p className="mb-6 text-sm text-muted">Changing your password signs you out on all other devices.</p>
            <PasswordForm />
          </>
        ) : (
          <>
            <h2 className="mb-1 text-xl font-semibold">Add a password</h2>
            <p className="mb-6 text-sm text-muted">You signed up with Google. Add a password to also sign in with your email.</p>
            <SetPasswordForm />
          </>
        )}
      </section>

      <section className="rounded-2xl bg-card p-6 hairline">
        <h2 className="mb-1 text-xl font-semibold">Active sessions</h2>
        <p className="text-sm text-muted">Devices currently signed in to your NOVA account.</p>
        <ul className="mt-2 divide-y divide-border">
          {sessions.map((s) => <SessionRow key={s.id} id={s.id} userAgent={s.userAgent} ip={s.ipAddress} lastUsed={s.lastUsedAt.toISOString()} current={s.id === sid} />)}
        </ul>
      </section>
    </div>
  );
}
