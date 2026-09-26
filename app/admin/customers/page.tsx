import type { Metadata } from "next";
import type { Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/auth/guards";
import { PageHeader } from "@/components/admin/sidebar";
import { FilterPills, TableSearch } from "@/components/admin/table-search";
import { RoleSelect } from "@/components/admin/role-select";
import { Pager } from "@/components/admin/pager";
import { formatINR } from "@/lib/format";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; page?: string }> }) {
  const me = await requireAdminPage();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const take = 20;
  const role = sp.role === "ADMIN" || sp.role === "CUSTOMER" ? (sp.role as Role) : undefined;
  const where: Prisma.UserWhereInput = { ...(role && { role }), ...(sp.q && { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q } }] }) };
  const [users, total] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take, select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true, rewardAccount: { select: { balance: true } }, _count: { select: { orders: true, reviews: true } } } }),
    db.user.count({ where }),
  ]);
  const spend = users.length
    ? await db.order.groupBy({ by: ["userId"], where: { userId: { in: users.map((u) => u.id) }, status: { not: "CANCELLED" } }, _sum: { total: true } })
    : [];
  const spendOf = (id: string) => Number(spend.find((s) => s.userId === id)?._sum.total ?? 0);

  return (
    <div>
      <PageHeader title="Customers" description={`${total} accounts`} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <TableSearch placeholder="Name, email or phone" />
        <FilterPills name="role" current={sp.role ?? ""} options={[["", "All"], ["CUSTOMER", "Customers"], ["ADMIN", "Admins"]]} />
      </div>
      <div className="overflow-hidden rounded-2xl bg-card hairline">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted"><tr><th className="px-5 py-3 font-normal">Customer</th><th className="font-normal">Joined</th><th className="text-right font-normal">Orders</th><th className="text-right font-normal">Lifetime spend</th><th className="text-right font-normal">Points</th><th className="pl-6 font-normal">Role</th></tr></thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-muted">No accounts match.</td></tr>}
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3"><span className="block font-medium">{u.name}</span><span className="text-xs text-muted">{u.email}{u.phone && ` · ${u.phone}`}</span></td>
                  <td className="text-muted">{formatDate(u.createdAt)}</td>
                  <td className="text-right tabular">{u._count.orders}</td>
                  <td className="text-right tabular">{formatINR(spendOf(u.id))}</td>
                  <td className="text-right tabular text-muted">{u.rewardAccount?.balance ?? 0}</td>
                  <td className="pl-6"><RoleSelect userId={u.id} role={u.role} self={u.id === me.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} pages={Math.ceil(total / take)} base="/admin/customers" params={{ q: sp.q, role: sp.role }} />
      </div>
    </div>
  );
}
