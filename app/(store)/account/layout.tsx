import { requireUserPage } from "@/lib/auth/guards";
import { AccountNav } from "@/components/account/account-nav";
import { VerifyEmailBanner } from "@/components/account/email-security";
import { db } from "@/lib/db";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage("/account");
  const { emailVerified } = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { emailVerified: true } });
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-6">
      <div className="mb-6">
        <p className="text-sm text-muted">Signed in as {user.email}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Hi, {user.name.split(" ")[0]}</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:gap-10">
        <aside className="lg:sticky lg:top-20 lg:self-start"><AccountNav /></aside>
        <div className="min-w-0">
          {!emailVerified && <VerifyEmailBanner email={user.email} />}
          {children}
        </div>
      </div>
    </div>
  );
}
