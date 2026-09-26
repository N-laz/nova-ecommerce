import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { ProfileForm } from "@/components/account/forms";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default async function ProfilePage() {
  const u = await requireUserPage("/account/profile");
  const row = await db.user.findUniqueOrThrow({ where: { id: u.id }, select: { name: true, email: true, phone: true, createdAt: true } });
  return (
    <div className="rounded-2xl bg-card p-6 hairline">
      <h2 className="text-xl font-semibold">Profile</h2>
      <p className="mb-6 text-sm text-muted">Member since {formatDate(row.createdAt, { month: "long", year: "numeric" })}</p>
      <ProfileForm name={row.name} email={row.email} phone={row.phone ?? ""} />
    </div>
  );
}
