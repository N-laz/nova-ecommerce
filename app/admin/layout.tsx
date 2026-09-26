import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · NOVA Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const pendingReviews = await db.review.count({ where: { status: "PENDING" } });
  return (
    <div className="lg:flex">
      <AdminSidebar name={admin.email} pendingReviews={pendingReviews} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
