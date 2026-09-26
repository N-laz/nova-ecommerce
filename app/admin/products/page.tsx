import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Plus, Star, Flame } from "lucide-react";
import type { Prisma, ProductStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/sidebar";
import { FilterPills, TableSearch } from "@/components/admin/table-search";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { Pager } from "@/components/admin/pager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };
export const dynamic = "force-dynamic";

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string; category?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const take = 20;
  const status = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(sp.status ?? "") ? (sp.status as ProductStatus) : undefined;
  const where: Prisma.ProductWhereInput = {
    ...(status && { status }),
    ...(sp.category && { category: { slug: sp.category } }),
    ...(sp.q && { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { sku: { contains: sp.q, mode: "insensitive" } }, { brand: { name: { contains: sp.q, mode: "insensitive" } } }] }),
  };
  const [rows, total, counts] = await Promise.all([
    db.product.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * take, take, include: { brand: { select: { name: true } }, category: { select: { name: true } }, images: { take: 1, orderBy: { position: "asc" } } } }),
    db.product.count({ where }),
    db.product.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const c = (s: string) => counts.find((x) => x.status === s)?._count._all ?? 0;

  return (
    <div>
      <PageHeader title="Products" description={`${total} products`} actions={<Button asChild><Link href="/admin/products/new"><Plus /> New product</Link></Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <TableSearch placeholder="Search name, SKU or brand" />
        <FilterPills name="status" current={sp.status ?? ""} options={[["", "All"], ["PUBLISHED", `Published (${c("PUBLISHED")})`], ["DRAFT", `Draft (${c("DRAFT")})`], ["ARCHIVED", `Archived (${c("ARCHIVED")})`]]} />
      </div>
      <div className="overflow-hidden rounded-2xl bg-card hairline">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted">
              <tr><th className="px-5 py-3 font-normal">Product</th><th className="font-normal">SKU</th><th className="font-normal">Category</th><th className="text-right font-normal">Price</th><th className="text-right font-normal">Stock</th><th className="pl-6 font-normal">Status</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-muted">No products match. <Link href="/admin/products/new" className="text-accent">Create one</Link>.</td></tr>}
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.015]">
                  <td className="px-5 py-3">
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-surface">{p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="40px" className="object-cover" />}</div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-medium">{p.name}{p.featured && <Star className="size-3 fill-[#f5c451] text-[#f5c451]" aria-label="Featured" />}{p.trending && <Flame className="size-3 text-[#ff8a4c]" aria-label="Trending" />}</p>
                        <p className="text-xs text-muted">{p.brand.name}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="font-mono text-xs text-muted">{p.sku}</td>
                  <td className="text-muted">{p.category.name}</td>
                  <td className="text-right tabular">{formatINR(p.price.toString())}{p.compareAtPrice && <span className="block text-xs text-subtle line-through">{formatINR(p.compareAtPrice.toString())}</span>}</td>
                  <td className={cn("text-right tabular", p.stock === 0 ? "text-danger" : p.stock <= p.lowStockThreshold ? "text-warning" : "")}>{p.stock}</td>
                  <td className="pl-6"><Badge variant={p.status === "PUBLISHED" ? "success" : p.status === "DRAFT" ? "warning" : "default"}>{p.status.toLowerCase()}</Badge></td>
                  <td className="pr-3 text-right"><ProductRowActions id={p.id} slug={p.slug} status={p.status} featured={p.featured} trending={p.trending} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} pages={Math.ceil(total / take)} base="/admin/products" params={{ q: sp.q, status: sp.status }} />
      </div>
    </div>
  );
}
