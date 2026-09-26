import type { Metadata } from "next";
import type { EmailStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { getEmailProvider, emailFrom } from "@/lib/email/providers";
import { isGoogleEnabled } from "@/lib/auth/providers";
import { PageHeader } from "@/components/admin/sidebar";
import { FilterPills, TableSearch } from "@/components/admin/table-search";
import { Pager } from "@/components/admin/pager";
import { EmailPreview, RetryEmail, SendTestEmail } from "@/components/admin/email-log";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Emails" };
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<EmailStatus, string> = {
  SENT: "bg-success/12 text-success",
  QUEUED: "bg-white/8 text-muted",
  FAILED: "bg-danger/12 text-danger",
  SKIPPED: "bg-white/6 text-subtle",
};

const LABEL: Record<string, string> = {
  "order.confirmed": "Order confirmed",
  "order.shipped": "Order shipped",
  "order.out_for_delivery": "Out for delivery",
  "order.delivered": "Order delivered",
  "order.cancelled": "Order cancelled",
  "account.verify_email": "Verify email",
  "account.welcome_google": "Welcome (Google)",
  "security.password_reset": "Password reset",
  "security.password_changed": "Password changed",
  "security.google_linked": "Google linked",
  "alert.back_in_stock": "Back in stock",
  "alert.price_drop": "Price drop",
  "promo.broadcast": "Promotion",
  "admin.test": "Test",
};

export default async function Emails({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const admin = await requireAdminPage();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const take = 25;
  const status = (["SENT", "FAILED", "SKIPPED", "QUEUED"] as const).find((s) => s === sp.status);
  const where: Prisma.EmailLogWhereInput = {
    ...(status && { status }),
    ...(sp.q && { OR: [{ to: { contains: sp.q, mode: "insensitive" } }, { subject: { contains: sp.q, mode: "insensitive" } }] }),
  };
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [logs, total, week] = await Promise.all([
    db.emailLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take, select: { id: true, to: true, subject: true, template: true, status: true, provider: true, attempts: true, error: true, createdAt: true } }),
    db.emailLog.count({ where }),
    db.emailLog.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
  ]);
  const count = (s: EmailStatus) => week.find((w) => w.status === s)?._count._all ?? 0;
  const provider = getEmailProvider().name;

  return (
    <div>
      <PageHeader title="Emails" description="Every transactional email NOVA sends, with delivery status. Reset and verification links are hidden here." actions={<SendTestEmail to={admin.email} />} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-card p-4 hairline">
          <p className="text-xs text-muted">Email provider</p>
          <p className="mt-1 font-medium">{{ console: "Console (dev)", smtp: "SMTP", resend: "Resend" }[provider] ?? provider}</p>
          <p className="truncate text-xs text-subtle">{provider === "console" ? "Development — messages print to the server log" : `From ${emailFrom()}`}</p>
        </div>
        <div className="rounded-2xl bg-card p-4 hairline"><p className="text-xs text-muted">Sent · 7 days</p><p className="mt-1 text-2xl font-semibold tabular">{count("SENT")}</p></div>
        <div className="rounded-2xl bg-card p-4 hairline"><p className="text-xs text-muted">Failed · 7 days</p><p className={cn("mt-1 text-2xl font-semibold tabular", count("FAILED") > 0 && "text-danger")}>{count("FAILED")}</p></div>
        <div className="rounded-2xl bg-card p-4 hairline">
          <p className="text-xs text-muted">Google sign-in</p>
          <p className={cn("mt-1 font-medium", isGoogleEnabled() ? "text-success" : "text-muted")}>{isGoogleEnabled() ? "Enabled" : "Not configured"}</p>
          <p className="text-xs text-subtle">{isGoogleEnabled() ? "Customers can continue with Google" : "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <TableSearch placeholder="Recipient or subject" />
        <FilterPills name="status" current={sp.status ?? ""} options={[["", "All"], ["SENT", "Sent"], ["FAILED", "Failed"], ["SKIPPED", "Skipped"]]} />
      </div>

      <div className="overflow-hidden rounded-2xl bg-card hairline">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted">
              <tr><th className="px-5 py-3 font-normal">Email</th><th className="font-normal">Type</th><th className="font-normal">Status</th><th className="font-normal">When</th><th className="pr-4 text-right font-normal">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-muted">No emails yet. They appear here as customers sign up, order and get updates.</td></tr>}
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="max-w-[360px] px-5 py-3">
                    <span className="block truncate font-medium">{l.subject}</span>
                    <span className="block truncate text-xs text-muted">{l.to}</span>
                    {l.error && l.status !== "SENT" && <span className={cn("mt-0.5 block truncate text-xs", l.status === "FAILED" ? "text-danger/90" : "text-subtle")} title={l.error}>{l.error}</span>}
                  </td>
                  <td className="text-muted">{LABEL[l.template] ?? l.template}</td>
                  <td><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[l.status])}>{l.status.toLowerCase()}</span>{l.attempts > 1 && <span className="ml-1.5 text-xs text-subtle">{l.attempts} tries</span>}</td>
                  <td className="whitespace-nowrap text-muted">{timeAgo(l.createdAt)}</td>
                  <td className="pr-4 text-right">
                    <div className="inline-flex gap-1">
                      {l.status === "FAILED" && <RetryEmail id={l.id} />}
                      <EmailPreview id={l.id} subject={l.subject} to={l.to} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} pages={Math.ceil(total / take)} base="/admin/emails" params={{ q: sp.q, status: sp.status }} />
      </div>
    </div>
  );
}
